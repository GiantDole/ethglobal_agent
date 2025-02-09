import { ethers } from 'ethers';
import redis from '../database/redis';
import supabaseClient from "../database/supabase";
import { SessionData } from '../types/conversation';

interface PrivyLinkedAccount {
  type: string;
  address: string;
  chainType: string;
  walletClientType: string;
  latestVerifiedAt: Date;
}

interface PrivyUserInfo {
  id: string;
  createdAt: Date;
  linkedAccounts: PrivyLinkedAccount[];
  wallet: {
    address: string;
    chainType: string;
    walletClientType: string;
    latestVerifiedAt: Date;
  };
  // additional fields such as smartWallet, google, etc can be defined as needed
}

/**
 * Registers a new session for a user in Redis (and resets an existing session if present).
 * @param userId - The identifier for the user extracted from the token.
 */
export const registerSession = async (userId: string): Promise<void> => {
  const sessionData: SessionData = {
    startedAt: new Date(),
    projects: {},
  };

  const sessionKey = `session:${userId}`;
  // Set session with an expiry of 3600 seconds (60 minutes)
  await redis.set(sessionKey, JSON.stringify(sessionData), "EX", 180 * 60);
};

/**
 * Creates a new user in Supabase with attached accounts.
 * Inserts a record into the "User" table and, based on the inserted id,
 * bulk inserts records into the "Accounts" table.
 *
 * @param userInfo - The user information from Privy.
 */
export const createUserWithAccounts = async (userInfo: PrivyUserInfo): Promise<void> => {
  // Insert the new user into the "User" table.
  // Mapping:
  //  • userInfo.id -> privy_id
  //  • userInfo.createdAt -> registration_date
  //  • Set last_active to now or to createdAt (depending on your requirements)
  const { data: userData, error: userError } = await supabaseClient
    .from("User")
    .insert({
      privy_id: userInfo.id,
      registration_date: userInfo.createdAt.toISOString(),
      last_active: userInfo.createdAt.toISOString()
    })
    .select() // so we can get the generated User id
    .single();

  if (userError || !userData) {
    throw new Error(`Error creating user: ${userError?.message}`);
  }

  // Map each linked account to the schema of the "Accounts" table.
  // Expected mapping:
  //  • type              -> account.type
  //  • address           -> account.address
  //  • chain             -> account.chainType
  //  • walletClient      -> account.walletClientType
  //  • lastVerified      -> account.latestVerifiedAt (converted to ISO string)
  //  • created_at        -> userInfo.createdAt (or use new Date().toISOString())
  //  • userId            -> the inserted user's id (from userData.id)
  const accountsPayload = userInfo.linkedAccounts.map((account) => ({
    userId: userData.id,
    type: account.type,
    address: account.address,
    chain: account.chainType,
    walletClient: account.walletClientType,
    lastVerified: account.latestVerifiedAt
      ? new Date(account.latestVerifiedAt).toISOString()
      : null,
    created_at: userInfo.createdAt.toISOString(),
  }));

  // Insert all linked accounts into the "Accounts" table.
  const { error: accountsError } = await supabaseClient
    .from("Accounts")
    .insert(accountsPayload);

  if (accountsError) {
    throw new Error(`Error inserting accounts: ${accountsError.message}`);
  }
};

/**
 * Checks whether a user with the given privy id exists.
 *
 * @param privyId - The external Privy identifier for the user.
 * @returns A boolean indicating if the user exists.
 */
export const userExistsWithPrivyId = async (privyId: string): Promise<boolean> => {
  const { data, error } = await supabaseClient
    .from("User")
    .select("id")
    .eq("privy_id", privyId)
    .limit(1);

  if (error) {
    throw new Error(`Error checking if user exists: ${error.message}`);
  }

  // If data exists and the array length is greater than 0, then the user exists.
  return data && data.length > 0;
};

/**
 * Retrieves the current nonce for the given user from Supabase and increments it.
 * This function queries the user's record using their privy_id, reads the current nonce,
 * then updates the nonce by incrementing it by one.
 * NOTE: This two-step process is not atomic and may need an atomic solution if concurrency
 * is a concern.
 *
 * @param userId - The user identifier (privy_id) for the user.
 * @returns The nonce value prior to incrementation.
 */
const getAndIncrementUserNonce = async (userId: string): Promise<number> => {
  // Fetch the current nonce from the "User" table using the user's privy_id.
  const { data, error } = await supabaseClient
    .from("User")
    .select("nonce")
    .eq("privy_id", userId)
    .single();

  if (error || !data) {
    throw new Error(`Error fetching nonce for user ${userId}: ${error?.message}`);
  }

  // Capture the current nonce before incrementing.
  const currentNonce = data.nonce;

  // Update the nonce by incrementing it by one.
  const { error: updateError } = await supabaseClient
    .from("User")
    .update({ nonce: currentNonce + 1 })
    .eq("privy_id", userId);

  if (updateError) {
    throw new Error(`Error updating nonce for user ${userId}: ${updateError.message}`);
  }

  return currentNonce;
};

/**
 * Generates a signature by signing the combination of:
 * [evmAddress, nonce, tokenContract, tokenAllocation].
 * Instead of taking tokenAllocation as an input, this function retrieves it from
 * the user's project-specific session stored in Redis.
 *
 * After generating the signature, it sets the signature field in the session.
 *
 * @param userId - The unique identifier for the user.
 * @param projectId - The project identifier used to retrieve the project session.
 * @param evmAddress - The EVM wallet address.
 * @param tokenContract - The token contract address.
 * @returns The generated signature as a hex string.
 */
export const generateSignature = async (
  userId: string,
  projectId: string,
  evmAddress: string,
  tokenContract: string
): Promise<{ signature: string; nonce: number; tokenAllocation: number }> => {
  // Retrieve the user's session from Redis.
  const sessionKey = `session:${userId}`;
  const sessionString = await redis.get(sessionKey);
  if (!sessionString) {
    throw new Error(`User session for ${userId} not found.`);
  }
  const sessionData: SessionData = JSON.parse(sessionString);

  // Retrieve the project-specific session using projectId.
  const projectSession = sessionData.projects[projectId];
  if (!projectSession) {
    throw new Error(`Project session for project ID ${projectId} not found.`);
  }

  // Retrieve tokenAllocation from the project session.
  const tokenAllocation = Math.floor(projectSession.tokenAllocation);

  var nonce;

  if (sessionData.projects[projectId].nonce === -1) {
    // Retrieve the user's current nonce and increment it in Supabase.
    nonce = await getAndIncrementUserNonce(userId);
    sessionData.projects[projectId].nonce = nonce;
  } else {
    nonce = sessionData.projects[projectId].nonce;
  }

  // Create the message hash using Solidity's encoding standards.
  // Note: Solidity does not support float values so we convert tokenAllocation to an integer representation.
  const messageHash = ethers.keccak256(
    ethers.AbiCoder.defaultAbiCoder().encode(
      ["address", "uint256", "address", "uint256"],
      [evmAddress, nonce, tokenContract, tokenAllocation]
    )
  );

  // Ensure the admin key is set.
  const adminKey = process.env.EVM_ADMIN_KEY;
  if (!adminKey) {
    throw new Error("EVM_ADMIN_KEY not set in environment variables.");
  }

  // Create a wallet instance with the admin private key.
  const wallet = new ethers.Wallet(adminKey);
  // Sign the hash. Convert the hex string into a Uint8Array before signing.
  const signature = await wallet.signMessage(ethers.getBytes(messageHash));

  // After signature generation, update the project session with the new signature.
  projectSession.signature = signature;

  // Save the updated session back to Redis, with an expiration of 180*60 seconds.
  await redis.set(sessionKey, JSON.stringify(sessionData), "EX", 180 * 60);

  return {
    signature: signature,
    nonce: nonce,
    tokenAllocation: tokenAllocation
  };
};
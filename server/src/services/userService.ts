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
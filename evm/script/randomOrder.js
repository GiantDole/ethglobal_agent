/**
 * This script continuously performs random buy or sell orders at random intervals on
 * multiple token bonding contracts concurrently.
 *
 * For each contract instance:
 * - It waits for a random delay between 10s and 60s.
 * - It randomly picks either a buy or sell order.
 *
 * For a BUY order:
 *   - It uses a random fraction (between 4% and 20%) of the trader's available ETH.
 *   - It converts the ETH value to USD using the contract's getLatestEthPrice and then computes
 *     the maximum number of tokens that can be purchased following the bonding curve pricing:
 *
 *         costUsd = n * basePriceUsd + slopeUsd * (n * tokensSold + (n*(n-1))/2)
 *
 *   - It retrieves the current nonce for the trader then signs the purchase message with the agent's key.
 *   - Finally, it calls buy() with the computed parameters and ETH deposit.
 *
 * For a SELL order:
 *   - It uses a random fraction (between 4% and 20%) of the trader's token balance (converted to whole tokens)
 *     and calls the sell() function.
 *
 * Usage:
 *   npx hardhat run evm/script/randomOrder.js --network <your-network>
 *
 * Environment Variables:
 *   - ARBITRUM_SEPOLIA_RPC_URL
 *   - BUYER_PRIVATE_KEY
 *   - PRIVATE_KEY         // For signing the message (agent)
 *   - TOKEN_BONDING_ADDRESSES   // Comma separated list of token bonding contract addresses (at least three)
 */

const { ethers } = require("ethers");
require("dotenv").config();

const rpcUrl = process.env.ARBITRUM_SEPOLIA_RPC_URL;
const provider = new ethers.JsonRpcProvider(rpcUrl);

// Load buyer wallet from private key
const privateKey = process.env.BUYER_PRIVATE_KEY;
const wallet = new ethers.Wallet(privateKey, provider);

// Load agent wallet for signing
const agentKey = process.env.PRIVATE_KEY;
if (!agentKey) {
  console.error("Please set PRIVATE_KEY in your .env file");
  process.exit(1);
}
const agentWallet = new ethers.Wallet(agentKey, provider);

// --- Configuration loaded from .env ---
// Expect TOKEN_BONDING_ADDRESSES as a comma-separated list.
const tokenBondingAddressesEnv = process.env.TOKEN_BONDING_ADDRESSES;
if (!tokenBondingAddressesEnv) {
  console.error("Please set TOKEN_BONDING_ADDRESSES in your .env file");
  process.exit(1);
}
const tokenBondingAddresses = tokenBondingAddressesEnv.split(",").map(addr => addr.trim());
if (tokenBondingAddresses.length < 3) {
  console.error("Please provide at least three token bonding addresses in TOKEN_BONDING_ADDRESSES");
  process.exit(1);
}

// --- Runtime constants ---
const MIN_INTERVAL = 10 * 1000;
const MAX_INTERVAL = 60 * 1000;
const MIN_PERCENTAGE = 0.04;
const MAX_PERCENTAGE = 0.20;
const MAX_RETRIES = 3;
const RETRY_DELAY = 5000; // 5 seconds
const GAS_PRICE_BUFFER = 1.1; // 10% buffer on gas price

// Return a random number between min and max (inclusive)
function getRandomInt(min, max) {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

// Return a random fraction between MIN_PERCENTAGE and MAX_PERCENTAGE
function getRandomFraction() {
  return MIN_PERCENTAGE + Math.random() * (MAX_PERCENTAGE - MIN_PERCENTAGE);
}

/**
 * Helper function to retry failed operations
 */
async function withRetry(operation, context) {
  for (let attempt = 1; attempt <= MAX_RETRIES; attempt++) {
    try {
      return await operation();
    } catch (error) {
      console.error(`[Contract ${context}] Attempt ${attempt}/${MAX_RETRIES} failed:`, error.message);
      if (attempt === MAX_RETRIES) throw error;
      await new Promise(resolve => setTimeout(resolve, RETRY_DELAY));
    }
  }
}

/**
 * Starts an infinite loop of randomly executing buy or sell orders on a specific token bonding contract
 * @param {Contract} tokenBonding - The contract instance.
 * @param {Wallet} wallet - The trader wallet.
 */
async function startRandomOrderLoop(tokenBonding, wallet) {
  console.log(`[Contract ${tokenBonding.target}] Starting random order execution.`);
  
  // Validate contract before starting
  try {
    await tokenBonding.basePriceUsd();
    await tokenBonding.slopeUsd();
  } catch (error) {
    console.error(`[Contract ${tokenBonding.target}] Failed to validate contract, skipping:`, error.message);
    return;
  }
  
  while (true) {
    try {
      // Always perform a BUY order first
      console.log(`[Contract ${tokenBonding.target}] Performing initial BUY order...`);
      await withRetry(() => performBuyOrder(tokenBonding, wallet), tokenBonding.target);
      
      while (true) {
        const delay = getRandomInt(MIN_INTERVAL, MAX_INTERVAL);
        console.log(`[Contract ${tokenBonding.target}] Waiting for ${(delay / 1000).toFixed(2)} seconds before next order...`);
        await new Promise((resolve) => setTimeout(resolve, delay));
      
        const doBuy = Math.random() < 0.7;
        if (doBuy) {
          await withRetry(() => performBuyOrder(tokenBonding, wallet), tokenBonding.target);
        } else {
          await withRetry(() => performSellOrder(tokenBonding, wallet), tokenBonding.target);
        }
      }
    } catch (error) {
      console.error(`[Contract ${tokenBonding.target}] Loop error, restarting in 30s:`, error.message);
      await new Promise(resolve => setTimeout(resolve, 30000));
    }
  }
}

/**
 * Performs a buy order.
 *
 * 1. Uses a random fraction (4–20%) of the trader's ETH balance.
 * 2. Converts that deposit to USD using getLatestEthPrice().
 * 3. Iterates to calculate the maximum number of whole tokens that can be purchased given the deposit:
 *      costUsd = n * basePriceUsd + slopeUsd * (n * tokensSold + (n*(n-1))/2)
 * 4. Retrieves and increments the trader's nonce.
 * 5. Signs the message with the agent's key.
 * 6. Calls the buy() function with the calculated parameters.
 *
 * @param {Contract} tokenBonding - The token bonding contract instance.
 * @param {Wallet} wallet - The trader wallet.
 */
async function performBuyOrder(tokenBonding, wallet) {
  // Get trader's current ETH balance
  const ethBalance = await provider.getBalance(wallet.address);
  console.log(`[Contract ${tokenBonding.target}] Trader ETH balance: ${ethers.formatEther(ethBalance)} ETH`);

  if (ethBalance === 0n) {
    console.log(`[Contract ${tokenBonding.target}] No ETH available. Skipping buy order.`);
    return;
  }

  // Use a random fraction of the trader's ETH balance.
  const fraction = getRandomFraction();
  const ethBalanceFloat = parseFloat(ethers.formatEther(ethBalance));
  const depositEthFloat = ethBalanceFloat * fraction;
  const depositEth = ethers.parseEther(depositEthFloat.toFixed(18));
  console.log(`[Contract ${tokenBonding.target}] Using ${ethers.formatEther(depositEth)} ETH for buy order (fraction=${(fraction * 100).toFixed(2)}%).`);

  // Convert deposit ETH into USD using the contract's price method.
  const latestEthPrice = await tokenBonding.getLatestEthPrice();
  const depositUsd = depositEth * latestEthPrice / ethers.WeiPerEther;
  console.log(`[Contract ${tokenBonding.target}] Deposit USD value (8 decimals): ${depositUsd.toString()}`);

  // Read bonding parameters.
  const basePriceUsd = await tokenBonding.basePriceUsd(); // in 8 decimals
  const slopeUsd = await tokenBonding.slopeUsd();         // in 8 decimals
  const tokensSold = await tokenBonding.tokensSold();

  // Calculate the maximum number of whole tokens that can be purchased.
  let n = 0;
  let cost;
  while (true) {
    n++;
    // Convert all values to BigInt for calculations
    const nBig = BigInt(n);
    const term1 = basePriceUsd * nBig;
    const term2 = slopeUsd * nBig * tokensSold;
    const term3 = slopeUsd * nBig * (nBig - 1n) / 2n;
    cost = term1 + term2 + term3;
    if (cost > depositUsd) {
      n--; // last valid value
      break;
    }
    if (n > 10000) break; // safeguard against runaway loops
  }

  if (n <= 0) {
    console.log(`[Contract ${tokenBonding.target}] Deposit is insufficient to buy even one token. Skipping order.`);
    return;
  }

  const numTokens = n;
  // Here we set tokenAllocation equal to numTokens for simplicity.
  const tokenAllocation = numTokens;

  // Get and increment the nonce.
  const currentNonce = await tokenBonding.nonces(wallet.address);
  const newNonce = currentNonce + 1n;

  // Prepare the message for signing - EXACTLY as the contract does it
  const encodedMessage = ethers.AbiCoder.defaultAbiCoder().encode(
    ["address", "uint256", "address", "uint256"],
    [wallet.address, newNonce, tokenBonding.target, tokenAllocation]
  );
  const messageHash = ethers.keccak256(encodedMessage);
  
  // Sign the message hash using the agent wallet
  const signature = await agentWallet.signMessage(ethers.getBytes(messageHash));
  
  console.log(`[Contract ${tokenBonding.target}] Submitting buy order: ${numTokens} tokens, nonce=${newNonce.toString()}`);
  
  try {
    const gasPrice = await provider.getFeeData();
    const tx = await tokenBonding.buy(
      numTokens,
      tokenAllocation,
      newNonce,
      signature,
      { 
        value: depositEth,
        maxFeePerGas: BigInt(Math.floor(Number(gasPrice.maxFeePerGas) * GAS_PRICE_BUFFER)),
        maxPriorityFeePerGas: gasPrice.maxPriorityFeePerGas
      }
    );
    console.log(`[Contract ${tokenBonding.target}] Buy transaction sent: ${tx.hash}`);
    await tx.wait();
    console.log(`[Contract ${tokenBonding.target}] Buy order executed successfully.`);
  } catch (error) {
    console.error(`[Contract ${tokenBonding.target}] Buy transaction failed:`, error);
    throw error; // Rethrow for retry mechanism
  }
}

/**
 * Performs a sell order.
 *
 * - Checks the trader's token balance (converted to whole tokens based on decimals).
 * - Uses a random fraction (4–20%) of that balance to determine tokens to sell.
 * - Calls the sell() function.
 *
 * @param {Contract} tokenBonding - The token bonding contract instance.
 * @param {Wallet} wallet - The trader wallet.
 */
async function performSellOrder(tokenBonding, wallet) {
  // Get the trader's token balance (in smallest units).
  const tokenBalance = await tokenBonding.balanceOf(wallet.address);
  const decimals = await tokenBonding.decimals();
  const tokenBalanceWhole = tokenBalance / (10n ** BigInt(decimals));

  if (tokenBalanceWhole === 0n) {
    console.log(`[Contract ${tokenBonding.target}] No tokens available for sale. Skipping sell order.`);
    return;
  }

  const tokenBalanceNum = Number(tokenBalanceWhole);
  const fraction = getRandomFraction();
  let tokensToSell = Math.floor(tokenBalanceNum * fraction);
  if (tokensToSell < 1) tokensToSell = 1;

  console.log(`[Contract ${tokenBonding.target}] Submitting sell order: selling ${tokensToSell} tokens (out of ${tokenBalanceNum}).`);

  try {
    const gasPrice = await provider.getFeeData();
    const tx = await tokenBonding.sell(
      tokensToSell,
      {
        maxFeePerGas: BigInt(Math.floor(Number(gasPrice.maxFeePerGas) * GAS_PRICE_BUFFER)),
        maxPriorityFeePerGas: gasPrice.maxPriorityFeePerGas
      }
    );
    console.log(`[Contract ${tokenBonding.target}] Sell transaction sent: ${tx.hash}`);
    await tx.wait();
    console.log(`[Contract ${tokenBonding.target}] Sell order executed successfully.`);
  } catch (error) {
    console.error(`[Contract ${tokenBonding.target}] Sell transaction failed:`, error);
    throw error; // Rethrow for retry mechanism
  }
}

async function main() {
  console.log("Wallet Address:", wallet.address);

  // Load the ABI for the Token Bonding Curve contract.
  const tokenBondingABI = require("../out/TokenBondingCurve.sol/TokenBondingCurve.json").abi;
  
  // Handle interrupt signals gracefully.
  process.on("SIGINT", () => {
    console.log("Exiting random orders script.");
    process.exit(0);
  });

  // For each provided token bonding address, create a contract instance using the managed wallet.
  const orderLoops = tokenBondingAddresses.map(address => {
    const tokenBonding = new ethers.Contract(address, tokenBondingABI, wallet);
    return startRandomOrderLoop(tokenBonding, wallet);
  });

  // Run all loops in parallel. (They are infinite loops.)
  await Promise.all(orderLoops);
}

main().catch((error) => {
  console.error("Script encountered an error:", error);
  process.exit(1);
});
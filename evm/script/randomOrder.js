/**
 * This script continuously performs random buy or sell orders at random intervals.
 *
 * For each iteration:
 * - It waits for a random delay between 10s and 60s.
 * - It randomly picks either a buy or sell order.
 *
 * For a BUY order:
 *   - It uses a random fraction (between 4% and 20%) of the trader's available ETH.
 *   - It converts the ETH value to USD using the contract's getLatestEthPrice and then computes
 *     the maximum number of tokens that can be bought following the bonding curve pricing:
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
 */

const { ethers } = require("ethers");
require("dotenv").config();

const rpcUrl = process.env.ARBITRUM_SEPOLIA_RPC_URL;
const provider = new ethers.JsonRpcProvider(rpcUrl);

// Load wallet from private key
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
const TOKEN_BONDING_ADDRESS = process.env.TOKEN_BONDING_ADDRESS;
if (!TOKEN_BONDING_ADDRESS) {
  console.error("Please set TOKEN_BONDING_ADDRESS in your .env file");
  process.exit(1);
}

// --- Runtime constants ---
const MIN_INTERVAL = 10 * 1000;
const MAX_INTERVAL = 60 * 1000;
const MIN_PERCENTAGE = 0.04;
const MAX_PERCENTAGE = 0.20;

// Return a random number between min and max (inclusive)
function getRandomInt(min, max) {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

// Return a random fraction between MIN_PERCENTAGE and MAX_PERCENTAGE
function getRandomFraction() {
  return MIN_PERCENTAGE + Math.random() * (MAX_PERCENTAGE - MIN_PERCENTAGE);
}

async function main() {
  console.log("Wallet Address:", wallet.address);

  // Create contract instance using ethers and forge-generated ABI
  const tokenBondingABI = require("../out/TokenBondingCurve.sol/TokenBondingCurve.json").abi;
  const tokenBonding = new ethers.Contract(TOKEN_BONDING_ADDRESS, tokenBondingABI, wallet);

  // Handle interrupt signals gracefully.
  process.on("SIGINT", () => {
    console.log("Exiting random orders script.");
    process.exit(0);
  });

  // Always perform a buy order first
  console.log("Performing initial BUY order...");
  await performBuyOrder(tokenBonding, wallet);

  while (true) {
    // Wait a random delay between MIN_INTERVAL and MAX_INTERVAL seconds.
    const delay = getRandomInt(MIN_INTERVAL, MAX_INTERVAL);
    console.log(`Waiting for ${(delay / 1000).toFixed(2)} seconds before next order...`);
    await new Promise((resolve) => setTimeout(resolve, delay));

    // Randomly decide whether to perform a buy or sell order (50–50 chance).
    const doBuy = Math.random() < 0.5;
    if (doBuy) {
      console.log("Performing a BUY order...");
      await performBuyOrder(tokenBonding, wallet);
    } else {
      console.log("Performing a SELL order...");
      await performSellOrder(tokenBonding, wallet);
    }
  }
}

/**
 * Performs a buy order.
 *
 * 1. Uses a random fraction (4–20%) of the trader's ETH balance.
 * 2. Converts that deposit to USD using getLatestEthPrice().
 * 3. Iterates to calculate the maximum number of whole tokens purchasable given the deposit:
 *      costUsd = n * basePriceUsd + slopeUsd * (n * tokensSold + (n*(n-1))/2)
 * 4. Retrieves and increments the trader's nonce.
 * 5. Signs the message with the agent's key.
 * 6. Calls the buy() function with the calculated parameters.
 */
async function performBuyOrder(tokenBonding, wallet) {
  // Get trader's current ETH balance
  const ethBalance = await provider.getBalance(wallet.address);
  console.log(`Trader ETH balance: ${ethers.formatEther(ethBalance)} ETH`);

  if (ethBalance === 0n) {
    console.log("No ETH available. Skipping buy order.");
    return;
  }

  // Use a random fraction of the trader's ETH balance.
  const fraction = getRandomFraction();
  const ethBalanceFloat = parseFloat(ethers.formatEther(ethBalance));
  const depositEthFloat = ethBalanceFloat * fraction;
  const depositEth = ethers.parseEther(depositEthFloat.toFixed(18));
  console.log(`Using ${ethers.formatEther(depositEth)} ETH for buy order (fraction=${(fraction * 100).toFixed(2)}%).`);

  // Convert deposit ETH into USD using the contract's price method.
  const latestEthPrice = await tokenBonding.getLatestEthPrice();
  const depositUsd = depositEth * latestEthPrice / ethers.WeiPerEther;
  console.log(`Deposit USD value (8 decimals): ${depositUsd.toString()}`);

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
    console.log("Deposit is insufficient to buy even one token. Skipping order.");
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
  
  console.log(`Submitting buy order: ${numTokens} tokens, nonce=${newNonce.toString()}`);
  
  try {
    const tx = await tokenBonding.buy(
      numTokens,
      tokenAllocation,
      newNonce,
      signature,
      { value: depositEth }
    );
    console.log("Buy transaction sent:", tx.hash);
    await tx.wait();
    console.log("Buy order executed successfully.");
  } catch (error) {
    console.error("Buy transaction failed:", error);
  }
}

/**
 * Performs a sell order.
 *
 * - Checks the trader's token balance (converted to whole tokens based on decimals).
 * - Uses a random fraction (4–20%) of that balance to determine tokens to sell.
 * - Calls the sell() function.
 */
async function performSellOrder(tokenBonding, wallet) {
  // Get the trader's token balance (in smallest units).
  const tokenBalance = await tokenBonding.balanceOf(wallet.address);
  const decimals = await tokenBonding.decimals();
  const tokenBalanceWhole = tokenBalance / (10n ** BigInt(decimals));

  if (tokenBalanceWhole === 0n) {
    console.log("No tokens available for sale. Skipping sell order.");
    return;
  }

  const tokenBalanceNum = Number(tokenBalanceWhole);
  const fraction = getRandomFraction();
  let tokensToSell = Math.floor(tokenBalanceNum * fraction);
  if (tokensToSell < 1) tokensToSell = 1;

  console.log(`Submitting sell order: selling ${tokensToSell} tokens (out of ${tokenBalanceNum}).`);

  try {
    const tx = await tokenBonding.sell(tokensToSell);
    console.log("Sell transaction sent:", tx.hash);
    await tx.wait();
    console.log("Sell order executed successfully.");
  } catch (error) {
    console.error("Sell transaction failed:", error);
  }
}

main().catch((error) => {
  console.error("Script encountered an error:", error);
  process.exit(1);
});
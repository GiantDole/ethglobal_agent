const { ethers } = require("ethers");
require("dotenv").config();

async function sellAllTokens() {
  // Setup provider and wallet
  const rpcUrl = process.env.ARBITRUM_SEPOLIA_RPC_URL;
  const provider = new ethers.JsonRpcProvider(rpcUrl);
  const privateKey = process.env.BUYER_PRIVATE_KEY;
  const wallet = new ethers.Wallet(privateKey, provider);

  // Load contract
  const TOKEN_BONDING_ADDRESS = process.env.TOKEN_BONDING_ADDRESS;
  if (!TOKEN_BONDING_ADDRESS) {
    console.error("Please set TOKEN_BONDING_ADDRESS in your .env file");
    process.exit(1);
  }

  const tokenBondingABI = require("../out/TokenBondingCurve.sol/TokenBondingCurve.json").abi;
  const tokenBonding = new ethers.Contract(TOKEN_BONDING_ADDRESS, tokenBondingABI, wallet);

  try {
    // Get token balance and decimals
    const tokenBalance = await tokenBonding.balanceOf(wallet.address);
    const decimals = await tokenBonding.decimals();
    const tokenBalanceWhole = tokenBalance / (10n ** BigInt(decimals));

    if (tokenBalanceWhole === 0n) {
      console.log("No tokens available to sell.");
      return;
    }

    console.log(`Selling all tokens: ${tokenBalanceWhole} tokens`);

    // Perform the sell transaction
    const tx = await tokenBonding.sell(tokenBalanceWhole);
    console.log("Sell transaction sent:", tx.hash);
    await tx.wait();
    console.log("Successfully sold all tokens!");

    // Show final balance
    const finalBalance = await tokenBonding.balanceOf(wallet.address);
    console.log(`Final token balance: ${finalBalance}`);

  } catch (error) {
    console.error("Error selling tokens:", error);
    throw error;
  }
}

sellAllTokens()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
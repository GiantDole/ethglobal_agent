const { ethers } = require("ethers");
require("dotenv").config();

// ABI fragments we need
const abi = [
  "function tokensSold() view returns (uint256)",
  "function basePriceUsd() view returns (uint256)",
  "function slopeUsd() view returns (uint256)",
  "function targetMarketCapUsd() view returns (uint256)",
  "function priceFeed() view returns (address)",
];

// Chainlink Price Feed ABI
const priceFeedAbi = [
  "function latestRoundData() view returns (uint80 roundId, int256 answer, uint256 startedAt, uint256 updatedAt, uint80 answeredInRound)",
];

async function calculateRemainingToMaturity(bondingCurveAddress) {
  const rpcUrl = process.env.ARBITRUM_SEPOLIA_RPC_URL;
  if (!rpcUrl) {
    throw new Error("Please set ARBITRUM_SEPOLIA_RPC_URL in your .env file");
  }
  
  const provider = new ethers.JsonRpcProvider(rpcUrl);
  const contract = new ethers.Contract(bondingCurveAddress, abi, provider);
  
  try {
    // Fetch all required values from the contract
    const [
      tokensSold,
      basePriceUsd,
      slopeUsd,
      targetMarketCapUsd,
      priceFeedAddress
    ] = await Promise.all([
      contract.tokensSold(),
      contract.basePriceUsd(),
      contract.slopeUsd(),
      contract.targetMarketCapUsd(),
      contract.priceFeed()
    ]);

    // Get ETH price from Chainlink
    const priceFeed = new ethers.Contract(priceFeedAddress, priceFeedAbi, provider);
    const { answer: ethPrice } = await priceFeed.latestRoundData();

    // Calculate current market cap
    const currentPriceUsd = basePriceUsd + (slopeUsd * tokensSold);
    const currentMarketCapUsd = tokensSold * currentPriceUsd;

    // If already reached target
    if (currentMarketCapUsd >= targetMarketCapUsd) {
      console.log("Target market cap already reached!");
      return { remainingUsd: 0n, remainingEth: 0n };
    }

    // Calculate remaining USD (8 decimals)
    const remainingUsd = targetMarketCapUsd - currentMarketCapUsd;

    // Convert to ETH (18 decimals)
    // remainingUsd * 1e18 / ethPrice
    const remainingEth = (remainingUsd * BigInt(1e18)) / BigInt(ethPrice);

    // Format for human readable output
    const formatUsd = (value) => Number(value) / 1e8;
    const formatEth = (value) => Number(value) / 1e18;

    console.log(`
    Current Market Cap: $${formatUsd(currentMarketCapUsd)}
    Target Market Cap: $${formatUsd(targetMarketCapUsd)}
    
    Remaining to reach maturity:
    USD: $${formatUsd(remainingUsd)}
    ETH: ${formatEth(remainingEth)} ETH
    `);

    return { remainingUsd, remainingEth };

  } catch (error) {
    console.error("Error calculating remaining to maturity:", error);
    throw error;
  }
}

// Use the same environment variable for contract address
const TOKEN_BONDING_ADDRESS = process.env.TOKEN_BONDING_ADDRESS;
if (!TOKEN_BONDING_ADDRESS) {
  console.error("Please set TOKEN_BONDING_ADDRESS in your .env file");
  process.exit(1);
}

calculateRemainingToMaturity(TOKEN_BONDING_ADDRESS)
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
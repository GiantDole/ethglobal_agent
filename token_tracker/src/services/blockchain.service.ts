import { ethers } from 'ethers';
import config from '../config/config';
import logger from '../config/logger';

const TOKEN_ABI = [
  'function getCurrentPrice() view returns (uint256)',
  'function getLatestEthPrice() view returns (uint256)',
  'function tokensSold() view returns (uint256)',
  'function liquidityDeployed() view returns (bool)'
];

class BlockchainService {
  private provider: ethers.Provider;

  constructor() {
    this.provider = new ethers.JsonRpcProvider(config.rpcUrl);
  }

  async getTokenPrice(tokenAddress: string): Promise<number> {
    try {
      const contract = new ethers.Contract(tokenAddress, TOKEN_ABI, this.provider);
      
      // Get price in USD (with 8 decimals)
      const priceUsd = await contract.getCurrentPrice();
      
      // Convert from 8 decimals to regular number
      return parseFloat(ethers.formatUnits(priceUsd, 8));
    } catch (error) {
      logger.error(`Error fetching price for token ${tokenAddress}:`, error);
      return 0;
    }
  }

  async getTokenStatus(tokenAddress: string): Promise<{
    price: number;
    tokensSold: number;
    isLiquidityDeployed: boolean;
  }> {
    try {
      const contract = new ethers.Contract(tokenAddress, TOKEN_ABI, this.provider);
      
      const [priceUsd, tokensSold, liquidityDeployed] = await Promise.all([
        contract.getCurrentPrice(),
        contract.tokensSold(),
        contract.liquidityDeployed()
      ]);

      return {
        price: Number(priceUsd) / 1e8,
        tokensSold: Number(tokensSold),
        isLiquidityDeployed: liquidityDeployed
      };
    } catch (error) {
      logger.error(`Error fetching status for token ${tokenAddress}:`, error);
      return {
        price: 0,
        tokensSold: 0,
        isLiquidityDeployed: false
      };
    }
  }
}

export default new BlockchainService();
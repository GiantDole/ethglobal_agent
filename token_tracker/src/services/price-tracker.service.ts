import { Token } from '../types/index';
import databaseService from './database.service';
import blockchainService from './blockchain.service';
import logger from '../config/logger';
import config from '../config/config';

class PriceTracker {
  private activeTokens: Map<number, Token> = new Map();
  private trackers: Map<number, NodeJS.Timer> = new Map();

  async start(): Promise<void> {
    await this.updateActiveTokens();
    // Check for token changes every minute
    setInterval(() => this.updateActiveTokens(), 60000);
  }

  private async updateActiveTokens(): Promise<void> {
    try {
      const tokens = await databaseService.getActiveTokens();
      const currentTokenIds = new Set(this.activeTokens.keys());
      const newTokenIds = new Set(tokens.map(t => t.id));

      // Stop tracking removed tokens
      for (const tokenId of currentTokenIds) {
        if (!newTokenIds.has(tokenId)) {
          this.stopTracking(tokenId);
        }
      }

      // Start tracking new tokens
      for (const token of tokens) {
        if (!currentTokenIds.has(token.id)) {
          this.startTracking(token);
        }
      }

      this.activeTokens = new Map(tokens.map(token => [token.id, token]));
    } catch (error) {
      logger.error('Error updating active tokens:', error);
    }
  }

  private startTracking(token: Token): void {
    logger.info(`Starting price tracking for token ${token.symbol} (${token.address})`);
    
    const interval = setInterval(async () => {
      try {
        const price = await blockchainService.getTokenPrice(token.address, token.address);
        
        await databaseService.insertPriceData({
          token_id: token.id,
          price,
          timestamp: Date.now()
        });
      } catch (error) {
        logger.error(`Error tracking price for token ${token.symbol}:`, error);
      }
    }, config.pollingInterval);

    this.trackers.set(token.id, interval);
  }

  private stopTracking(tokenId: number): void {
    const interval = this.trackers.get(tokenId);
    if (interval) {
      clearInterval(interval as NodeJS.Timeout);
      this.trackers.delete(tokenId);
      const token = this.activeTokens.get(tokenId);
      logger.info(`Stopped tracking token ${token?.symbol || tokenId}`);
    }
  }
}

export default new PriceTracker();
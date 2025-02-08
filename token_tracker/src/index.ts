import priceTracker from './services/price-tracker.service';
import logger from './config/logger';

async function main() {
  try {
    await priceTracker.start();
    logger.info('Price tracker started successfully');
  } catch (error) {
    logger.error('Failed to start price tracker:', error);
    process.exit(1);
  }
}

main();
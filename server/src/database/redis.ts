// db/redis.js
import Redis from 'ioredis';
import logger from '../config/logger';
import dotenv from 'dotenv';

dotenv.config();

const redis = new Redis({
  host: process.env.REDIS_HOST,
  port: process.env.REDIS_PORT ? parseInt(process.env.REDIS_PORT, 10) : undefined,
  password: process.env.REDIS_PASSWORD || undefined, // Only set if a password is provided
});

// Handle Redis connection events
redis.on('connect', () => {
  logger.info('Connected to Redis');
});

redis.on('error', (err: Error) => {
  logger.error('Redis error:', err);
});

// Optional: Handle graceful shutdown
process.on('SIGINT', async () => {
  try {
    await redis.quit();
  } catch (err) {
    logger.error('Error during Redis shutdown:', err);
  } finally {
    process.exit(0);
  }
});

export default redis;

/**
 * Redis Configuration
 * Used for caching and session management
 */

import { createClient } from 'redis';
import logger from '../utils/logger';

const redisUrl = process.env.REDIS_URL;
let redisClient: ReturnType<typeof createClient> | null = null;

// Only create Redis client if REDIS_URL is provided
if (redisUrl) {
  redisClient = createClient({
    url: redisUrl,
    password: process.env.REDIS_PASSWORD || undefined,
  });

  redisClient.on('error', (err) => {
    logger.error('Redis Client Error:', err);
  });

  redisClient.on('connect', () => {
    logger.info('Redis client connected');
  });

  redisClient.on('ready', () => {
    logger.info('Redis client ready');
  });
}

export const connectRedis = async () => {
  if (redisClient && !redisClient.isOpen) {
    await redisClient.connect();
  } else if (!redisUrl) {
    logger.info('Redis URL not provided, skipping Redis connection');
  }
};

export const disconnectRedis = async () => {
  if (redisClient && redisClient.isOpen) {
    await redisClient.quit();
  }
};

export default redisClient;

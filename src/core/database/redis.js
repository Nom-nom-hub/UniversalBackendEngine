const { createClient } = require('redis');
const logger = require('../utils/logger');

/**
 * Connect to Redis database
 */
async function connectRedis(config) {
  try {
    logger.info('Connecting to Redis database...');
    
    // If mock is enabled, return a mock client
    if (config.mock) {
      logger.info('Using mock Redis client');
      const store = new Map();
      
      return {
        set: async (key, value, options) => {
          store.set(key, typeof value === 'object' ? JSON.stringify(value) : value);
          return 'OK';
        },
        get: async (key) => {
          const value = store.get(key);
          if (value && value.startsWith('{') && value.endsWith('}')) {
            try {
              return JSON.parse(value);
            } catch (e) {
              return value;
            }
          }
          return value;
        },
        del: async (key) => {
          store.delete(key);
          return 1;
        },
        quit: async () => {
          logger.info('Mock Redis connection closed');
          return 'OK';
        }
      };
    }
    
    const client = createClient({
      url: config.url,
      ...config.options
    });
    
    // Handle Redis errors
    client.on('error', (err) => {
      logger.error('Redis client error:', err);
    });
    
    await client.connect();
    
    logger.info('Redis database connection established');
    
    return client;
  } catch (error) {
    logger.error('Failed to connect to Redis database:', error);
    throw error;
  }
}

module.exports = {
  connect: connectRedis
}; 
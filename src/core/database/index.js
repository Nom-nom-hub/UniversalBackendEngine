const logger = require('../utils/logger');
const postgres = require('./postgres');
const mongodb = require('./mongodb');
const redis = require('./redis');
const mock = require('./mock');

/**
 * Connect to configured databases
 */
async function connectDatabases(config) {
  const connections = {};
  
  try {
    // Connect to PostgreSQL if enabled
    if (config.postgres && config.postgres.enabled) {
      if (config.postgres.mock) {
        connections.postgres = await mock.connect(config.postgres);
        logger.info('Connected to mock PostgreSQL database');
      } else {
        connections.postgres = await postgres.connect(config.postgres);
        logger.info('Connected to PostgreSQL database');
      }
    }
    
    // Connect to MongoDB if enabled
    if (config.mongodb && config.mongodb.enabled) {
      if (config.mongodb.mock) {
        connections.mongodb = await mock.connect(config.mongodb);
        logger.info('Connected to mock MongoDB database');
      } else {
        connections.mongodb = await mongodb.connect(config.mongodb);
        logger.info('Connected to MongoDB database');
      }
    }
    
    // Connect to Redis if enabled
    if (config.redis && config.redis.enabled) {
      if (config.redis.mock) {
        connections.redis = await mock.connect(config.redis);
        logger.info('Connected to mock Redis database');
      } else {
        connections.redis = await redis.connect(config.redis);
        logger.info('Connected to Redis database');
      }
    }
    
    return connections;
  } catch (error) {
    logger.error('Failed to connect to databases:', error);
    throw error;
  }
}

/**
 * Get the appropriate database client based on the model type or configuration
 */
function getDatabaseClient(modelType, connections) {
  // Default to the default database if no specific type is provided
  if (!modelType) {
    const defaultDb = process.env.DEFAULT_DB || 'postgres';
    return connections[defaultDb];
  }
  
  // Return the appropriate client based on the model type
  switch (modelType.toLowerCase()) {
    case 'postgres':
    case 'postgresql':
    case 'sql':
      return connections.postgres;
    case 'mysql':
      return connections.mysql;
    case 'mongodb':
    case 'mongo':
    case 'nosql':
      return connections.mongodb;
    case 'redis':
    case 'cache':
      return connections.redis;
    default:
      throw new Error(`Unknown database type: ${modelType}`);
  }
}

module.exports = {
  connectDatabases,
  getDatabaseClient
}; 
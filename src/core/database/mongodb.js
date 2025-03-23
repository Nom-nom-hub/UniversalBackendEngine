const { MongoClient } = require('mongodb');
const logger = require('../utils/logger');

/**
 * Connect to MongoDB database
 */
async function connectMongoDB(config) {
  try {
    logger.info('Connecting to MongoDB database...');
    
    // If mock is enabled, return a mock client
    if (config.mock) {
      logger.info('Using mock MongoDB client');
      const collections = new Map();
      
      return {
        db: () => ({
          collection: (name) => {
            if (!collections.has(name)) {
              collections.set(name, []);
            }
            return {
              find: (query = {}) => ({
                toArray: async () => collections.get(name) || []
              }),
              findOne: async (query = {}) => (collections.get(name) || [])[0],
              insertOne: async (doc) => {
                const coll = collections.get(name) || [];
                coll.push(doc);
                collections.set(name, coll);
                return { insertedId: doc._id || 'mock-id' };
              },
              updateOne: async (query, update) => {
                return { modifiedCount: 1 };
              },
              deleteOne: async (query) => {
                return { deletedCount: 1 };
              }
            };
          }
        }),
        collection: (name) => {
          if (!collections.has(name)) {
            collections.set(name, []);
          }
          return {
            find: (query = {}) => ({
              toArray: async () => collections.get(name) || []
            }),
            findOne: async (query = {}) => (collections.get(name) || [])[0],
            insertOne: async (doc) => {
              const coll = collections.get(name) || [];
              coll.push(doc);
              collections.set(name, coll);
              return { insertedId: doc._id || 'mock-id' };
            },
            updateOne: async (query, update) => {
              return { modifiedCount: 1 };
            },
            deleteOne: async (query) => {
              return { deletedCount: 1 };
            }
          };
        },
        close: async () => {
          logger.info('Mock MongoDB connection closed');
        }
      };
    }
    
    const client = new MongoClient(config.url, config.options || {});
    await client.connect();
    
    logger.info('MongoDB database connection established');
    
    return {
      db: () => client.db(config.dbName),
      collection: (name) => client.db(config.dbName).collection(name),
      close: async () => {
        await client.close();
        logger.info('MongoDB connection has been closed');
      }
    };
  } catch (error) {
    logger.error('Failed to connect to MongoDB database:', error);
    throw error;
  }
}

module.exports = {
  connect: connectMongoDB
}; 
const { Pool } = require('pg');
const logger = require('../utils/logger');

/**
 * Connect to PostgreSQL database
 */
async function connectPostgres(config) {
  try {
    logger.info('Connecting to PostgreSQL database...');
    
    // If mock is enabled, return a mock client
    if (config.mock) {
      logger.info('Using mock PostgreSQL client');
      return {
        query: async (text, params) => {
          logger.debug(`Mock query: ${text}`);
          return { rows: [], rowCount: 0 };
        },
        close: async () => {
          logger.info('Mock PostgreSQL connection closed');
        }
      };
    }
    
    const pool = new Pool({
      connectionString: config.url,
      ssl: config.options?.ssl ? {
        rejectUnauthorized: false
      } : false
    });
    
    // Test the connection
    const client = await pool.connect();
    client.release();
    
    logger.info('PostgreSQL database connection established');
    
    // Return a client with a query method that uses the pool
    return {
      query: async (text, params) => {
        const start = Date.now();
        const res = await pool.query(text, params);
        const duration = Date.now() - start;
        logger.debug(`Executed query: ${text} - ${duration}ms`);
        return res;
      },
      close: async () => {
        await pool.end();
        logger.info('PostgreSQL connection pool has been closed');
      }
    };
  } catch (error) {
    logger.error('Failed to connect to PostgreSQL database:', error);
    throw error;
  }
}

module.exports = {
  connect: connectPostgres
}; 
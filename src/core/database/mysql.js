const mysql = require('mysql2/promise');
const logger = require('../utils/logger');

/**
 * Setup MySQL connection
 */
async function setupMySQL(config) {
  try {
    // Create connection pool
    const pool = mysql.createPool({
      host: config.host,
      port: config.port,
      user: config.username,
      password: config.password,
      database: config.database,
      waitForConnections: true,
      connectionLimit: 10,
      queueLimit: 0
    });
    
    // Test connection
    const connection = await pool.getConnection();
    connection.release();
    
    return pool;
  } catch (error) {
    logger.error('Failed to connect to MySQL:', error);
    throw error;
  }
}

module.exports = {
  setupMySQL
}; 
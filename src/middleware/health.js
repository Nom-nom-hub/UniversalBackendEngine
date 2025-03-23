const express = require('express');
const { _getDatabaseClient } = require('../core/database');

/**
 * Health check middleware
 * Provides endpoints for checking the health of the application
 */
function setupHealthChecks(app, connections) {
  const router = express.Router();
  
  // Simple health check endpoint
  router.get('/', (req, res) => {
    res.status(200).json({
      status: 'ok',
      timestamp: new Date().toISOString()
    });
  });
  
  // Detailed health check endpoint
  router.get('/detailed', async (req, res) => {
    try {
      // Check database connections
      const dbStatus = {};
      
      // Check PostgreSQL if enabled
      if (connections.postgres) {
        try {
          await connections.postgres.$queryRaw`SELECT 1`;
          dbStatus.postgres = 'connected';
        } catch (error) {
          dbStatus.postgres = 'disconnected';
        }
      }
      
      // Check MongoDB if enabled
      if (connections.mongodb) {
        try {
          const state = connections.mongodb.connection.readyState;
          dbStatus.mongodb = state === 1 ? 'connected' : 'disconnected';
        } catch (error) {
          dbStatus.mongodb = 'disconnected';
        }
      }
      
      // Check MySQL if enabled
      if (connections.mysql) {
        try {
          await connections.mysql.query('SELECT 1');
          dbStatus.mysql = 'connected';
        } catch (error) {
          dbStatus.mysql = 'disconnected';
        }
      }
      
      // Check Redis if enabled
      if (connections.redis) {
        try {
          const ping = await connections.redis.ping();
          dbStatus.redis = ping === 'PONG' ? 'connected' : 'disconnected';
        } catch (error) {
          dbStatus.redis = 'disconnected';
        }
      }
      
      // Return health status
      res.status(200).json({
        status: 'ok',
        timestamp: new Date().toISOString(),
        version: process.env.npm_package_version || '1.0.0',
        databases: dbStatus,
        memory: {
          rss: Math.round(process.memoryUsage().rss / 1024 / 1024) + 'MB',
          heapTotal: Math.round(process.memoryUsage().heapTotal / 1024 / 1024) + 'MB',
          heapUsed: Math.round(process.memoryUsage().heapUsed / 1024 / 1024) + 'MB'
        },
        uptime: Math.round(process.uptime()) + 's'
      });
    } catch (error) {
      res.status(500).json({
        status: 'error',
        error: error.message
      });
    }
  });
  
  // Mount the health check routes
  app.use('/health', router);
}

module.exports = {
  setupHealthChecks
}; 

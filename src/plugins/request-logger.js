/**
 * Request Logger Plugin
 * Logs all incoming requests and their responses
 */
const logger = require('../core/utils/logger');

module.exports = {
  name: 'request-logger',
  
  hooks: {
    beforeRequest: (req, _res) => {
      // Set start time
      req._startTime = Date.now();
      
      // Log request
      logger.info(`[${new Date().toISOString()}] ${req.method} ${req.url}`);
    },
    
    afterResponse: (req, res) => {
      // Calculate request duration
      const duration = Date.now() - (req._startTime || Date.now());
      
      // Log response
      logger.info(`[${new Date().toISOString()}] ${req.method} ${req.url} - ${res.statusCode} (${duration}ms)`);
    },
    
    onError: (err, req, _res) => {
      // Log error
      logger.error(`[${new Date().toISOString()}] ERROR ${req.method} ${req.url} - ${err.message}`);
    }
  }
}; 

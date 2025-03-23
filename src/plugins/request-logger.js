/**
 * Request Logger Plugin
 * Logs all incoming requests and their responses
 */
module.exports = {
  name: 'request-logger',
  
  hooks: {
    beforeRequest: (req, res) => {
      // Set start time
      req._startTime = Date.now();
      
      // Log request
      console.log(`[${new Date().toISOString()}] ${req.method} ${req.url}`);
    },
    
    afterResponse: (req, res) => {
      // Calculate request duration
      const duration = Date.now() - (req._startTime || Date.now());
      
      // Log response
      console.log(`[${new Date().toISOString()}] ${req.method} ${req.url} - ${res.statusCode} (${duration}ms)`);
    },
    
    onError: (err, req, res) => {
      // Log error
      console.error(`[${new Date().toISOString()}] ERROR ${req.method} ${req.url} - ${err.message}`);
    }
  }
}; 
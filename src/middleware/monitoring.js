const promClient = require('prom-client');
const express = require('express');

/**
 * Setup monitoring middleware
 */
function setupMonitoring(app) {
  // Create a Registry to register metrics
  const register = new promClient.Registry();
  
  // Add default metrics
  promClient.collectDefaultMetrics({ register });
  
  // Create custom metrics
  const httpRequestDurationMicroseconds = new promClient.Histogram({
    name: 'http_request_duration_ms',
    help: 'Duration of HTTP requests in ms',
    labelNames: ['method', 'route', 'status_code'],
    buckets: [1, 5, 15, 50, 100, 200, 500, 1000, 2000, 5000]
  });
  
  const httpRequestCounter = new promClient.Counter({
    name: 'http_requests_total',
    help: 'Total number of HTTP requests',
    labelNames: ['method', 'route', 'status_code']
  });
  
  // Register custom metrics
  register.registerMetric(httpRequestDurationMicroseconds);
  register.registerMetric(httpRequestCounter);
  
  // Create middleware to track request duration and count
  app.use((req, res, next) => {
    const start = Date.now();
    
    // Record end time and increment counter on response finish
    res.on('finish', () => {
      const duration = Date.now() - start;
      const route = req.route ? req.route.path : req.path;
      const method = req.method;
      const statusCode = res.statusCode;
      
      // Update metrics
      httpRequestDurationMicroseconds
        .labels(method, route, statusCode)
        .observe(duration);
      
      httpRequestCounter
        .labels(method, route, statusCode)
        .inc();
    });
    
    next();
  });
  
  // Create metrics endpoint
  const metricsRouter = express.Router();
  
  metricsRouter.get('/', async (req, res) => {
    res.set('Content-Type', register.contentType);
    res.end(await register.metrics());
  });
  
  // Mount metrics endpoint
  app.use('/metrics', metricsRouter);
}

module.exports = {
  setupMonitoring
}; 
const rateLimit = require('express-rate-limit');
const RedisStore = require('rate-limit-redis');
const logger = require('../core/utils/logger');

/**
 * Setup rate limiting middleware
 */
function setupRateLimiting(app, config, redisClient) {
  if (!config.enabled) {
    logger.info('Rate limiting is disabled');
    return;
  }
  
  // Configure rate limiter
  const limiterOptions = {
    windowMs: config.windowMs || 15 * 60 * 1000, // 15 minutes by default
    max: config.max || 100, // limit each IP to 100 requests per windowMs by default
    standardHeaders: true, // Return rate limit info in the `RateLimit-*` headers
    legacyHeaders: false, // Disable the `X-RateLimit-*` headers
    message: {
      status: 'error',
      message: 'Too many requests, please try again later.'
    }
  };
  
  // Use Redis store if Redis is available
  if (redisClient) {
    limiterOptions.store = new RedisStore({
      sendCommand: (...args) => redisClient.sendCommand(args)
    });
    logger.info('Using Redis store for rate limiting');
  }
  
  // Create and apply the rate limiter
  const limiter = rateLimit(limiterOptions);
  app.use(limiter);
  
  logger.info(`Rate limiting configured: ${config.max} requests per ${config.windowMs / 1000} seconds`);
}

module.exports = {
  setupRateLimiting
}; 
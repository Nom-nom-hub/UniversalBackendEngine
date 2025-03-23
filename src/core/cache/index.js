const logger = require('../utils/logger');

/**
 * Cache manager for Universal Backend Engine
 */
class CacheManager {
  constructor(redisClient, config = {}) {
    this.redis = redisClient;
    this.enabled = config.enabled !== false;
    this.ttl = config.ttl || 3600; // Default TTL: 1 hour
    this.prefix = config.prefix || 'ube:';
    this.logger = logger;
  }
  
  /**
   * Generate cache key
   */
  generateKey(namespace, id = '') {
    return `${this.prefix}${namespace}:${id}`;
  }
  
  /**
   * Get item from cache
   */
  async get(namespace, id = '') {
    if (!this.enabled || !this.redis) {
      return null;
    }
    
    try {
      const key = this.generateKey(namespace, id);
      const data = await this.redis.get(key);
      
      if (!data) {
        return null;
      }
      
      return JSON.parse(data);
    } catch (error) {
      this.logger.error(`Cache get error (${namespace}:${id}):`, error);
      return null;
    }
  }
  
  /**
   * Set item in cache
   */
  async set(namespace, id = '', data, ttl = this.ttl) {
    if (!this.enabled || !this.redis) {
      return false;
    }
    
    try {
      const key = this.generateKey(namespace, id);
      await this.redis.set(key, JSON.stringify(data), 'EX', ttl);
      return true;
    } catch (error) {
      this.logger.error(`Cache set error (${namespace}:${id}):`, error);
      return false;
    }
  }
  
  /**
   * Delete item from cache
   */
  async delete(namespace, id = '') {
    if (!this.enabled || !this.redis) {
      return false;
    }
    
    try {
      const key = this.generateKey(namespace, id);
      await this.redis.del(key);
      return true;
    } catch (error) {
      this.logger.error(`Cache delete error (${namespace}:${id}):`, error);
      return false;
    }
  }
  
  /**
   * Clear namespace from cache
   */
  async clearNamespace(namespace) {
    if (!this.enabled || !this.redis) {
      return false;
    }
    
    try {
      const pattern = this.generateKey(namespace, '*');
      const keys = await this.redis.keys(pattern);
      
      if (keys.length > 0) {
        await this.redis.del(keys);
      }
      
      return true;
    } catch (error) {
      this.logger.error(`Cache clear namespace error (${namespace}):`, error);
      return false;
    }
  }
  
  /**
   * Get or set cache item (with automatic fetching)
   */
  async getOrSet(namespace, id = '', fetchFn, ttl = this.ttl) {
    // Try to get from cache first
    const cachedData = await this.get(namespace, id);
    
    if (cachedData !== null) {
      return cachedData;
    }
    
    // If not in cache, fetch data
    try {
      const data = await fetchFn();
      
      // Store in cache
      await this.set(namespace, id, data, ttl);
      
      return data;
    } catch (error) {
      this.logger.error(`Cache getOrSet error (${namespace}:${id}):`, error);
      throw error;
    }
  }
  
  /**
   * Create a middleware for caching REST API responses
   */
  createMiddleware(namespace, ttl = this.ttl) {
    return async (req, res, next) => {
      if (!this.enabled || !this.redis) {
        return next();
      }
      
      // Only cache GET requests
      if (req.method !== 'GET') {
        return next();
      }
      
      // Generate cache key from URL
      const id = req.originalUrl;
      
      try {
        // Try to get from cache
        const cachedData = await this.get(namespace, id);
        
        if (cachedData !== null) {
          return res.json(cachedData);
        }
        
        // Store original res.json method
        const originalJson = res.json;
        
        // Override res.json method to cache the response
        res.json = (data) => {
          // Restore original method
          res.json = originalJson;
          
          // Cache the response
          this.set(namespace, id, data, ttl);
          
          // Call original method
          return res.json(data);
        };
        
        next();
      } catch (error) {
        this.logger.error(`Cache middleware error (${namespace}:${id}):`, error);
        next();
      }
    };
  }
}

module.exports = CacheManager; 
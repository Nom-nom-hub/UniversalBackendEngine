const logger = require('../../utils/logger');

/**
 * Redis Message Queue
 */
class RedisQueue {
  constructor(redisClient, config = {}) {
    this.redis = redisClient;
    this.config = config;
    this.subscribers = new Map();
    this.pubSubClient = null;
  }
  
  /**
   * Initialize queue
   */
  async initialize() {
    try {
      // Create a duplicate connection for pub/sub
      // This is necessary because once a Redis client enters pub/sub mode,
      // it can only execute pub/sub commands
      this.pubSubClient = this.redis.duplicate();
      
      // Handle messages
      this.pubSubClient.on('message', (channel, message) => {
        try {
          const handler = this.subscribers.get(channel);
          if (handler) {
            const parsedMessage = JSON.parse(message);
            handler(parsedMessage);
          }
        } catch (error) {
          logger.error(`Error handling Redis message on channel ${channel}:`, error);
        }
      });
      
      logger.info('Redis message queue initialized');
      return true;
    } catch (error) {
      logger.error('Failed to initialize Redis message queue:', error);
      throw error;
    }
  }
  
  /**
   * Publish a message
   */
  async publish(topic, message) {
    try {
      await this.redis.publish(topic, JSON.stringify(message));
      return true;
    } catch (error) {
      logger.error(`Failed to publish message to topic ${topic}:`, error);
      throw error;
    }
  }
  
  /**
   * Subscribe to a topic
   */
  async subscribe(topic, handler) {
    try {
      // Store handler
      this.subscribers.set(topic, handler);
      
      // Subscribe to channel
      await this.pubSubClient.subscribe(topic);
      
      logger.debug(`Subscribed to Redis topic: ${topic}`);
      return true;
    } catch (error) {
      logger.error(`Failed to subscribe to topic ${topic}:`, error);
      throw error;
    }
  }
  
  /**
   * Unsubscribe from a topic
   */
  async unsubscribe(topic) {
    try {
      // Unsubscribe from channel
      await this.pubSubClient.unsubscribe(topic);
      
      // Remove handler
      this.subscribers.delete(topic);
      
      logger.debug(`Unsubscribed from Redis topic: ${topic}`);
      return true;
    } catch (error) {
      logger.error(`Failed to unsubscribe from topic ${topic}:`, error);
      throw error;
    }
  }
}

module.exports = {
  RedisQueue
}; 
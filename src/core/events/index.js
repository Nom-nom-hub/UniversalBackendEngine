const EventEmitter = require('events');
const logger = require('../utils/logger');

/**
 * Event Manager for event-driven architecture
 */
class EventManager extends EventEmitter {
  constructor(config = {}, connections = {}) {
    super();
    this.config = config;
    this.connections = connections;
    this.eventStore = null;
    this.messageQueue = null;
    
    // Set max listeners to avoid memory leak warnings
    this.setMaxListeners(0);
  }
  
  /**
   * Initialize event manager
   */
  async initialize() {
    try {
      // Initialize event store if enabled
      if (this.config.eventStore && this.config.eventStore.enabled) {
        await this.initializeEventStore();
      }
      
      // Initialize message queue if enabled
      if (this.config.messageQueue && this.config.messageQueue.enabled) {
        await this.initializeMessageQueue();
      }
      
      logger.info('Event manager initialized');
      return true;
    } catch (error) {
      logger.error('Failed to initialize event manager:', error);
      throw error;
    }
  }
  
  /**
   * Initialize event store
   */
  async initializeEventStore() {
    try {
      const { type } = this.config.eventStore;
      
      switch (type) {
        case 'postgres':
          const { PostgresEventStore } = require('./stores/postgres');
          this.eventStore = new PostgresEventStore(this.connections.postgres);
          break;
        case 'mongodb':
          const { MongoEventStore } = require('./stores/mongodb');
          this.eventStore = new MongoEventStore(this.connections.mongodb);
          break;
        case 'redis':
          const { RedisEventStore } = require('./stores/redis');
          this.eventStore = new RedisEventStore(this.connections.redis);
          break;
        default:
          const { MemoryEventStore } = require('./stores/memory');
          this.eventStore = new MemoryEventStore();
      }
      
      await this.eventStore.initialize();
      logger.info(`Event store initialized: ${type}`);
    } catch (error) {
      logger.error('Failed to initialize event store:', error);
      throw error;
    }
  }
  
  /**
   * Initialize message queue
   */
  async initializeMessageQueue() {
    try {
      const { type } = this.config.messageQueue;
      
      switch (type) {
        case 'kafka':
          const { KafkaQueue } = require('./queues/kafka');
          this.messageQueue = new KafkaQueue(this.config.messageQueue);
          break;
        case 'rabbitmq':
          const { RabbitMQQueue } = require('./queues/rabbitmq');
          this.messageQueue = new RabbitMQQueue(this.config.messageQueue);
          break;
        case 'redis':
          const { RedisQueue } = require('./queues/redis');
          this.messageQueue = new RedisQueue(this.connections.redis, this.config.messageQueue);
          break;
        case 'sqs':
          const { SQSQueue } = require('./queues/sqs');
          this.messageQueue = new SQSQueue(this.config.messageQueue);
          break;
        default:
          const { MemoryQueue } = require('./queues/memory');
          this.messageQueue = new MemoryQueue();
      }
      
      // Initialize queue
      await this.messageQueue.initialize();
      
      // Setup message handlers
      await this.setupMessageHandlers();
      
      logger.info(`Message queue initialized: ${type}`);
    } catch (error) {
      logger.error('Failed to initialize message queue:', error);
      throw error;
    }
  }
  
  /**
   * Setup message handlers
   */
  async setupMessageHandlers() {
    if (!this.messageQueue) return;
    
    // Subscribe to topics/queues
    const topics = this.config.messageQueue.topics || [];
    
    for (const topic of topics) {
      await this.messageQueue.subscribe(topic, async (message) => {
        try {
          // Emit event for local handlers
          this.emit(topic, message);
          
          // Store event if event store is enabled
          if (this.eventStore) {
            await this.eventStore.storeEvent({
              type: topic,
              data: message,
              metadata: {
                source: 'message-queue',
                timestamp: new Date()
              }
            });
          }
          
          logger.debug(`Processed message from topic: ${topic}`);
        } catch (error) {
          logger.error(`Error processing message from topic ${topic}:`, error);
        }
      });
      
      logger.info(`Subscribed to topic: ${topic}`);
    }
  }
  
  /**
   * Publish an event
   */
  async publishEvent(eventType, eventData, options = {}) {
    try {
      // Create event object
      const event = {
        type: eventType,
        data: eventData,
        metadata: {
          timestamp: new Date(),
          ...options.metadata
        }
      };
      
      // Store event if event store is enabled
      if (this.eventStore) {
        await this.eventStore.storeEvent(event);
      }
      
      // Publish to message queue if enabled
      if (this.messageQueue && (!options.local || options.queue)) {
        await this.messageQueue.publish(eventType, eventData);
      }
      
      // Emit event locally
      if (!options.queue || options.local) {
        this.emit(eventType, eventData);
      }
      
      logger.debug(`Published event: ${eventType}`);
      return true;
    } catch (error) {
      logger.error(`Failed to publish event ${eventType}:`, error);
      throw error;
    }
  }
  
  /**
   * Subscribe to an event
   */
  subscribeToEvent(eventType, handler) {
    this.on(eventType, handler);
    logger.debug(`Subscribed to event: ${eventType}`);
    return () => this.unsubscribeFromEvent(eventType, handler);
  }
  
  /**
   * Unsubscribe from an event
   */
  unsubscribeFromEvent(eventType, handler) {
    this.off(eventType, handler);
    logger.debug(`Unsubscribed from event: ${eventType}`);
  }
  
  /**
   * Get events from event store
   */
  async getEvents(options = {}) {
    if (!this.eventStore) {
      throw new Error('Event store not initialized');
    }
    
    return this.eventStore.getEvents(options);
  }
  
  /**
   * Replay events
   */
  async replayEvents(eventTypes, handler, options = {}) {
    if (!this.eventStore) {
      throw new Error('Event store not initialized');
    }
    
    const events = await this.eventStore.getEvents({
      types: Array.isArray(eventTypes) ? eventTypes : [eventTypes],
      ...options
    });
    
    for (const event of events) {
      await handler(event.data, event);
    }
    
    return events.length;
  }
}

// Create singleton instance
const eventManager = new EventManager();

module.exports = eventManager; 
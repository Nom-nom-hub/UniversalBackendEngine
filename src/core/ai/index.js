const logger = require('../utils/logger');

/**
 * AI Service Manager
 */
class AIServiceManager {
  constructor(config = {}) {
    this.config = config;
    this.services = new Map();
  }
  
  /**
   * Initialize AI services
   */
  async initialize() {
    try {
      // Initialize configured services
      if (this.config.services) {
        for (const [serviceName, serviceConfig] of Object.entries(this.config.services)) {
          if (serviceConfig.enabled) {
            await this.initializeService(serviceName, serviceConfig);
          }
        }
      }
      
      logger.info(`AI Service Manager initialized with ${this.services.size} services`);
      return true;
    } catch (error) {
      logger.error('Failed to initialize AI Service Manager:', error);
      throw error;
    }
  }
  
  /**
   * Initialize a specific AI service
   */
  async initializeService(serviceName, serviceConfig) {
    try {
      let service;
      
      switch (serviceName) {
        case 'openai':
          const { OpenAIService } = require('./services/openai');
          service = new OpenAIService(serviceConfig);
          break;
        case 'huggingface':
          const { HuggingFaceService } = require('./services/huggingface');
          service = new HuggingFaceService(serviceConfig);
          break;
        case 'vertexai':
          const { VertexAIService } = require('./services/vertexai');
          service = new VertexAIService(serviceConfig);
          break;
        case 'custom':
          const { CustomModelService } = require('./services/custom');
          service = new CustomModelService(serviceConfig);
          break;
        default:
          throw new Error(`Unknown AI service: ${serviceName}`);
      }
      
      // Initialize service
      await service.initialize();
      
      // Store service
      this.services.set(serviceName, service);
      
      logger.info(`Initialized AI service: ${serviceName}`);
      return service;
    } catch (error) {
      logger.error(`Failed to initialize AI service ${serviceName}:`, error);
      throw error;
    }
  }
  
  /**
   * Get an AI service
   */
  getService(serviceName) {
    const service = this.services.get(serviceName);
    if (!service) {
      throw new Error(`AI service not found: ${serviceName}`);
    }
    return service;
  }
  
  /**
   * Generate text using the specified service
   */
  async generateText(serviceName, prompt, options = {}) {
    try {
      const service = this.getService(serviceName);
      return await service.generateText(prompt, options);
    } catch (error) {
      logger.error(`Failed to generate text with service ${serviceName}:`, error);
      throw error;
    }
  }
  
  /**
   * Generate embeddings using the specified service
   */
  async generateEmbeddings(serviceName, texts, options = {}) {
    try {
      const service = this.getService(serviceName);
      return await service.generateEmbeddings(texts, options);
    } catch (error) {
      logger.error(`Failed to generate embeddings with service ${serviceName}:`, error);
      throw error;
    }
  }
  
  /**
   * Classify text using the specified service
   */
  async classifyText(serviceName, text, options = {}) {
    try {
      const service = this.getService(serviceName);
      return await service.classifyText(text, options);
    } catch (error) {
      logger.error(`Failed to classify text with service ${serviceName}:`, error);
      throw error;
    }
  }
  
  /**
   * Process image using the specified service
   */
  async processImage(serviceName, image, options = {}) {
    try {
      const service = this.getService(serviceName);
      return await service.processImage(image, options);
    } catch (error) {
      logger.error(`Failed to process image with service ${serviceName}:`, error);
      throw error;
    }
  }
}

// Create singleton instance
const aiServiceManager = new AIServiceManager();

module.exports = aiServiceManager; 
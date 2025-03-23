const logger = require('../utils/logger');

/**
 * Serverless Adapter
 */
class ServerlessAdapter {
  constructor(app, config = {}) {
    this.app = app;
    this.config = config;
    this.handler = null;
  }
  
  /**
   * Initialize serverless adapter
   */
  async initialize() {
    try {
      // Create handler based on provider
      switch (this.config.provider) {
        case 'aws':
          this.handler = this.createAWSHandler();
          break;
        case 'azure':
          this.handler = this.createAzureHandler();
          break;
        case 'gcp':
          this.handler = this.createGCPHandler();
          break;
        default:
          throw new Error(`Unsupported serverless provider: ${this.config.provider}`);
      }
      
      logger.info(`Serverless adapter initialized for ${this.config.provider}`);
      return this.handler;
    } catch (error) {
      logger.error('Failed to initialize serverless adapter:', error);
      throw error;
    }
  }
  
  /**
   * Create AWS Lambda handler
   */
  createAWSHandler() {
    // Use serverless-http package for AWS Lambda
    const serverless = require('serverless-http');
    
    // Create handler with options
    const handler = serverless(this.app, {
      binary: this.config.binaryMimeTypes || [
        'application/octet-stream',
        'application/x-protobuf',
        'image/*',
        'audio/*',
        'video/*',
        'application/pdf',
        'application/zip'
      ]
    });
    
    // Return async handler function
    return async (event, context) => {
      // Optimize for cold starts
      context.callbackWaitsForEmptyEventLoop = false;
      
      // Handle event
      return await handler(event, context);
    };
  }
  
  /**
   * Create Azure Functions handler
   */
  createAzureHandler() {
    return async (context, req) => {
      // Create mock Express request and response
      const mockReq = {
        ...req,
        headers: req.headers || {},
        body: req.body,
        query: req.query || {},
        params: req.params || {},
        path: req.originalUrl || req.url,
        method: req.method
      };
      
      let statusCode = 200;
      let responseBody = null;
      let responseHeaders = {};
      
      const mockRes = {
        status: (code) => {
          statusCode = code;
          return mockRes;
        },
        send: (body) => {
          responseBody = body;
        },
        json: (body) => {
          responseBody = body;
          responseHeaders['Content-Type'] = 'application/json';
        },
        setHeader: (name, value) => {
          responseHeaders[name] = value;
        },
        end: () => {}
      };
      
      // Process request through Express app
      await new Promise((resolve) => {
        this.app(mockReq, mockRes, resolve);
      });
      
      // Return Azure Functions response
      context.res = {
        status: statusCode,
        body: responseBody,
        headers: responseHeaders
      };
    };
  }
  
  /**
   * Create Google Cloud Functions handler
   */
  createGCPHandler() {
    return (req, res) => {
      // Process request through Express app
      this.app(req, res);
    };
  }
}

module.exports = ServerlessAdapter; 
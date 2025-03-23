const grpc = require('@grpc/grpc-js');
const protoLoader = require('@grpc/proto-loader');
const fs = require('fs');
const path = require('path');
const logger = require('../utils/logger');

/**
 * Setup gRPC server
 */
function setupGRPC(config) {
  if (!config.enabled) {
    logger.info('gRPC is disabled');
    return null;
  }
  
  try {
    // Create gRPC server
    const server = new grpc.Server();
    
    // Load proto files
    const protoDir = path.join(__dirname, '../../protos');
    if (!fs.existsSync(protoDir)) {
      fs.mkdirSync(protoDir, { recursive: true });
    }
    
    // Load model-specific proto files
    const modelsDir = path.join(__dirname, '../../models');
    if (fs.existsSync(modelsDir)) {
      fs.readdirSync(modelsDir).forEach(file => {
        if (file.endsWith('.js')) {
          const model = require(path.join(modelsDir, file));
          if (model.grpc && model.grpc.protoFile) {
            registerGRPCService(server, model, protoDir);
          }
        }
      });
    }
    
    // Start gRPC server
    const port = config.port || 50051;
    server.bindAsync(`0.0.0.0:${port}`, grpc.ServerCredentials.createInsecure(), (err, port) => {
      if (err) {
        logger.error('Failed to start gRPC server:', err);
        return;
      }
      
      server.start();
      logger.info(`gRPC server running on port ${port}`);
    });
    
    return server;
  } catch (error) {
    logger.error('Failed to setup gRPC server:', error);
    throw error;
  }
}

/**
 * Register a gRPC service for a model
 */
function registerGRPCService(server, model, protoDir) {
  try {
    const { name, grpc: grpcConfig } = model;
    const protoFile = path.join(protoDir, grpcConfig.protoFile);
    
    // Check if proto file exists
    if (!fs.existsSync(protoFile)) {
      logger.error(`Proto file not found for model ${name}: ${protoFile}`);
      return;
    }
    
    // Load proto file
    const packageDefinition = protoLoader.loadSync(protoFile, {
      keepCase: true,
      longs: String,
      enums: String,
      defaults: true,
      oneofs: true
    });
    
    const protoDescriptor = grpc.loadPackageDefinition(packageDefinition);
    const serviceName = `${name}Service`;
    const serviceDefinition = protoDescriptor[serviceName];
    
    if (!serviceDefinition) {
      logger.error(`Service definition not found for ${serviceName}`);
      return;
    }
    
    // Register service implementation
    server.addService(serviceDefinition.service, grpcConfig.implementation);
    logger.info(`Registered gRPC service: ${serviceName}`);
  } catch (error) {
    logger.error(`Failed to register gRPC service for model ${model.name}:`, error);
  }
}

module.exports = {
  setupGRPC
}; 
const logger = require('../utils/logger');
const fs = require('fs');
const path = require('path');

/**
 * Setup WebSocket handlers
 */
function setupWebSockets(io, config) {
  // Authentication middleware for Socket.IO
  io.use((socket, next) => {
    const token = socket.handshake.auth.token;
    if (!token) {
      return next(new Error('Authentication error'));
    }
    
    // Verify token (simplified for now)
    try {
      // In a real implementation, you would verify the JWT
      socket.user = { id: 'user-id' }; // Placeholder
      next();
    } catch (error) {
      next(new Error('Authentication error'));
    }
  });
  
  // Handle connection
  io.on('connection', (socket) => {
    logger.info(`WebSocket client connected: ${socket.id}`);
    
    // Register disconnect handler
    socket.on('disconnect', () => {
      logger.info(`WebSocket client disconnected: ${socket.id}`);
    });
    
    // Register error handler
    socket.on('error', (error) => {
      logger.error(`WebSocket error for client ${socket.id}:`, error);
    });
    
    // Dynamically register event handlers from models
    registerModelEventHandlers(socket);
  });
  
  logger.info('WebSocket server initialized');
  return io;
}

/**
 * Register WebSocket event handlers from models
 */
function registerModelEventHandlers(socket) {
  const modelsDir = path.join(__dirname, '../../models');
  if (fs.existsSync(modelsDir)) {
    fs.readdirSync(modelsDir).forEach(file => {
      if (file.endsWith('.js')) {
        const model = require(path.join(modelsDir, file));
        if (model.websocket && model.websocket.events) {
          // Register event handlers for this model
          Object.entries(model.websocket.events).forEach(([event, handler]) => {
            socket.on(`${model.name}:${event}`, async (data, callback) => {
              try {
                const result = await handler(data, socket);
                if (callback && typeof callback === 'function') {
                  callback({ success: true, data: result });
                }
              } catch (error) {
                logger.error(`Error handling WebSocket event ${model.name}:${event}:`, error);
                if (callback && typeof callback === 'function') {
                  callback({ success: false, error: error.message });
                }
              }
            });
          });
          
          logger.debug(`Registered WebSocket events for model: ${model.name}`);
        }
      }
    });
  }
}

module.exports = {
  setupWebSockets
}; 
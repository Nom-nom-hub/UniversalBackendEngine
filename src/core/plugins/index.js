const fs = require('fs');
const path = require('path');
const logger = require('../utils/logger');

/**
 * Plugin manager for Universal Backend Engine
 */
class PluginManager {
  constructor() {
    this.plugins = new Map();
    this.hooks = {
      beforeServerStart: [],
      afterServerStart: [],
      beforeRouteSetup: [],
      afterRouteSetup: [],
      beforeRequest: [],
      afterRequest: [],
      beforeResponse: [],
      afterResponse: [],
      onError: []
    };
  }
  
  /**
   * Register a plugin
   */
  register(plugin) {
    if (!plugin.name) {
      throw new Error('Plugin must have a name');
    }
    
    if (this.plugins.has(plugin.name)) {
      logger.warn(`Plugin "${plugin.name}" is already registered. Skipping.`);
      return false;
    }
    
    // Register plugin
    this.plugins.set(plugin.name, plugin);
    logger.info(`Registered plugin: ${plugin.name}`);
    
    // Register hooks
    if (plugin.hooks) {
      Object.entries(plugin.hooks).forEach(([hookName, hookFn]) => {
        if (this.hooks[hookName]) {
          this.hooks[hookName].push(hookFn);
          logger.debug(`Registered hook "${hookName}" for plugin "${plugin.name}"`);
        } else {
          logger.warn(`Unknown hook "${hookName}" for plugin "${plugin.name}"`);
        }
      });
    }
    
    return true;
  }
  
  /**
   * Load plugins from directory
   */
  loadPlugins(pluginsDir) {
    try {
      if (!fs.existsSync(pluginsDir)) {
        logger.info(`Plugins directory not found: ${pluginsDir}`);
        return;
      }
      
      const pluginFiles = fs.readdirSync(pluginsDir)
        .filter(file => file.endsWith('.js'));
      
      for (const file of pluginFiles) {
        try {
          const plugin = require(path.join(pluginsDir, file));
          this.register(plugin);
        } catch (error) {
          logger.error(`Failed to load plugin from file ${file}:`, error);
        }
      }
      
      logger.info(`Loaded ${this.plugins.size} plugins`);
    } catch (error) {
      logger.error('Failed to load plugins:', error);
    }
  }
  
  /**
   * Execute hooks for a specific hook point
   */
  async executeHooks(hookName, ...args) {
    if (!this.hooks[hookName]) {
      logger.warn(`Unknown hook: ${hookName}`);
      return;
    }
    
    for (const hook of this.hooks[hookName]) {
      try {
        await hook(...args);
      } catch (error) {
        logger.error(`Error executing hook "${hookName}":`, error);
      }
    }
  }
  
  /**
   * Create Express middleware for request/response hooks
   */
  createMiddleware() {
    return async (req, res, next) => {
      // Store original methods
      const originalJson = res.json;
      const originalEnd = res.end;
      
      // Execute beforeRequest hooks
      await this.executeHooks('beforeRequest', req, res);
      
      // Override res.json method
      res.json = async (data) => {
        // Execute beforeResponse hooks
        await this.executeHooks('beforeResponse', req, res, data);
        
        // Restore original method
        res.json = originalJson;
        
        // Call original method
        const result = res.json(data);
        
        // Execute afterResponse hooks
        await this.executeHooks('afterResponse', req, res, data);
        
        return result;
      };
      
      // Override res.end method
      res.end = async function(...args) {
        // Restore original method
        res.end = originalEnd;
        
        // Call original method
        const result = res.end(...args);
        
        // Execute afterResponse hooks
        await this.executeHooks('afterResponse', req, res);
        
        return result;
      };
      
      // Continue to next middleware
      next();
      
      // Execute afterRequest hooks
      await this.executeHooks('afterRequest', req, res);
    };
  }
}

module.exports = new PluginManager(); 
const Ajv = require('ajv');
const addFormats = require('ajv-formats');
const logger = require('../utils/logger');

/**
 * Validation Manager
 * Handles schema validation using AJV
 */
class ValidationManager {
  constructor(config = {}) {
    this.config = config;
    
    // Initialize AJV with configuration
    this.ajv = new Ajv({
      allErrors: true,
      removeAdditional: config.removeAdditional || 'false',
      useDefaults: true,
      coerceTypes: true,
      ...config.ajvOptions
    });
    
    // Add standard formats
    addFormats(this.ajv);
    
    // Add custom formats if provided
    if (config.customFormats) {
      Object.entries(config.customFormats).forEach(([name, format]) => {
        this.ajv.addFormat(name, format.validate);
      });
    }
    
    // Store schemas
    this.schemas = new Map();
  }
  
  /**
   * Add a schema to the validation manager
   * @param {string} name - Schema name
   * @param {object} schema - JSON Schema object
   */
  addSchema(name, schema) {
    try {
      const validate = this.ajv.compile(schema);
      this.schemas.set(name, { schema, validate });
      logger.debug(`Schema '${name}' added to validation manager`);
      return true;
    } catch (error) {
      logger.error(`Failed to add schema '${name}':`, error);
      throw error;
    }
  }
  
  /**
   * Validate data against a schema
   * @param {string} schemaName - Name of the schema to validate against
   * @param {object} data - Data to validate
   * @returns {object} Validation result { valid, errors }
   */
  validate(schemaName, data) {
    const schemaEntry = this.schemas.get(schemaName);
    
    if (!schemaEntry) {
      throw new Error(`Schema '${schemaName}' not found`);
    }
    
    const valid = schemaEntry.validate(data);
    
    return {
      valid,
      errors: schemaEntry.validate.errors || null
    };
  }
  
  /**
   * Get a list of all registered schemas
   * @returns {Array} Array of schema names
   */
  getSchemaNames() {
    return Array.from(this.schemas.keys());
  }
  
  /**
   * Get a specific schema by name
   * @param {string} name - Schema name
   * @returns {object} Schema object
   */
  getSchema(name) {
    const schemaEntry = this.schemas.get(name);
    return schemaEntry ? schemaEntry.schema : null;
  }
  
  /**
   * Create a middleware for validating request bodies
   * @param {string} schemaName - Name of the schema to validate against
   * @returns {Function} Express middleware
   */
  createValidationMiddleware(schemaName) {
    return (req, res, next) => {
      try {
        const result = this.validate(schemaName, req.body);
        
        if (result.valid) {
          next();
        } else {
          res.status(400).json({
            error: 'Validation Error',
            details: result.errors
          });
        }
      } catch (error) {
        logger.error(`Validation middleware error:`, error);
        res.status(500).json({
          error: 'Validation Error',
          message: error.message
        });
      }
    };
  }
}

module.exports = ValidationManager; 
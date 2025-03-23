const logger = require('../utils/logger');
const { v4: uuidv4 } = require('uuid');

/**
 * Security Audit Manager
 */
class SecurityAuditManager {
  constructor(config = {}, dbConnections = {}) {
    this.config = config;
    this.dbConnections = dbConnections;
  }
  
  /**
   * Initialize security audit manager
   */
  async initialize() {
    try {
      // Create security audit tables if they don't exist
      await this.createAuditTables();
      
      logger.info('Security audit manager initialized');
      return true;
    } catch (error) {
      logger.error('Failed to initialize security audit manager:', error);
      throw error;
    }
  }
  
  /**
   * Create security audit tables
   */
  async createAuditTables() {
    try {
      // Choose the appropriate database client based on configuration
      const dbClient = this.dbConnections[this.config.database || 'postgres'];
      
      if (!dbClient) {
        throw new Error(`Database client not found for security audit storage: ${this.config.database}`);
      }
      
      if (this.config.database === 'postgres' || this.config.database === 'mysql') {
        // Create security_audit_logs table
        await dbClient.query(`
          CREATE TABLE IF NOT EXISTS security_audit_logs (
            id VARCHAR(36) PRIMARY KEY,
            user_id VARCHAR(255),
            action VARCHAR(255) NOT NULL,
            resource_type VARCHAR(255) NOT NULL,
            resource_id VARCHAR(255),
            result VARCHAR(50) NOT NULL,
            details JSONB,
            ip_address VARCHAR(45),
            user_agent TEXT,
            created_at TIMESTAMP NOT NULL DEFAULT NOW()
          );
          
          CREATE INDEX IF NOT EXISTS idx_security_audit_logs_user_id ON security_audit_logs (user_id);
          CREATE INDEX IF NOT EXISTS idx_security_audit_logs_action ON security_audit_logs (action);
          CREATE INDEX IF NOT EXISTS idx_security_audit_logs_resource_type ON security_audit_logs (resource_type);
          CREATE INDEX IF NOT EXISTS idx_security_audit_logs_resource_id ON security_audit_logs (resource_id);
          CREATE INDEX IF NOT EXISTS idx_security_audit_logs_result ON security_audit_logs (result);
          CREATE INDEX IF NOT EXISTS idx_security_audit_logs_created_at ON security_audit_logs (created_at);
        `);
      } else if (this.config.database === 'mongodb') {
        const db = dbClient.db();
        
        // Create security_audit_logs collection
        await db.createCollection('security_audit_logs');
        
        // Create indexes
        await db.collection('security_audit_logs').createIndexes([
          { key: { user_id: 1 } },
          { key: { action: 1 } },
          { key: { resource_type: 1 } },
          { key: { resource_id: 1 } },
          { key: { result: 1 } },
          { key: { created_at: 1 } }
        ]);
      }
      
      logger.info('Security audit tables created');
      return true;
    } catch (error) {
      logger.error('Failed to create security audit tables:', error);
      throw error;
    }
  }
  
  /**
   * Log a security event
   */
  async logSecurityEvent(event) {
    try {
      // Validate required fields
      if (!event.action || !event.resourceType || !event.result) {
        throw new Error('Missing required fields for security audit log');
      }
      
      // Choose the appropriate database client based on configuration
      const dbClient = this.dbConnections[this.config.database || 'postgres'];
      
      if (!dbClient) {
        throw new Error(`Database client not found for security audit storage: ${this.config.database}`);
      }
      
      // Create log entry
      const logEntry = {
        id: event.id || uuidv4(),
        user_id: event.userId || null,
        action: event.action,
        resource_type: event.resourceType,
        resource_id: event.resourceId || null,
        result: event.result,
        details: event.details || null,
        ip_address: event.ipAddress || null,
        user_agent: event.userAgent || null,
        created_at: new Date()
      };
      
      // Store log entry
      if (this.config.database === 'postgres' || this.config.database === 'mysql') {
        await dbClient.query(`
          INSERT INTO security_audit_logs (
            id, user_id, action, resource_type, resource_id, result, details, ip_address, user_agent, created_at
          ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
        `, [
          logEntry.id,
          logEntry.user_id,
          logEntry.action,
          logEntry.resource_type,
          logEntry.resource_id,
          logEntry.result,
          logEntry.details,
          logEntry.ip_address,
          logEntry.user_agent,
          logEntry.created_at
        ]);
      } else if (this.config.database === 'mongodb') {
        await dbClient.collection('security_audit_logs').insertOne(logEntry);
      }
      
      // Log to console if enabled
      if (this.config.logToConsole) {
        logger.info(`Security event: ${logEntry.action} ${logEntry.resource_type} ${logEntry.result}`, {
          securityEvent: logEntry
        });
      }
      
      return logEntry;
    } catch (error) {
      logger.error('Failed to log security event:', error);
      throw error;
    }
  }
  
  /**
   * Get security audit logs
   */
  async getSecurityAuditLogs(options = {}) {
    try {
      // Choose the appropriate database client based on configuration
      const dbClient = this.dbConnections[this.config.database || 'postgres'];
      
      if (!dbClient) {
        throw new Error(`Database client not found for security audit storage: ${this.config.database}`);
      }
      
      let logs = [];
      
      if (this.config.database === 'postgres' || this.config.database === 'mysql') {
        let query = 'SELECT * FROM security_audit_logs WHERE 1=1';
        const params = [];
        
        // Add filters
        if (options.userId) {
          query += ` AND user_id = $${params.length + 1}`;
          params.push(options.userId);
        }
        
        if (options.action) {
          query += ` AND action = $${params.length + 1}`;
          params.push(options.action);
        }
        
        if (options.resourceType) {
          query += ` AND resource_type = $${params.length + 1}`;
          params.push(options.resourceType);
        }
        
        if (options.resourceId) {
          query += ` AND resource_id = $${params.length + 1}`;
          params.push(options.resourceId);
        }
        
        if (options.result) {
          query += ` AND result = $${params.length + 1}`;
          params.push(options.result);
        }
        
        if (options.startDate) {
          query += ` AND created_at >= $${params.length + 1}`;
          params.push(options.startDate);
        }
        
        if (options.endDate) {
          query += ` AND created_at <= $${params.length + 1}`;
          params.push(options.endDate);
        }
        
        // Add order by
        query += ' ORDER BY created_at DESC';
        
        // Add limit and offset
        if (options.limit) {
          query += ` LIMIT $${params.length + 1}`;
          params.push(options.limit);
        }
        
        if (options.offset) {
          query += ` OFFSET $${params.length + 1}`;
          params.push(options.offset);
        }
        
        const result = await dbClient.query(query, params);
        logs = result.rows || result;
      } else if (this.config.database === 'mongodb') {
        const query = {};
        
        // Add filters
        if (options.userId) {
          query.user_id = options.userId;
        }
        
        if (options.action) {
          query.action = options.action;
        }
        
        if (options.resourceType) {
          query.resource_type = options.resourceType;
        }
        
        if (options.resourceId) {
          query.resource_id = options.resourceId;
        }
        
        if (options.result) {
          query.result = options.result;
        }
        
        if (options.startDate || options.endDate) {
          query.created_at = {};
          
          if (options.startDate) {
            query.created_at.$gte = options.startDate;
          }
          
          if (options.endDate) {
            query.created_at.$lte = options.endDate;
          }
        }
        
        let cursor = dbClient.collection('security_audit_logs')
          .find(query)
          .sort({ created_at: -1 });
        
        if (options.limit) {
          cursor = cursor.limit(options.limit);
        }
        
        if (options.offset) {
          cursor = cursor.skip(options.offset);
        }
        
        logs = await cursor.toArray();
      }
      
      return logs;
    } catch (error) {
      logger.error('Failed to get security audit logs:', error);
      throw error;
    }
  }
  
  /**
   * Create Express middleware for security audit logging
   */
  createMiddleware() {
    return async (req, res, next) => {
      // Skip audit for certain paths
      if (this.config.excludePaths && this.config.excludePaths.some(path => req.path.startsWith(path))) {
        return next();
      }
      
      // Get user ID from request
      const userId = req.user ? req.user.id : null;
      
      // Determine action based on HTTP method
      let action;
      switch (req.method) {
        case 'GET':
          action = 'READ';
          break;
        case 'POST':
          action = 'CREATE';
          break;
        case 'PUT':
        case 'PATCH':
          action = 'UPDATE';
          break;
        case 'DELETE':
          action = 'DELETE';
          break;
        default:
          action = req.method;
      }
      
      // Determine resource type and ID from path
      const pathParts = req.path.split('/').filter(Boolean);
      const resourceType = pathParts.length > 0 ? pathParts[0] : 'unknown';
      const resourceId = pathParts.length > 1 ? pathParts[1] : null;
      
      // Create event object
      const event = {
        userId,
        action,
        resourceType,
        resourceId,
        result: 'PENDING',
        details: {
          method: req.method,
          path: req.path,
          query: req.query
        },
        ipAddress: req.ip,
        userAgent: req.get('user-agent')
      };
      
      // Store event in request for later use
      req.securityAuditEvent = event;
      
      // Handle response
      const originalEnd = res.end;
      res.end = async function(...args) {
        // Update event result based on status code
        if (req.securityAuditEvent) {
          if (res.statusCode >= 200 && res.statusCode < 300) {
            req.securityAuditEvent.result = 'SUCCESS';
          } else if (res.statusCode >= 400 && res.statusCode < 500) {
            req.securityAuditEvent.result = 'FAILURE';
          } else if (res.statusCode >= 500) {
            req.securityAuditEvent.result = 'ERROR';
          }
          
          // Add status code to details
          req.securityAuditEvent.details.statusCode = res.statusCode;
          
          // Log the event
          try {
            await this.logSecurityEvent(req.securityAuditEvent);
          } catch (error) {
            logger.error('Failed to log security audit event:', error);
          }
        }
        
        originalEnd.apply(res, args);
      }.bind(this);
      
      next();
    };
  }
  
  /**
   * Shutdown security audit manager
   */
  async shutdown() {
    logger.info('Security audit manager shut down');
  }
}

module.exports = SecurityAuditManager; 
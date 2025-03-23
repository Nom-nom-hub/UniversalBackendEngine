const { v4: uuidv4 } = require('uuid');
const logger = require('../utils/logger');

/**
 * Audit Manager
 */
class AuditManager {
  constructor(config = {}, dbConnections = {}) {
    this.config = config;
    this.dbConnections = dbConnections;
    this.middleware = this.createAuditMiddleware.bind(this);
  }
  
  /**
   * Initialize audit manager
   */
  async initialize() {
    try {
      // Create audit tables if they don't exist
      await this.createAuditTables();
      
      logger.info('Audit manager initialized');
      return true;
    } catch (error) {
      logger.error('Failed to initialize audit manager:', error);
      throw error;
    }
  }
  
  /**
   * Create audit tables
   */
  async createAuditTables() {
    try {
      // Choose the appropriate database client based on configuration
      const dbClient = this.dbConnections[this.config.database || 'postgres'];
      
      if (!dbClient) {
        throw new Error(`Database client not found for audit storage: ${this.config.database}`);
      }
      
      if (this.config.database === 'postgres' || this.config.database === 'mysql') {
        // Create audit_logs table
        await dbClient.query(`
          CREATE TABLE IF NOT EXISTS audit_logs (
            id VARCHAR(36) PRIMARY KEY,
            user_id VARCHAR(255),
            action VARCHAR(255) NOT NULL,
            entity_type VARCHAR(255) NOT NULL,
            entity_id VARCHAR(255),
            changes JSONB,
            metadata JSONB,
            ip_address VARCHAR(45),
            user_agent TEXT,
            created_at TIMESTAMP NOT NULL DEFAULT NOW()
          );
          
          CREATE INDEX IF NOT EXISTS idx_audit_logs_user_id ON audit_logs (user_id);
          CREATE INDEX IF NOT EXISTS idx_audit_logs_action ON audit_logs (action);
          CREATE INDEX IF NOT EXISTS idx_audit_logs_entity_type ON audit_logs (entity_type);
          CREATE INDEX IF NOT EXISTS idx_audit_logs_entity_id ON audit_logs (entity_id);
          CREATE INDEX IF NOT EXISTS idx_audit_logs_created_at ON audit_logs (created_at);
        `);
        
        // Create data_access_logs table
        await dbClient.query(`
          CREATE TABLE IF NOT EXISTS data_access_logs (
            id VARCHAR(36) PRIMARY KEY,
            user_id VARCHAR(255),
            action VARCHAR(255) NOT NULL,
            entity_type VARCHAR(255) NOT NULL,
            entity_id VARCHAR(255),
            fields TEXT[],
            query JSONB,
            ip_address VARCHAR(45),
            user_agent TEXT,
            created_at TIMESTAMP NOT NULL DEFAULT NOW()
          );
          
          CREATE INDEX IF NOT EXISTS idx_data_access_logs_user_id ON data_access_logs (user_id);
          CREATE INDEX IF NOT EXISTS idx_data_access_logs_action ON data_access_logs (action);
          CREATE INDEX IF NOT EXISTS idx_data_access_logs_entity_type ON data_access_logs (entity_type);
          CREATE INDEX IF NOT EXISTS idx_data_access_logs_entity_id ON data_access_logs (entity_id);
          CREATE INDEX IF NOT EXISTS idx_data_access_logs_created_at ON data_access_logs (created_at);
        `);
      } else if (this.config.database === 'mongodb') {
        // Create indexes for MongoDB collections
        await dbClient.collection('audit_logs').createIndexes([
          { key: { user_id: 1 } },
          { key: { action: 1 } },
          { key: { entity_type: 1 } },
          { key: { entity_id: 1 } },
          { key: { created_at: 1 } }
        ]);
        
        await dbClient.collection('data_access_logs').createIndexes([
          { key: { user_id: 1 } },
          { key: { action: 1 } },
          { key: { entity_type: 1 } },
          { key: { entity_id: 1 } },
          { key: { created_at: 1 } }
        ]);
      }
      
      return true;
    } catch (error) {
      logger.error('Failed to create audit tables:', error);
      throw error;
    }
  }
  
  /**
   * Create audit middleware
   */
  createAuditMiddleware() {
    return (req, res, next) => {
      // Initialize audit context
      req.auditContext = {
        startTime: Date.now()
      };
      
      // Capture original response methods
      const originalSend = res.send;
      const originalJson = res.json;
      const originalEnd = res.end;
      
      // Override response methods to capture data
      res.send = function(body) {
        this.auditBody = body;
        return originalSend.apply(this, arguments);
      };
      
      res.json = function(body) {
        this.auditBody = body;
        return originalJson.apply(this, arguments);
      };
      
      res.end = function(chunk, encoding) {
        // Restore original methods
        res.send = originalSend;
        res.json = originalJson;
        res.end = originalEnd;
        
        // Log the request/response
        const auditContext = req.auditContext || {};
        
        // Only log if the request matches the configured paths
        if (this.shouldAuditRequest(req, auditContext)) {
          this.logAccess({
            userId: req.user?.id,
            action: auditContext.action || req.method,
            entityType: auditContext.entityType,
            entityId: auditContext.entityId,
            fields: auditContext.fields,
            query: {
              params: req.params,
              query: req.query,
              body: this.sanitizeRequestBody(req.body)
            },
            ipAddress: req.ip,
            userAgent: req.get('user-agent'),
            responseStatus: res.statusCode,
            responseTime: Date.now() - auditContext.startTime
          });
        }
        
        return originalEnd.apply(this, arguments);
      }.bind(this);
      
      next();
    };
  }
  
  /**
   * Check if request should be audited
   */
  shouldAuditRequest(req, auditContext) {
    // Skip if auditing is disabled
    if (!this.config.enabled) {
      return false;
    }
    
    // Skip if path is excluded
    if (this.config.excludePaths) {
      for (const pattern of this.config.excludePaths) {
        if (typeof pattern === 'string' && req.path.startsWith(pattern)) {
          return false;
        } else if (pattern instanceof RegExp && pattern.test(req.path)) {
          return false;
        }
      }
    }
    
    // Skip if method is excluded
    if (this.config.excludeMethods && this.config.excludeMethods.includes(req.method)) {
      return false;
    }
    
    // Include if path is explicitly included
    if (this.config.includePaths) {
      for (const pattern of this.config.includePaths) {
        if (typeof pattern === 'string' && req.path.startsWith(pattern)) {
          return true;
        } else if (pattern instanceof RegExp && pattern.test(req.path)) {
          return true;
        }
      }
      
      // If includePaths is specified but none match, skip
      return false;
    }
    
    // Include if audit context has entity type
    if (auditContext.entityType) {
      return true;
    }
    
    // Default to config setting
    return this.config.auditAllRequests || false;
  }
  
  /**
   * Sanitize request body for logging
   */
  sanitizeRequestBody(body) {
    if (!body) return null;
    
    const sanitized = { ...body };
    
    // Remove sensitive fields
    const sensitiveFields = this.config.sensitiveFields || [
      'password', 'token', 'secret', 'apiKey', 'api_key', 'credit_card',
      'creditCard', 'ssn', 'social_security', 'socialSecurity'
    ];
    
    for (const field of sensitiveFields) {
      if (sanitized[field]) {
        sanitized[field] = '[REDACTED]';
      }
    }
    
    return sanitized;
  }
  
  /**
   * Log data access
   */
  async logAccess(data) {
    try {
      const dbClient = this.dbConnections[this.config.database || 'postgres'];
      
      if (!dbClient) {
        logger.warn('Database client not found for audit logging');
        return;
      }
      
      const accessLog = {
        id: uuidv4(),
        user_id: data.userId,
        action: data.action,
        entity_type: data.entityType,
        entity_id: data.entityId,
        fields: data.fields,
        query: data.query,
        ip_address: data.ipAddress,
        user_agent: data.userAgent,
        created_at: new Date()
      };
      
      if (this.config.database === 'postgres' || this.config.database === 'mysql') {
        await dbClient.query(
          `INSERT INTO data_access_logs (
            id, user_id, action, entity_type, entity_id, fields, query, 
            ip_address, user_agent, created_at
          ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)`,
          [
            accessLog.id,
            accessLog.user_id,
            accessLog.action,
            accessLog.entity_type,
            accessLog.entity_id,
            accessLog.fields,
            JSON.stringify(accessLog.query),
            accessLog.ip_address,
            accessLog.user_agent,
            accessLog.created_at
          ]
        );
      } else if (this.config.database === 'mongodb') {
        await dbClient.collection('data_access_logs').insertOne(accessLog);
      }
      
      if (this.config.logToConsole) {
        logger.debug('Data access logged:', {
          userId: data.userId,
          action: data.action,
          entityType: data.entityType,
          entityId: data.entityId,
          responseStatus: data.responseStatus,
          responseTime: data.responseTime
        });
      }
      
      return accessLog.id;
    } catch (error) {
      logger.error('Failed to log data access:', error);
      // Don't throw error to avoid disrupting the application flow
      return null;
    }
  }
  
  /**
   * Log entity changes
   */
  async logChanges(data) {
    try {
      const dbClient = this.dbConnections[this.config.database || 'postgres'];
      
      if (!dbClient) {
        logger.warn('Database client not found for audit logging');
        return;
      }
      
      const auditLog = {
        id: uuidv4(),
        user_id: data.userId,
        action: data.action,
        entity_type: data.entityType,
        entity_id: data.entityId,
        changes: data.changes,
        metadata: data.metadata,
        ip_address: data.ipAddress,
        user_agent: data.userAgent,
        created_at: new Date()
      };
      
      if (this.config.database === 'postgres' || this.config.database === 'mysql') {
        await dbClient.query(
          `INSERT INTO audit_logs (
            id, user_id, action, entity_type, entity_id, changes, metadata, 
            ip_address, user_agent, created_at
          ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)`,
          [
            auditLog.id,
            auditLog.user_id,
            auditLog.action,
            auditLog.entity_type,
            auditLog.entity_id,
            JSON.stringify(auditLog.changes),
            JSON.stringify(auditLog.metadata),
            auditLog.ip_address,
            auditLog.user_agent,
            auditLog.created_at
          ]
        );
      } else if (this.config.database === 'mongodb') {
        await dbClient.collection('audit_logs').insertOne(auditLog);
      }
      
      if (this.config.logToConsole) {
        logger.debug('Entity changes logged:', {
          userId: data.userId,
          action: data.action,
          entityType: data.entityType,
          entityId: data.entityId
        });
      }
      
      return auditLog.id;
    } catch (error) {
      logger.error('Failed to log entity changes:', error);
      // Don't throw error to avoid disrupting the application flow
      return null;
    }
  }
  
  /**
   * Get audit logs for entity
   */
  async getAuditLogsForEntity(entityType, entityId, options = {}) {
    try {
      const dbClient = this.dbConnections[this.config.database || 'postgres'];
      
      if (!dbClient) {
        throw new Error('Database client not found for audit retrieval');
      }
      
      let logs = [];
      
      if (this.config.database === 'postgres' || this.config.database === 'mysql') {
        let query = 'SELECT * FROM audit_logs WHERE entity_type = $1 AND entity_id = $2';
        const params = [entityType, entityId];
        
        if (options.action) {
          query += ' AND action = $3';
          params.push(options.action);
        }
        
        if (options.userId) {
          query += ` AND user_id = $${params.length + 1}`;
          params.push(options.userId);
        }
        
        if (options.startDate) {
          query += ` AND created_at >= $${params.length + 1}`;
          params.push(options.startDate);
        }
        
        if (options.endDate) {
          query += ` AND created_at <= $${params.length + 1}`;
          params.push(options.endDate);
        }
        
        query += ' ORDER BY created_at DESC';
        
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
        const query = { entity_type: entityType, entity_id: entityId };
        
        if (options.action) {
          query.action = options.action;
        }
        
        if (options.userId) {
          query.user_id = options.userId;
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
        
        let cursor = dbClient.collection('audit_logs')
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
      logger.error('Failed to get audit logs for entity:', error);
      throw error;
    }
  }
  
  /**
   * Get data access logs for entity
   */
  async getAccessLogsForEntity(entityType, entityId, options = {}) {
    try {
      const dbClient = this.dbConnections[this.config.database || 'postgres'];
      
      if (!dbClient) {
        throw new Error('Database client not found for audit retrieval');
      }
      
      let logs = [];
      
      if (this.config.database === 'postgres' || this.config.database === 'mysql') {
        let query = 'SELECT * FROM data_access_logs WHERE entity_type = $1 AND entity_id = $2';
        const params = [entityType, entityId];
        
        if (options.action) {
          query += ' AND action = $3';
          params.push(options.action);
        }
        
        if (options.userId) {
          query += ` AND user_id = $${params.length + 1}`;
          params.push(options.userId);
        }
        
        if (options.startDate) {
          query += ` AND created_at >= $${params.length + 1}`;
          params.push(options.startDate);
        }
        
        if (options.endDate) {
          query += ` AND created_at <= $${params.length + 1}`;
          params.push(options.endDate);
        }
        
        query += ' ORDER BY created_at DESC';
        
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
        const query = { entity_type: entityType, entity_id: entityId };
        
        if (options.action) {
          query.action = options.action;
        }
        
        if (options.userId) {
          query.user_id = options.userId;
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
        
        let cursor = dbClient.collection('data_access_logs')
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
      logger.error('Failed to get data access logs for entity:', error);
      throw error;
    }
  }
  
  /**
   * Create audit context for a request
   */
  createAuditContext(req, entityType, entityId, action, fields = null) {
    req.auditContext = {
      ...req.auditContext,
      entityType,
      entityId,
      action,
      fields,
      startTime: req.auditContext?.startTime || Date.now()
    };
    
    return req.auditContext;
  }
  
  /**
   * Generate GDPR data export for user
   */
  async generateGDPRExport(userId) {
    try {
      const dbClient = this.dbConnections[this.config.database || 'postgres'];
      
      if (!dbClient) {
        throw new Error('Database client not found for GDPR export');
      }
      
      // Get all audit logs for user
      let auditLogs = [];
      let accessLogs = [];
      
      if (this.config.database === 'postgres' || this.config.database === 'mysql') {
        const auditResult = await dbClient.query(
          'SELECT * FROM audit_logs WHERE user_id = $1 ORDER BY created_at DESC',
          [userId]
        );
        
        auditLogs = auditResult.rows || auditResult;
        
        const accessResult = await dbClient.query(
          'SELECT * FROM data_access_logs WHERE user_id = $1 ORDER BY created_at DESC',
          [userId]
        );
        
        accessLogs = accessResult.rows || accessResult;
      } else if (this.config.database === 'mongodb') {
        auditLogs = await dbClient.collection('audit_logs')
          .find({ user_id: userId })
          .sort({ created_at: -1 })
          .toArray();
        
        accessLogs = await dbClient.collection('data_access_logs')
          .find({ user_id: userId })
          .sort({ created_at: -1 })
          .toArray();
      }
      
      // Format data for export
      const exportData = {
        userId,
        exportDate: new Date(),
        auditLogs: auditLogs.map(log => ({
          action: log.action,
          entityType: log.entity_type,
          entityId: log.entity_id,
          changes: log.changes,
          timestamp: log.created_at,
          ipAddress: log.ip_address
        })),
        accessLogs: accessLogs.map(log => ({
          action: log.action,
          entityType: log.entity_type,
          entityId: log.entity_id,
          timestamp: log.created_at,
          ipAddress: log.ip_address
        }))
      };
      
      return exportData;
    } catch (error) {
      logger.error('Failed to generate GDPR export:', error);
      throw error;
    }
  }
  
  /**
   * Execute right to be forgotten for user
   */
  async executeRightToBeForgotten(userId) {
    try {
      const dbClient = this.dbConnections[this.config.database || 'postgres'];
      
      if (!dbClient) {
        throw new Error('Database client not found for right to be forgotten');
      }
      
      // Log the request
      await this.logChanges({
        userId: 'system',
        action: 'RIGHT_TO_BE_FORGOTTEN',
        entityType: 'user',
        entityId: userId,
        changes: { status: 'anonymized' },
        metadata: { reason: 'GDPR request' },
        ipAddress: '127.0.0.1',
        userAgent: 'System'
      });
      
      // Anonymize user data in audit logs
      if (this.config.database === 'postgres' || this.config.database === 'mysql') {
        await dbClient.query(
          'UPDATE audit_logs SET ip_address = NULL, user_agent = NULL WHERE user_id = $1',
          [userId]
        );
        
        await dbClient.query(
          'UPDATE data_access_logs SET ip_address = NULL, user_agent = NULL WHERE user_id = $1',
          [userId]
        );
      } else if (this.config.database === 'mongodb') {
        await dbClient.collection('audit_logs').updateMany(
          { user_id: userId },
          { $set: { ip_address: null, user_agent: null } }
        );
        
        await dbClient.collection('data_access_logs').updateMany(
          { user_id: userId },
          { $set: { ip_address: null, user_agent: null } }
        );
      }
      
      return true;
    } catch (error) {
      logger.error('Failed to execute right to be forgotten:', error);
      throw error;
    }
  }
}

module.exports = AuditManager; 
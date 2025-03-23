const { v4: uuidv4 } = require('uuid');
const logger = require('../utils/logger');

/**
 * Tenant Manager for multi-tenant applications
 */
class TenantManager {
  constructor(config = {}, dbConnections) {
    this.config = config;
    this.dbConnections = dbConnections;
    this.tenants = new Map();
    this.tenantMiddleware = this.tenantMiddleware.bind(this);
  }

  /**
   * Initialize tenant manager
   */
  async initialize() {
    try {
      // Load tenants from database
      await this.loadTenants();
      logger.info(`Initialized tenant manager with ${this.tenants.size} tenants`);
      return true;
    } catch (error) {
      logger.error('Failed to initialize tenant manager:', error);
      throw error;
    }
  }

  /**
   * Load tenants from database
   */
  async loadTenants() {
    try {
      // Choose the appropriate database client based on configuration
      const dbClient = this.dbConnections[this.config.database || 'postgres'];
      
      if (!dbClient) {
        throw new Error(`Database client not found for tenant storage: ${this.config.database}`);
      }

      // Load tenants from database
      let tenants = [];
      
      if (this.config.database === 'postgres' || this.config.database === 'mysql') {
        tenants = await dbClient.query('SELECT * FROM tenants WHERE active = true');
        tenants = tenants.rows || tenants;
      } else if (this.config.database === 'mongodb') {
        tenants = await dbClient.collection('tenants').find({ active: true }).toArray();
      }

      // Store tenants in memory
      tenants.forEach(tenant => {
        this.tenants.set(tenant.id, {
          id: tenant.id,
          name: tenant.name,
          domain: tenant.domain,
          config: tenant.config || {},
          createdAt: tenant.created_at || tenant.createdAt,
          updatedAt: tenant.updated_at || tenant.updatedAt
        });
      });

      return this.tenants;
    } catch (error) {
      logger.error('Failed to load tenants:', error);
      throw error;
    }
  }

  /**
   * Get tenant by ID
   */
  getTenant(id) {
    return this.tenants.get(id);
  }

  /**
   * Get tenant by domain
   */
  getTenantByDomain(domain) {
    for (const [, tenant] of this.tenants) {
      if (tenant.domain === domain) {
        return tenant;
      }
    }
    return null;
  }

  /**
   * Create a new tenant
   */
  async createTenant(tenantData) {
    try {
      const dbClient = this.dbConnections[this.config.database || 'postgres'];
      
      if (!dbClient) {
        throw new Error(`Database client not found for tenant storage: ${this.config.database}`);
      }

      // Generate tenant ID if not provided
      const id = tenantData.id || uuidv4();
      const now = new Date();

      // Create tenant object
      const tenant = {
        id,
        name: tenantData.name,
        domain: tenantData.domain,
        config: tenantData.config || {},
        active: true,
        created_at: now,
        updated_at: now
      };

      // Store in database
      if (this.config.database === 'postgres') {
        await dbClient.query(
          'INSERT INTO tenants (id, name, domain, config, active, created_at, updated_at) VALUES ($1, $2, $3, $4, $5, $6, $7)',
          [tenant.id, tenant.name, tenant.domain, JSON.stringify(tenant.config), tenant.active, tenant.created_at, tenant.updated_at]
        );
      } else if (this.config.database === 'mysql') {
        await dbClient.query(
          'INSERT INTO tenants (id, name, domain, config, active, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?)',
          [tenant.id, tenant.name, tenant.domain, JSON.stringify(tenant.config), tenant.active, tenant.created_at, tenant.updated_at]
        );
      } else if (this.config.database === 'mongodb') {
        await dbClient.collection('tenants').insertOne({
          id: tenant.id,
          name: tenant.name,
          domain: tenant.domain,
          config: tenant.config,
          active: tenant.active,
          createdAt: tenant.created_at,
          updatedAt: tenant.updated_at
        });
      }

      // Store in memory
      this.tenants.set(id, {
        id,
        name: tenant.name,
        domain: tenant.domain,
        config: tenant.config,
        createdAt: tenant.created_at,
        updatedAt: tenant.updated_at
      });

      logger.info(`Created tenant: ${tenant.name} (${id})`);
      return this.tenants.get(id);
    } catch (error) {
      logger.error('Failed to create tenant:', error);
      throw error;
    }
  }

  /**
   * Update a tenant
   */
  async updateTenant(id, tenantData) {
    try {
      const dbClient = this.dbConnections[this.config.database || 'postgres'];
      
      if (!dbClient) {
        throw new Error(`Database client not found for tenant storage: ${this.config.database}`);
      }

      // Check if tenant exists
      const existingTenant = this.tenants.get(id);
      if (!existingTenant) {
        throw new Error(`Tenant not found: ${id}`);
      }

      const now = new Date();

      // Update tenant object
      const updatedTenant = {
        ...existingTenant,
        name: tenantData.name || existingTenant.name,
        domain: tenantData.domain || existingTenant.domain,
        config: tenantData.config || existingTenant.config,
        updatedAt: now
      };

      // Update in database
      if (this.config.database === 'postgres') {
        await dbClient.query(
          'UPDATE tenants SET name = $1, domain = $2, config = $3, updated_at = $4 WHERE id = $5',
          [updatedTenant.name, updatedTenant.domain, JSON.stringify(updatedTenant.config), now, id]
        );
      } else if (this.config.database === 'mysql') {
        await dbClient.query(
          'UPDATE tenants SET name = ?, domain = ?, config = ?, updated_at = ? WHERE id = ?',
          [updatedTenant.name, updatedTenant.domain, JSON.stringify(updatedTenant.config), now, id]
        );
      } else if (this.config.database === 'mongodb') {
        await dbClient.collection('tenants').updateOne(
          { id },
          {
            $set: {
              name: updatedTenant.name,
              domain: updatedTenant.domain,
              config: updatedTenant.config,
              updatedAt: now
            }
          }
        );
      }

      // Update in memory
      this.tenants.set(id, updatedTenant);

      logger.info(`Updated tenant: ${updatedTenant.name} (${id})`);
      return this.tenants.get(id);
    } catch (error) {
      logger.error(`Failed to update tenant ${id}:`, error);
      throw error;
    }
  }

  /**
   * Delete a tenant
   */
  async deleteTenant(id) {
    try {
      const dbClient = this.dbConnections[this.config.database || 'postgres'];
      
      if (!dbClient) {
        throw new Error(`Database client not found for tenant storage: ${this.config.database}`);
      }

      // Check if tenant exists
      const existingTenant = this.tenants.get(id);
      if (!existingTenant) {
        throw new Error(`Tenant not found: ${id}`);
      }

      // Delete from database (soft delete)
      if (this.config.database === 'postgres') {
        await dbClient.query(
          'UPDATE tenants SET active = false, updated_at = $1 WHERE id = $2',
          [new Date(), id]
        );
      } else if (this.config.database === 'mysql') {
        await dbClient.query(
          'UPDATE tenants SET active = false, updated_at = ? WHERE id = ?',
          [new Date(), id]
        );
      } else if (this.config.database === 'mongodb') {
        await dbClient.collection('tenants').updateOne(
          { id },
          {
            $set: {
              active: false,
              updatedAt: new Date()
            }
          }
        );
      }

      // Remove from memory
      this.tenants.delete(id);

      logger.info(`Deleted tenant: ${existingTenant.name} (${id})`);
      return true;
    } catch (error) {
      logger.error(`Failed to delete tenant ${id}:`, error);
      throw error;
    }
  }

  /**
   * Tenant identification middleware
   */
  tenantMiddleware(req, res, next) {
    try {
      // Get tenant ID from request
      let tenantId = null;

      // Check header
      if (req.headers['x-tenant-id']) {
        tenantId = req.headers['x-tenant-id'];
      }
      // Check subdomain
      else if (this.config.identificationStrategy === 'subdomain') {
        const host = req.headers.host;
        if (host) {
          const subdomain = host.split('.')[0];
          // Find tenant by subdomain
          for (const [id, tenant] of this.tenants) {
            if (tenant.domain === subdomain) {
              tenantId = id;
              break;
            }
          }
        }
      }
      // Check path
      else if (this.config.identificationStrategy === 'path') {
        const pathParts = req.path.split('/');
        if (pathParts.length > 1 && pathParts[1]) {
          // Check if the first path segment is a tenant ID
          if (this.tenants.has(pathParts[1])) {
            tenantId = pathParts[1];
            // Remove tenant ID from path
            req.url = req.url.replace(`/${tenantId}`, '');
          }
        }
      }

      // If tenant ID found, attach tenant to request
      if (tenantId && this.tenants.has(tenantId)) {
        req.tenant = this.tenants.get(tenantId);
        logger.debug(`Request for tenant: ${req.tenant.name} (${tenantId})`);
      } else if (this.config.requireTenant) {
        // If tenant is required but not found, return error
        return res.status(400).json({
          error: 'Tenant not found or not specified'
        });
      }

      next();
    } catch (error) {
      logger.error('Error in tenant middleware:', error);
      next(error);
    }
  }

  /**
   * Get database name for tenant
   */
  getTenantDatabaseName(tenantId, baseDbName) {
    if (!tenantId) return baseDbName;
    
    // If using separate databases per tenant
    if (this.config.databaseStrategy === 'separate') {
      return `${baseDbName}_${tenantId}`;
    }
    
    // If using separate schemas per tenant
    if (this.config.databaseStrategy === 'schema') {
      return baseDbName;
    }
    
    // Default to shared database
    return baseDbName;
  }

  /**
   * Get schema name for tenant
   */
  getTenantSchemaName(tenantId) {
    if (!tenantId) return 'public';
    
    // If using separate schemas per tenant
    if (this.config.databaseStrategy === 'schema') {
      return `tenant_${tenantId}`;
    }
    
    // Default to public schema
    return 'public';
  }
}

module.exports = TenantManager; 
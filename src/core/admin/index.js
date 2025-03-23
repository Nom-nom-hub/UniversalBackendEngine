const express = require('express');
const path = require('path');
const fs = require('fs');
const logger = require('../utils/logger');

/**
 * Admin Interface Generator
 */
class AdminInterfaceGenerator {
  constructor(config = {}) {
    this.config = config;
    this.router = express.Router();
    this.models = new Map();
  }
  
  /**
   * Initialize admin interface
   */
  async initialize(app) {
    try {
      // Setup authentication for admin routes
      this.setupAuthentication();
      
      // Load models
      await this.loadModels();
      
      // Generate admin routes
      this.generateRoutes();
      
      // Serve admin UI
      this.serveAdminUI();
      
      // Mount admin router
      const basePath = this.config.basePath || '/admin';
      app.use(basePath, this.router);
      
      logger.info(`Admin interface initialized at ${basePath}`);
      return true;
    } catch (error) {
      logger.error('Failed to initialize admin interface:', error);
      throw error;
    }
  }
  
  /**
   * Setup authentication for admin routes
   */
  setupAuthentication() {
    // Add authentication middleware
    this.router.use((req, res, next) => {
      // Check if user is authenticated and has admin role
      if (!req.user) {
        return res.status(401).json({ error: 'Authentication required' });
      }
      
      if (!req.user.roles || !req.user.roles.includes('admin')) {
        return res.status(403).json({ error: 'Admin role required' });
      }
      
      next();
    });
  }
  
  /**
   * Load models for admin interface
   */
  async loadModels() {
    try {
      const modelsDir = path.join(process.cwd(), 'src', 'models');
      
      if (!fs.existsSync(modelsDir)) {
        logger.warn('Models directory not found');
        return;
      }
      
      const modelFiles = fs.readdirSync(modelsDir).filter(file => file.endsWith('.js'));
      
      for (const file of modelFiles) {
        try {
          const model = require(path.join(modelsDir, file));
          
          // Skip models that don't have admin configuration
          if (!model.admin) {
            continue;
          }
          
          // Add model to admin interface
          this.models.set(model.name, {
            ...model,
            fields: model.admin.fields || Object.keys(model.schema || {})
          });
          
          logger.debug(`Added model to admin interface: ${model.name}`);
        } catch (error) {
          logger.error(`Failed to load model from file ${file}:`, error);
        }
      }
      
      logger.info(`Loaded ${this.models.size} models for admin interface`);
    } catch (error) {
      logger.error('Failed to load models for admin interface:', error);
      throw error;
    }
  }
  
  /**
   * Generate admin routes for models
   */
  generateRoutes() {
    // API routes for models
    const apiRouter = express.Router();
    
    // Add routes for each model
    for (const [modelName, model] of this.models) {
      const modelRouter = express.Router();
      
      // List items
      modelRouter.get('/', async (req, res) => {
        try {
          const { page = 1, limit = 10, sort, filter } = req.query;
          
          // Get database client
          const dbClient = req.app.locals.connections[model.database || 'postgres'];
          
          if (!dbClient) {
            return res.status(500).json({ error: `Database client not found: ${model.database}` });
          }
          
          // Build query
          let query = {};
          let sortOptions = {};
          
          // Apply filters
          if (filter) {
            try {
              query = JSON.parse(filter);
            } catch (error) {
              return res.status(400).json({ error: 'Invalid filter format' });
            }
          }
          
          // Apply sorting
          if (sort) {
            try {
              sortOptions = JSON.parse(sort);
            } catch (error) {
              return res.status(400).json({ error: 'Invalid sort format' });
            }
          }
          
          // Apply tenant filter if multi-tenant
          if (req.tenant && model.multiTenant) {
            query.tenantId = req.tenant.id;
          }
          
          // Execute query based on database type
          let items = [];
          let total = 0;
          
          if (model.database === 'mongodb') {
            // MongoDB query
            const collection = dbClient.collection(model.collection);
            
            // Get total count
            total = await collection.countDocuments(query);
            
            // Get items with pagination
            items = await collection.find(query)
              .sort(sortOptions)
              .skip((page - 1) * limit)
              .limit(parseInt(limit))
              .toArray();
          } else {
            // SQL query (simplified)
            const offset = (page - 1) * limit;
            const result = await dbClient.query(
              `SELECT * FROM ${model.table} LIMIT $1 OFFSET $2`,
              [limit, offset]
            );
            
            items = result.rows || result;
            
            // Get total count
            const countResult = await dbClient.query(`SELECT COUNT(*) FROM ${model.table}`);
            total = parseInt(countResult.rows[0].count);
          }
          
          res.json({
            items,
            pagination: {
              page: parseInt(page),
              limit: parseInt(limit),
              total,
              pages: Math.ceil(total / limit)
            }
          });
        } catch (error) {
          logger.error(`Error in admin list route for ${modelName}:`, error);
          res.status(500).json({ error: error.message });
        }
      });
      
      // Get single item
      modelRouter.get('/:id', async (req, res) => {
        try {
          const { id } = req.params;
          
          // Get database client
          const dbClient = req.app.locals.connections[model.database || 'postgres'];
          
          if (!dbClient) {
            return res.status(500).json({ error: `Database client not found: ${model.database}` });
          }
          
          // Execute query based on database type
          let item = null;
          
          if (model.database === 'mongodb') {
            // MongoDB query
            const collection = dbClient.collection(model.collection);
            item = await collection.findOne({ _id: id });
          } else {
            // SQL query
            const result = await dbClient.query(
              `SELECT * FROM ${model.table} WHERE id = $1`,
              [id]
            );
            
            item = result.rows[0] || null;
          }
          
          if (!item) {
            return res.status(404).json({ error: 'Item not found' });
          }
          
          res.json(item);
        } catch (error) {
          logger.error(`Error in admin get route for ${modelName}:`, error);
          res.status(500).json({ error: error.message });
        }
      });
      
      // Create item
      modelRouter.post('/', async (req, res) => {
        try {
          const data = req.body;
          
          // Get database client
          const dbClient = req.app.locals.connections[model.database || 'postgres'];
          
          if (!dbClient) {
            return res.status(500).json({ error: `Database client not found: ${model.database}` });
          }
          
          // Add tenant ID if multi-tenant
          if (req.tenant && model.multiTenant) {
            data.tenantId = req.tenant.id;
          }
          
          // Execute query based on database type
          let item = null;
          
          if (model.database === 'mongodb') {
            // MongoDB query
            const collection = dbClient.collection(model.collection);
            const result = await collection.insertOne(data);
            item = { ...data, _id: result.insertedId };
          } else {
            // SQL query (simplified)
            const fields = Object.keys(data);
            const values = Object.values(data);
            const placeholders = fields.map((_, i) => `$${i + 1}`).join(', ');
            
            const result = await dbClient.query(
              `INSERT INTO ${model.table} (${fields.join(', ')}) VALUES (${placeholders}) RETURNING *`,
              values
            );
            
            item = result.rows[0];
          }
          
          res.status(201).json(item);
        } catch (error) {
          logger.error(`Error in admin create route for ${modelName}:`, error);
          res.status(500).json({ error: error.message });
        }
      });
      
      // Update item
      modelRouter.put('/:id', async (req, res) => {
        try {
          const { id } = req.params;
          const data = req.body;
          
          // Get database client
          const dbClient = req.app.locals.connections[model.database || 'postgres'];
          
          if (!dbClient) {
            return res.status(500).json({ error: `Database client not found: ${model.database}` });
          }
          
          // Execute query based on database type
          let item = null;
          
          if (model.database === 'mongodb') {
            // MongoDB query
            const collection = dbClient.collection(model.collection);
            await collection.updateOne({ _id: id }, { $set: data });
            item = await collection.findOne({ _id: id });
          } else {
            // SQL query (simplified)
            const fields = Object.keys(data);
            const values = Object.values(data);
            const setClause = fields.map((field, i) => `${field} = $${i + 1}`).join(', ');
            
            const result = await dbClient.query(
              `UPDATE ${model.table} SET ${setClause} WHERE id = $${fields.length + 1} RETURNING *`,
              [...values, id]
            );
            
            item = result.rows[0];
          }
          
          if (!item) {
            return res.status(404).json({ error: 'Item not found' });
          }
          
          res.json(item);
        } catch (error) {
          logger.error(`Error in admin update route for ${modelName}:`, error);
          res.status(500).json({ error: error.message });
        }
      });
      
      // Delete item
      modelRouter.delete('/:id', async (req, res) => {
        try {
          const { id } = req.params;
          
          // Get database client
          const dbClient = req.app.locals.connections[model.database || 'postgres'];
          
          if (!dbClient) {
            return res.status(500).json({ error: `Database client not found: ${model.database}` });
          }
          
          // Execute query based on database type
          let success = false;
          
          if (model.database === 'mongodb') {
            // MongoDB query
            const collection = dbClient.collection(model.collection);
            const result = await collection.deleteOne({ _id: id });
            success = result.deletedCount > 0;
          } else {
            // SQL query
            const result = await dbClient.query(
              `DELETE FROM ${model.table} WHERE id = $1`,
              [id]
            );
            
            success = result.rowCount > 0;
          }
          
          if (!success) {
            return res.status(404).json({ error: 'Item not found' });
          }
          
          res.status(204).end();
        } catch (error) {
          logger.error(`Error in admin delete route for ${modelName}:`, error);
          res.status(500).json({ error: error.message });
        }
      });
      
      // Mount model router
      apiRouter.use(`/${modelName.toLowerCase()}`, modelRouter);
    }
    
    // Mount API router
    this.router.use('/api', apiRouter);
    
    // Add metadata route
    this.router.get('/meta', (req, res) => {
      const models = Array.from(this.models.entries()).map(([name, model]) => ({
        name,
        label: model.admin.label || name,
        fields: model.fields.map(field => {
          const fieldConfig = model.admin.fieldConfig?.[field] || {};
          return {
            name: field,
            label: fieldConfig.label || field,
            type: fieldConfig.type || 'text',
            required: fieldConfig.required || false,
            options: fieldConfig.options || null
          };
        }),
        listFields: model.admin.listFields || model.fields,
        searchFields: model.admin.searchFields || [],
        filters: model.admin.filters || []
      }));
      
      res.json({ models });
    });
  }
  
  /**
   * Serve admin UI
   */
  serveAdminUI() {
    // Serve static files
    const adminUIPath = path.join(process.cwd(), 'admin-ui', 'build');
    
    if (fs.existsSync(adminUIPath)) {
      this.router.use(express.static(adminUIPath));
      
      // Serve index.html for all routes (SPA support)
      this.router.get('*', (req, res) => {
        res.sendFile(path.join(adminUIPath, 'index.html'));
      });
    } else {
      logger.warn('Admin UI build directory not found. Admin UI will not be served.');
      
      // Serve a placeholder page
      this.router.get('/', (req, res) => {
        res.send(`
          <html>
            <head>
              <title>Admin Interface</title>
              <style>
                body { font-family: Arial, sans-serif; margin: 40px; line-height: 1.6; }
                h1 { color: #333; }
                .message { background: #f8f9fa; padding: 20px; border-radius: 5px; }
              </style>
            </head>
            <body>
              <h1>Admin Interface</h1>
              <div class="message">
                <p>The admin UI is not built yet. Please build the admin UI first.</p>
                <p>API endpoints are available at <a href="/admin/api">/admin/api</a></p>
                <p>Metadata is available at <a href="/admin/meta">/admin/meta</a></p>
              </div>
            </body>
          </html>
        `);
      });
    }
  }
}

module.exports = AdminInterfaceGenerator; 
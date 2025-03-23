require('dotenv').config();
const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const { ApolloServer } = require('apollo-server-express');
const http = require('http');
const socketIO = require('socket.io');
const path = require('path');

const logger = require('./core/utils/logger');
const { loadConfig } = require('./config');
const { setupRESTApi } = require('./core/api-generators/rest');
const { setupGraphQLSchema } = require('./core/api-generators/graphql');
const { setupWebSockets } = require('./core/api-generators/websocket');
const { setupAuthentication } = require('./core/auth');
const { connectDatabases } = require('./core/database');
const { setupHealthChecks } = require('./middleware/health');
const { setupRateLimiting } = require('./middleware/rate-limit');
const { generateReactSDK } = require('./core/sdk-generators/react');
const { setupGRPC } = require('./core/api-generators/grpc');
const CacheManager = require('./core/cache');
const pluginManager = require('./core/plugins');
const { httpLogger } = require('./core/utils/logger');
const { setupMonitoring } = require('./middleware/monitoring');
const TenantManager = require('./core/multi-tenant');
const { tenantContextMiddleware } = require('./middleware/tenant-context');
const eventManager = require('./core/events');
const aiServiceManager = require('./core/ai');
const AdminInterfaceGenerator = require('./core/admin');
const ValidationManager = require('./core/validation');
const I18nManager = require('./core/i18n');
const WorkflowEngine = require('./core/workflow');
const AuditManager = require('./core/audit');
const EdgeComputingManager = require('./core/edge');
const { SecurityAuditManager, SecurityScanner } = require('./core/security');

async function startServer() {
  // Load configuration
  const config = loadConfig();
  
  // Initialize Express app
  const app = express();
  
  // Apply middleware
  app.use(cors());
  app.use(helmet());
  app.use(express.json());
  
  // Connect to databases
  const connections = await connectDatabases(config.databases);
  
  // Setup health checks
  setupHealthChecks(app, connections);
  
  // Setup rate limiting if enabled
  if (config.security && config.security.rateLimit) {
    setupRateLimiting(app, config.security.rateLimit, connections.redis);
  }
  
  // Setup authentication
  setupAuthentication(app, config.auth);
  
  // Setup REST API if enabled
  if (config.api.rest.enabled) {
    setupRESTApi(app, config.api.rest);
  }
  
  // Setup GraphQL if enabled
  if (config.api.graphql.enabled) {
    const apolloServer = new ApolloServer({
      schema: setupGraphQLSchema(config.api.graphql),
      context: ({ req }) => ({ req })
    });
    await apolloServer.start();
    apolloServer.applyMiddleware({ app });
  }
  
  // Create HTTP server
  const server = http.createServer(app);
  
  // Setup WebSockets if enabled
  if (config.api.websocket.enabled) {
    const io = socketIO(server, {
      cors: {
        origin: config.security.cors.origin,
        methods: ["GET", "POST"]
      }
    });
    setupWebSockets(io, config.api.websocket);
  }
  
  // Generate SDKs if enabled
  if (config.sdkGeneration && config.sdkGeneration.enabled) {
    if (config.sdkGeneration.targets.includes('react')) {
      await generateReactSDK(config, './sdk/react');
    }
    // Add other SDK generators here
  }
  
  // Setup gRPC if enabled
  if (config.api.grpc && config.api.grpc.enabled) {
    setupGRPC(config.api.grpc);
  }
  
  // Setup cache manager if Redis is available
  let cacheManager = null;
  if (connections.redis) {
    cacheManager = new CacheManager(connections.redis, config.cache);
    logger.info('Cache manager initialized');
  }
  
  // Load plugins
  const pluginsDir = path.join(__dirname, 'plugins');
  pluginManager.loadPlugins(pluginsDir);
  
  // Execute beforeServerStart hooks
  await pluginManager.executeHooks('beforeServerStart', app, config);
  
  // Add plugin middleware
  app.use(pluginManager.createMiddleware());
  
  // Execute afterServerStart hooks
  await pluginManager.executeHooks('afterServerStart', server, config);
  
  // Setup HTTP logging
  app.use(httpLogger);
  
  // Setup monitoring
  setupMonitoring(app);
  
  // Setup multi-tenant support if enabled
  let tenantManager = null;
  if (config.multiTenant && config.multiTenant.enabled) {
    tenantManager = new TenantManager(config.multiTenant, connections);
    await tenantManager.initialize();
    
    // Add tenant identification middleware
    app.use(tenantManager.tenantMiddleware);
    
    // Add tenant context middleware
    app.use(tenantContextMiddleware(tenantManager));
    
    logger.info('Multi-tenant support initialized');
  }
  
  // Setup event manager if enabled
  if (config.events && config.events.enabled) {
    eventManager.config = config.events;
    eventManager.connections = connections;
    await eventManager.initialize();
    logger.info('Event manager initialized');
  }
  
  // Setup AI services if enabled
  if (config.ai && config.ai.enabled) {
    aiServiceManager.config = config.ai;
    await aiServiceManager.initialize();
    logger.info('AI Service Manager initialized');
  }
  
  // Setup admin interface if enabled
  if (config.admin && config.admin.enabled) {
    const adminGenerator = new AdminInterfaceGenerator(config.admin);
    await adminGenerator.initialize(app);
    logger.info('Admin interface initialized');
  }
  
  // Setup validation manager
  const validationManager = new ValidationManager(config.validation || {});
  app.locals.validationManager = validationManager;
  logger.info('Validation manager initialized');
  
  // Setup internationalization if enabled
  if (config.i18n && config.i18n.enabled) {
    const i18nManager = new I18nManager(config.i18n);
    await i18nManager.initialize();
    
    // Add i18n middleware
    app.use(i18nManager.getMiddleware());
    
    // Make i18n available to routes
    app.locals.i18n = i18nManager;
    
    logger.info('Internationalization initialized');
  }
  
  // Setup workflow engine if enabled
  if (config.workflow && config.workflow.enabled) {
    const workflowEngine = new WorkflowEngine(config.workflow, connections);
    await workflowEngine.initialize();
    
    // Make workflow engine available to routes
    app.locals.workflowEngine = workflowEngine;
    
    logger.info('Workflow engine initialized');
  }
  
  // Setup audit manager if enabled
  if (config.audit && config.audit.enabled) {
    const auditManager = new AuditManager(config.audit, connections);
    await auditManager.initialize();
    
    // Add audit middleware
    app.use(auditManager.middleware);
    
    // Make audit manager available to routes
    app.locals.auditManager = auditManager;
    
    logger.info('Audit manager initialized');
  }
  
  // Setup edge computing if enabled
  if (config.edge && config.edge.enabled) {
    const edgeManager = new EdgeComputingManager(config.edge);
    await edgeManager.initialize();
    
    // Make edge manager available to routes
    app.locals.edgeManager = edgeManager;
    
    // Setup edge API routes
    app.use('/api/edge', require('./routes/edge')(edgeManager));
    
    logger.info('Edge computing manager initialized');
  }
  
  // Setup security audit if enabled
  if (config.security && config.security.audit && config.security.audit.enabled) {
    const securityAuditManager = new SecurityAuditManager(config.security.audit, connections);
    await securityAuditManager.initialize();
    
    // Make security audit manager available to routes
    app.locals.securityAuditManager = securityAuditManager;
    
    // Add security audit middleware
    app.use(securityAuditManager.createMiddleware());
    
    logger.info('Security audit manager initialized');
  }
  
  // Setup security scanner if enabled
  if (config.security && config.security.scanner && config.security.scanner.enabled) {
    const securityScanner = new SecurityScanner(config.security.scanner);
    await securityScanner.initialize();
    
    // Make security scanner available to routes
    app.locals.securityScanner = securityScanner;
    
    // Add security scan endpoint
    app.post('/api/security/scan', authenticateJWT, async (req, res) => {
      try {
        const report = await securityScanner.runScan();
        res.json({ success: true, report });
      } catch (error) {
        res.status(500).json({ error: error.message });
      }
    });
    
    logger.info('Security scanner initialized');
  }
  
  // Start the server
  const PORT = process.env.PORT || 3000;
  server.listen(PORT, () => {
    logger.info(`Server running on port ${PORT}`);
    if (config.api.graphql.enabled) {
      logger.info(`GraphQL endpoint: http://localhost:${PORT}/graphql`);
    }
  });
  
  return server;
}

// Handle unhandled promise rejections
process.on('unhandledRejection', (err) => {
  logger.error('Unhandled Rejection:', err);
});

// Start the server
if (require.main === module) {
  startServer().catch(err => {
    logger.error('Failed to start server:', err);
    process.exit(1);
  });
}

module.exports = { startServer }; 
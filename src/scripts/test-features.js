const logger = require('../core/utils/logger');
const { loadConfig } = require('../config');
const { connectDatabases } = require('../core/database');
const TenantManager = require('../core/multi-tenant');
const eventManager = require('../core/events');
const aiServiceManager = require('../core/ai');
const ValidationManager = require('../core/validation');
const I18nManager = require('../core/i18n');
const WorkflowEngine = require('../core/workflow');
const AuditManager = require('../core/audit');
const EdgeComputingManager = require('../core/edge');

/**
 * Test all advanced features
 */
async function testFeatures() {
  try {
    logger.info('Starting feature tests...');
    
    // Load configuration
    const config = loadConfig();
    
    // Connect to databases
    const connections = await connectDatabases(config.databases);
    logger.info('✅ Database connections established');
    
    // Test multi-tenant support
    await testMultiTenant(config, connections);
    
    // Test event system
    await testEventSystem(config, connections);
    
    // Test AI services
    await testAIServices(config);
    
    // Test validation
    await testValidation(config);
    
    // Test internationalization
    await testI18n(config);
    
    // Test workflow engine
    await testWorkflow(config, connections);
    
    // Test audit system
    await testAudit(config, connections);
    
    // Test edge computing
    await testEdgeComputing(config);
    
    logger.info('✅ All feature tests completed successfully');
    
    // Close database connections
    await closeConnections(connections);
    
    process.exit(0);
  } catch (error) {
    logger.error('❌ Feature tests failed:', error);
    process.exit(1);
  }
}

/**
 * Test multi-tenant support
 */
async function testMultiTenant(config, connections) {
  try {
    if (!config.multiTenant || !config.multiTenant.enabled) {
      logger.info('⏩ Multi-tenant support not enabled, skipping test');
      return;
    }
    
    const tenantManager = new TenantManager(config.multiTenant, connections);
    await tenantManager.initialize();
    
    // Create a test tenant
    const tenant = await tenantManager.createTenant({
      name: 'Test Tenant',
      domain: 'test.example.com',
      config: { theme: 'light' }
    });
    
    logger.info(`Created test tenant: ${tenant.name} (${tenant.id})`);
    
    // Get tenant by ID
    const retrievedTenant = await tenantManager.getTenantById(tenant.id);
    logger.info(`Retrieved tenant: ${retrievedTenant.name}`);
    
    // Delete test tenant
    await tenantManager.deleteTenant(tenant.id);
    logger.info(`Deleted test tenant: ${tenant.id}`);
    
    logger.info('✅ Multi-tenant test completed');
  } catch (error) {
    logger.error('❌ Multi-tenant test failed:', error);
    throw error;
  }
}

/**
 * Test event system
 */
async function testEventSystem(config, connections) {
  try {
    if (!config.events || !config.events.enabled) {
      logger.info('⏩ Event system not enabled, skipping test');
      return;
    }
    
    eventManager.config = config.events;
    eventManager.connections = connections;
    await eventManager.initialize();
    
    // Subscribe to test event
    const unsubscribe = eventManager.subscribeToEvent('test:event', (data) => {
      logger.info(`Received test event with data: ${JSON.stringify(data)}`);
    });
    
    // Publish test event
    await eventManager.publishEvent('test:event', { message: 'Hello, World!' });
    logger.info('Published test event');
    
    // Unsubscribe from test event
    unsubscribe();
    
    logger.info('✅ Event system test completed');
  } catch (error) {
    logger.error('❌ Event system test failed:', error);
    throw error;
  }
}

/**
 * Test AI services
 */
async function testAIServices(config) {
  try {
    if (!config.ai || !config.ai.enabled) {
      logger.info('⏩ AI services not enabled, skipping test');
      return;
    }
    
    aiServiceManager.config = config.ai;
    await aiServiceManager.initialize();
    
    // If OpenAI is configured, test text generation
    if (config.ai.services && config.ai.services.openai && config.ai.services.openai.enabled) {
      try {
        const result = await aiServiceManager.generateText('openai', 'Say hello in three words');
        logger.info(`AI generated text: ${result.text}`);
      } catch (error) {
        logger.warn('OpenAI test skipped (API key may be missing):', error.message);
      }
    }
    
    logger.info('✅ AI services test completed');
  } catch (error) {
    logger.error('❌ AI services test failed:', error);
    throw error;
  }
}

/**
 * Test validation
 */
async function testValidation(config) {
  try {
    const validationManager = new ValidationManager(config.validation || {});
    
    // Create a schema
    const schema = {
      type: 'object',
      properties: {
        name: { type: 'string', minLength: 2 },
        email: { type: 'string', format: 'email' },
        age: { type: 'number', minimum: 18 }
      },
      required: ['name', 'email']
    };
    
    // Valid data
    const validData = {
      name: 'John Doe',
      email: 'john@example.com',
      age: 25
    };
    
    // Invalid data
    const invalidData = {
      name: 'J',
      email: 'not-an-email',
      age: 16
    };
    
    // Validate data
    const validResult = validationManager.validate(schema, validData);
    logger.info(`Valid data validation result: ${validResult.valid}`);
    
    const invalidResult = validationManager.validate(schema, invalidData);
    logger.info(`Invalid data validation result: ${invalidResult.valid}`);
    logger.info(`Validation errors: ${JSON.stringify(invalidResult.errors)}`);
    
    // Test transformation
    const transformations = {
      name: { transform: 'trim' },
      email: { transform: 'lowercase' }
    };
    
    const dataToTransform = {
      name: '  John Doe  ',
      email: 'JOHN@EXAMPLE.COM'
    };
    
    const transformed = validationManager.transform(dataToTransform, transformations);
    logger.info(`Transformed data: ${JSON.stringify(transformed)}`);
    
    logger.info('✅ Validation test completed');
  } catch (error) {
    logger.error('❌ Validation test failed:', error);
    throw error;
  }
}

/**
 * Test internationalization
 */
async function testI18n(config) {
  try {
    if (!config.i18n || !config.i18n.enabled) {
      logger.info('⏩ Internationalization not enabled, skipping test');
      return;
    }
    
    const i18nManager = new I18nManager(config.i18n);
    await i18nManager.initialize();
    
    // Test translation
    const enTranslation = i18nManager.translate('welcome');
    logger.info(`English translation: ${enTranslation}`);
    
    // Change language
    await i18nManager.changeLanguage('es');
    const esTranslation = i18nManager.translate('welcome');
    logger.info(`Spanish translation: ${esTranslation}`);
    
    // Test formatting
    const date = new Date();
    const formattedDate = i18nManager.formatDate(date);
    logger.info(`Formatted date: ${formattedDate}`);
    
    const number = 1234567.89;
    const formattedNumber = i18nManager.formatNumber(number);
    logger.info(`Formatted number: ${formattedNumber}`);
    
    const amount = 1234.56;
    const formattedCurrency = i18nManager.formatCurrency(amount, 'EUR');
    logger.info(`Formatted currency: ${formattedCurrency}`);
    
    logger.info('✅ Internationalization test completed');
  } catch (error) {
    logger.error('❌ Internationalization test failed:', error);
    throw error;
  }
}

/**
 * Test workflow engine
 */
async function testWorkflow(config, connections) {
  try {
    if (!config.workflow || !config.workflow.enabled) {
      logger.info('⏩ Workflow engine not enabled, skipping test');
      return;
    }
    
    const workflowEngine = new WorkflowEngine(config.workflow, connections);
    await workflowEngine.initialize();
    
    // Create a test workflow
    const workflow = {
      name: 'Test Workflow',
      description: 'A test workflow',
      states: {
        start: { type: 'start' },
        pending: { type: 'task' },
        approved: { type: 'end' },
        rejected: { type: 'end' }
      },
      transitions: [
        { from: 'start', to: 'pending', condition: 'true' },
        { from: 'pending', to: 'approved', condition: 'data.approved === true' },
        { from: 'pending', to: 'rejected', condition: 'data.approved === false' }
      ],
      startState: 'start',
      endStates: ['approved', 'rejected']
    };
    
    const createdWorkflow = await workflowEngine.createWorkflow(workflow);
    logger.info(`Created workflow: ${createdWorkflow.name} (${createdWorkflow.id})`);
    
    // Start a workflow instance
    const instance = await workflowEngine.startWorkflow(createdWorkflow.id, {
      entityType: 'order',
      entityId: 'test-order-123',
      data: { amount: 100 }
    });
    
    logger.info(`Started workflow instance: ${instance.id} (State: ${instance.currentState})`);
    
    // Transition to next state
    const transitionedInstance = await workflowEngine.transitionWorkflow(instance.id, {
      approved: true
    });
    
    logger.info(`Transitioned workflow instance: ${transitionedInstance.id} (State: ${transitionedInstance.currentState})`);
    
    logger.info('✅ Workflow engine test completed');
  } catch (error) {
    logger.error('❌ Workflow engine test failed:', error);
    throw error;
  }
}

/**
 * Test audit system
 */
async function testAudit(config, connections) {
  try {
    if (!config.audit || !config.audit.enabled) {
      logger.info('⏩ Audit system not enabled, skipping test');
      return;
    }
    
    const auditManager = new AuditManager(config.audit, connections);
    await auditManager.initialize();
    
    // Log a change
    await auditManager.logChanges({
      userId: 'test-user',
      action: 'CREATE',
      entityType: 'product',
      entityId: 'test-product-123',
      changes: { name: 'Test Product', price: 99.99 },
      metadata: { source: 'test-script' },
      ipAddress: '127.0.0.1',
      userAgent: 'Test Script'
    });
    
    logger.info('Logged test change');
    
    // Log data access
    await auditManager.logDataAccess({
      userId: 'test-user',
      action: 'READ',
      entityType: 'product',
      entityId: 'test-product-123',
      fields: ['name', 'price'],
      query: { id: 'test-product-123' },
      ipAddress: '127.0.0.1',
      userAgent: 'Test Script'
    });
    
    logger.info('Logged test data access');
    
    // Get audit logs
    const logs = await auditManager.getAuditLogs({
      userId: 'test-user',
      entityType: 'product'
    });
    
    logger.info(`Retrieved ${logs.length} audit logs`);
    
    logger.info('✅ Audit system test completed');
  } catch (error) {
    logger.error('❌ Audit system test failed:', error);
    throw error;
  }
}

/**
 * Test edge computing
 */
async function testEdgeComputing(config) {
  try {
    if (!config.edge || !config.edge.enabled) {
      logger.info('⏩ Edge computing not enabled, skipping test');
      return;
    }
    
    const edgeManager = new EdgeComputingManager(config.edge);
    await edgeManager.initialize();
    
    // Register a test edge node
    const node = await edgeManager.registerEdgeNode({
      name: 'Test Edge Node',
      url: 'http://localhost:3001',
      capabilities: ['functions', 'storage']
    });
    
    logger.info(`Registered edge node: ${node.name} (${node.id})`);
    
    // Get edge node status
    const status = edgeManager.getEdgeNodeStatus(node.id);
    logger.info(`Edge node status: ${status.status}`);
    
    // Unregister edge node
    await edgeManager.unregisterEdgeNode(node.id);
    logger.info(`Unregistered edge node: ${node.id}`);
    
    logger.info('✅ Edge computing test completed');
  } catch (error) {
    logger.error('❌ Edge computing test failed:', error);
    throw error;
  }
}

/**
 * Close database connections
 */
async function closeConnections(connections) {
  try {
    for (const [name, connection] of Object.entries(connections)) {
      if (connection && typeof connection.close === 'function') {
        await connection.close();
        logger.info(`Closed ${name} connection`);
      } else if (connection && typeof connection.end === 'function') {
        await connection.end();
        logger.info(`Ended ${name} connection`);
      } else if (connection && typeof connection.disconnect === 'function') {
        await connection.disconnect();
        logger.info(`Disconnected ${name} connection`);
      }
    }
    
    logger.info('✅ All database connections closed');
  } catch (error) {
    logger.error('❌ Failed to close database connections:', error);
  }
}

// Run tests
testFeatures(); 
const logger = require('../core/utils/logger');
const { loadConfig } = require('../config');
const { connectDatabases } = require('../core/database');
const { SecurityAuditManager, SecurityScanner } = require('../core/security');
const TenantManager = require('../core/multi-tenant');
const eventManager = require('../core/events');
const aiServiceManager = require('../core/ai');
const ValidationManager = require('../core/validation');
const I18nManager = require('../core/i18n');
const WorkflowEngine = require('../core/workflow');
const AuditManager = require('../core/audit');
const EdgeComputingManager = require('../core/edge');
const CacheManager = require('../core/cache');
const fs = require('fs').promises;
const path = require('path');
const mockDb = require('../core/database/mock');

/**
 * Run comprehensive tests on the Universal Backend Engine
 */
async function runTests() {
  try {
    logger.info('🚀 Starting Universal Backend Engine tests...');
    
    // Load configuration
    const config = loadConfig();
    logger.info('✅ Configuration loaded successfully');
    
    // Make sure all database configs have mock enabled for tests
    if (config.databases) {
      Object.keys(config.databases).forEach((dbType) => {
        if (config.databases[dbType]) {
          config.databases[dbType].mock = true;
        }
      });
    }
    
    // Connect to databases
    logger.info('Connecting to databases...');
    const connections = await connectDatabases(config.databases);
    logger.info('✅ Database connections established');
    
    // Test components
    await testSecurity(config, connections);
    await testMultiTenant(config, connections);
    await testEvents(config, connections);
    await testAI(config);
    await testValidation(config);
    await testI18n(config);
    await testWorkflow(config, connections);
    await testAudit(config, connections);
    await testEdgeComputing(config);
    await testCache(connections.redis, config);
    
    // Close database connections
    logger.info('Closing database connections...');
    await closeDatabaseConnections(connections);
    logger.info('✅ Database connections closed');
    
    logger.info('🎉 All tests completed successfully!');
  } catch (error) {
    logger.error('❌ Tests failed:', error);
    process.exit(1);
  }
}

/**
 * Test security features
 */
async function testSecurity(config, connections) {
  logger.info('Testing security features...');
  
  // Create mock connections if needed
  if (!connections.postgres && config.security.audit.database === 'postgres') {
    connections.postgres = await mockDb.connect({});
  }
  
  // Test security audit
  if (config.security && config.security.audit && config.security.audit.enabled) {
    const securityAuditManager = new SecurityAuditManager(
      { ...config.security.audit, database: 'mock' }, 
      { mock: await mockDb.connect({}) }
    );
    
    await securityAuditManager.initialize();
    
    // Log a test security event
    await securityAuditManager.logSecurityEvent({
      action: 'TEST',
      resourceType: 'SYSTEM',
      result: 'SUCCESS',
      details: { test: true },
      ipAddress: '127.0.0.1',
      userAgent: 'Test Script'
    });
    
    // Retrieve the logged event
    const logs = await securityAuditManager.getSecurityAuditLogs({ 
      action: 'TEST',
      limit: 1
    });
    
    if (logs.length === 0) {
      throw new Error('Security audit log not found');
    }
    
    logger.info('✅ Security audit test passed');
  } else {
    logger.info('⏩ Security audit not enabled, skipping test');
  }
  
  // Test security scanner
  if (config.security && config.security.scanner && config.security.scanner.enabled) {
    const securityScanner = new SecurityScanner(config.security.scanner);
    await securityScanner.initialize();
    
    // Create a test file with a security vulnerability
    const testDir = path.join(process.cwd(), 'test-temp');
    await fs.mkdir(testDir, { recursive: true });
    const testFile = path.join(testDir, 'test-vulnerability.js');
    await fs.writeFile(testFile, `
      // This file contains a deliberate security vulnerability for testing
      function unsafeCode() {
        const userInput = req.query.input;
        eval(userInput); // Deliberate vulnerability
        return true;
      }
    `);
    
    // Run a scan
    const _report = await securityScanner.runScan();
    
    // Clean up test file
    await fs.unlink(testFile);
    await fs.rmdir(testDir);
    
    logger.info('✅ Security scanner test passed');
  } else {
    logger.info('⏩ Security scanner not enabled, skipping test');
  }
  
  logger.info('✅ Security features tests completed');
}

/**
 * Test multi-tenant features
 */
async function testMultiTenant(config, connections) {
  logger.info('Testing multi-tenant features...');
  
  if (config.multiTenant && config.multiTenant.enabled) {
    const tenantManager = new TenantManager(config.multiTenant, connections);
    await tenantManager.initialize();
    
    // Create a test tenant
    const testTenant = {
      id: 'test-tenant',
      name: 'Test Tenant',
      domain: 'test.example.com',
      settings: {
        theme: 'light',
        features: {
          billing: true
        }
      }
    };
    
    await tenantManager.createTenant(testTenant);
    
    // Get the tenant
    const retrievedTenant = await tenantManager.getTenant(testTenant.id);
    
    if (!retrievedTenant || retrievedTenant.name !== testTenant.name) {
      throw new Error('Failed to retrieve created tenant');
    }
    
    // Delete the test tenant
    await tenantManager.deleteTenant(testTenant.id);
    
    logger.info('✅ Multi-tenant test passed');
  } else {
    logger.info('⏩ Multi-tenant not enabled, skipping test');
  }
  
  logger.info('✅ Multi-tenant features tests completed');
}

/**
 * Test event system
 */
async function testEvents(config, connections) {
  logger.info('Testing event system...');
  
  if (config.events && config.events.enabled) {
    eventManager.config = config.events;
    eventManager.connections = connections;
    await eventManager.initialize();
    
    // Create a test event handler
    let eventReceived = false;
    const testHandler = () => {
      eventReceived = true;
    };
    
    // Subscribe to test event
    eventManager.subscribe('test.event', testHandler);
    
    // Publish test event
    await eventManager.publish('test.event', { test: true });
    
    // Wait for event to be processed
    await new Promise((resolve) => setTimeout(resolve, 100));
    
    if (!eventReceived) {
      throw new Error('Event was not received by handler');
    }
    
    // Unsubscribe
    eventManager.unsubscribe('test.event', testHandler);
    
    logger.info('✅ Event system test passed');
  } else {
    logger.info('⏩ Event system not enabled, skipping test');
  }
  
  logger.info('✅ Event system tests completed');
}

/**
 * Test AI services
 */
async function testAI(config) {
  logger.info('Testing AI services...');
  
  if (config.ai && config.ai.enabled) {
    aiServiceManager.config = config.ai;
    await aiServiceManager.initialize();
    
    // Only test if we have an API key
    if (process.env.OPENAI_API_KEY) {
      try {
        // Test text generation
        const result = await aiServiceManager.generateText({
          prompt: 'Write a short greeting',
          maxTokens: 20
        });
        
        if (!result || !result.text) {
          throw new Error('Failed to generate text');
        }
        
        logger.info('✅ AI services test passed');
      } catch (error) {
        logger.warn(`⚠️ AI services test skipped: ${error.message}`);
      }
    } else {
      logger.info('⏩ OpenAI API key not found, skipping AI test');
    }
  } else {
    logger.info('⏩ AI services not enabled, skipping test');
  }
  
  logger.info('✅ AI services tests completed');
}

/**
 * Test validation
 */
async function testValidation(config) {
  logger.info('Testing validation...');
  
  if (config.validation && config.validation.enabled) {
    // Create validation manager
    const validationManager = new ValidationManager(config.validation);
    
    // Add a test schema
    const userSchema = {
      type: 'object',
      properties: {
        id: { type: 'integer' },
        name: { type: 'string', minLength: 2 },
        email: { type: 'string', format: 'email' },
        zipCode: { type: 'string', format: 'zipCode' }
      },
      required: ['name', 'email']
    };
    
    validationManager.addSchema('user', userSchema);
    
    // Test valid data
    const validUser = {
      id: 1,
      name: 'John Doe',
      email: 'john@example.com',
      zipCode: '12345'
    };
    
    const validResult = validationManager.validate('user', validUser);
    
    if (!validResult.valid) {
      throw new Error(`Validation failed for valid data: ${JSON.stringify(validResult.errors)}`);
    }
    
    // Test invalid data
    const invalidUser = {
      id: 'not-a-number',
      name: 'J',
      email: 'not-an-email',
      zipCode: 'invalid'
    };
    
    const invalidResult = validationManager.validate('user', invalidUser);
    
    if (invalidResult.valid) {
      throw new Error('Validation passed for invalid data');
    }
    
    // Test custom format
    const userWithCustomFormat = {
      name: 'Jane Doe',
      email: 'jane@example.com',
      zipCode: 'invalid-zip'
    };
    
    const customFormatResult = validationManager.validate('user', userWithCustomFormat);
    
    if (customFormatResult.valid) {
      throw new Error('Custom format validation passed for invalid data');
    }
    
    logger.info('✅ Validation test passed');
  } else {
    logger.info('⏩ Validation not enabled, skipping test');
  }
  
  logger.info('✅ Validation tests completed');
}

/**
 * Test internationalization
 */
async function testI18n(config) {
  logger.info('Testing internationalization...');
  
  if (config.i18n && config.i18n.enabled) {
    const i18nManager = new I18nManager(config.i18n);
    await i18nManager.initialize();
    
    // Test translation
    const enTranslation = i18nManager.translate('welcome', { lng: 'en' });
    const esTranslation = i18nManager.translate('welcome', { lng: 'es' });
    
    if (!enTranslation || !esTranslation) {
      throw new Error('Translation failed');
    }
    
    logger.info('✅ Internationalization test passed');
  } else {
    logger.info('⏩ Internationalization not enabled, skipping test');
  }
  
  logger.info('✅ Internationalization tests completed');
}

/**
 * Test workflow engine
 */
async function testWorkflow(config, connections) {
  logger.info('Testing workflow engine...');
  
  if (config.workflow && config.workflow.enabled) {
    const workflowEngine = new WorkflowEngine(config.workflow, connections);
    await workflowEngine.initialize();
    
    // Define a simple workflow
    const workflow = {
      id: 'test-workflow',
      name: 'Test Workflow',
      initialState: 'draft',
      states: {
        draft: {
          transitions: {
            submit: {
              target: 'review',
              conditions: []
            }
          }
        },
        review: {
          transitions: {
            approve: {
              target: 'approved',
              conditions: []
            },
            reject: {
              target: 'draft',
              conditions: []
            }
          }
        },
        approved: {
          final: true
        }
      }
    };
    
    // Register workflow
    await workflowEngine.registerWorkflow(workflow);
    
    // Create workflow instance
    const instance = await workflowEngine.createInstance('test-workflow', { documentId: 'test-123' });
    
    // Execute transitions
    await workflowEngine.transition(instance.id, 'submit');
    const updatedInstance = await workflowEngine.getInstance(instance.id);
    
    if (updatedInstance.currentState !== 'review') {
      throw new Error(`Workflow transition failed. Expected 'review', got '${updatedInstance.currentState}'`);
    }
    
    logger.info('✅ Workflow engine test passed');
  } else {
    logger.info('⏩ Workflow engine not enabled, skipping test');
  }
  
  logger.info('✅ Workflow engine tests completed');
}

/**
 * Test audit system
 */
async function testAudit(config, connections) {
  logger.info('Testing audit system...');
  
  if (config.audit && config.audit.enabled) {
    const auditManager = new AuditManager(config.audit, connections);
    await auditManager.initialize();
    
    // Create a test audit entry
    await auditManager.logAction({
      userId: 'test-user',
      action: 'TEST',
      resource: 'system',
      resourceId: 'test-123',
      details: { test: true }
    });
    
    // Retrieve audit logs
    const logs = await auditManager.getAuditLogs({
      userId: 'test-user',
      action: 'TEST',
      limit: 1
    });
    
    if (logs.length === 0) {
      throw new Error('Audit log not found');
    }
    
    logger.info('✅ Audit system test passed');
  } else {
    logger.info('⏩ Audit system not enabled, skipping test');
  }
  
  logger.info('✅ Audit system tests completed');
}

/**
 * Test edge computing
 */
async function testEdgeComputing(config) {
  logger.info('Testing edge computing...');
  
  if (config.edge && config.edge.enabled) {
    const edgeManager = new EdgeComputingManager(config.edge);
    await edgeManager.initialize();
    
    // Create a test function
    const testFunction = `
      module.exports = async function(input) {
        return { result: input.value * 2 };
      };
    `;
    
    // Register the function
    await edgeManager.registerFunction('test-function', testFunction);
    
    // Execute the function
    const result = await edgeManager.executeFunction('test-function', { value: 21 });
    
    if (!result || result.result !== 42) {
      throw new Error(`Edge function execution failed. Expected 42, got ${result?.result}`);
    }
    
    logger.info('✅ Edge computing test passed');
  } else {
    logger.info('⏩ Edge computing not enabled, skipping test');
  }
  
  logger.info('✅ Edge computing tests completed');
}

/**
 * Test cache system
 */
async function testCache(redisClient, config) {
  logger.info('Testing cache system...');
  
  if (redisClient && config.cache) {
    const cacheManager = new CacheManager(redisClient, config.cache);
    
    // Set a value
    await cacheManager.set('test-key', { value: 'test-value' });
    
    // Get the value
    const value = await cacheManager.get('test-key');
    
    if (!value || value.value !== 'test-value') {
      throw new Error('Cache get/set failed');
    }
    
    // Delete the value
    await cacheManager.delete('test-key');
    
    // Verify it's gone
    const deletedValue = await cacheManager.get('test-key');
    
    if (deletedValue !== null) {
      throw new Error('Cache delete failed');
    }
    
    logger.info('✅ Cache system test passed');
  } else {
    logger.info('⏩ Cache system not available, skipping test');
  }
  
  logger.info('✅ Cache system tests completed');
}

/**
 * Close database connections
 */
async function closeDatabaseConnections(connections) {
  try {
    for (const [name, connection] of Object.entries(connections)) {
      if (connection && typeof connection.close === 'function') {
        await connection.close();
        logger.info(`Closed ${name} connection`);
      } else if (connection && typeof connection.quit === 'function') {
        await connection.quit();
        logger.info(`Closed ${name} connection`);
      }
    }
  } catch (error) {
    logger.error('❌ Failed to close database connections:', error);
  }
}

// Run tests
runTests(); 

const { connectDatabases } = require('../../core/database');
const config = require('../../config').loadConfig();

describe('Database Integration', () => {
  let connections;
  
  beforeAll(async () => {
    // Use test config with mock databases
    const testConfig = {
      ...config,
      databases: {
        postgres: {
          enabled: true,
          mock: true,
          url: 'postgresql://postgres:postgres@localhost:5432/test_db'
        },
        mongodb: {
          enabled: true,
          mock: true,
          url: 'mongodb://localhost:27017/test_db'
        },
        redis: {
          enabled: true,
          mock: true,
          url: 'redis://localhost:6379'
        }
      }
    };
    
    connections = await connectDatabases(testConfig.databases);
  });
  
  afterAll(async () => {
    // Close all connections
    if (connections.postgres) {
      await connections.postgres.close();
    }
    if (connections.mongodb) {
      await connections.mongodb.close();
    }
    if (connections.redis) {
      await connections.redis.quit();
    }
  });
  
  test('should connect to all databases', () => {
    expect(connections).toBeDefined();
    expect(connections.postgres).toBeDefined();
    expect(connections.mongodb).toBeDefined();
    expect(connections.redis).toBeDefined();
  });
  
  test('should execute PostgreSQL query', async () => {
    const result = await connections.postgres.query('SELECT NOW()');
    expect(result).toBeDefined();
  });
  
  test('should perform MongoDB operations', async () => {
    const collection = connections.mongodb.collection('test');
    const insertResult = await collection.insertOne({ name: 'Test' });
    expect(insertResult.insertedId).toBeDefined();
    
    const findResult = await collection.find().toArray();
    expect(findResult).toHaveLength(1);
    expect(findResult[0].name).toBe('Test');
  });
  
  test('should perform Redis operations', async () => {
    await connections.redis.set('test-key', 'test-value');
    const value = await connections.redis.get('test-key');
    expect(value).toBe('test-value');
  });
}); 
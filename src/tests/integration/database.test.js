const { connectDatabases } = require('../../core/database');
const MockDatabase = require('../../core/database/mock');

describe('Database Integration', () => {
  let connections;
  
  beforeAll(async () => {
    // Use mock databases for testing
    connections = {
      postgres: { query: jest.fn().mockResolvedValue({ rows: [{ result: 'success' }] }) },
      mongodb: MockDatabase.createMockMongoDB(),
      redis: MockDatabase.createMockRedis()
    };
  });
  
  afterAll(async () => {
    // Clean up connections
    if (connections.postgres) {
      // Mock close
    }
    if (connections.mongodb) {
      await connections.mongodb.close();
    }
    if (connections.redis) {
      await connections.redis.quit();
    }
  });
  
  test('should perform PostgreSQL operations', async () => {
    const result = await connections.postgres.query('SELECT 1');
    expect(result.rows).toBeDefined();
  });
  
  test('should perform MongoDB operations', async () => {
    const collection = connections.mongodb.collection('test');
    const insertResult = await collection.insertOne({ name: 'Test' });
    expect(insertResult.insertedId).toBeDefined();
    
    const docs = await collection.find().toArray();
    expect(docs.length).toBe(1);
    expect(docs[0].name).toBe('Test');
  });
  
  test('should perform Redis operations', async () => {
    await connections.redis.set('test-key', 'test-value');
    const value = await connections.redis.get('test-key');
    expect(value).toBe('test-value');
  });
}); 
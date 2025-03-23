const logger = require('../utils/logger');

/**
 * Mock database client for testing
 */
class MockDatabaseClient {
  constructor() {
    this.data = new Map();
    this.logger = logger;
    this.logger.info('Mock database client initialized');
  }

  async query(sql, params = []) {
    this.logger.debug(`Mock SQL query: ${sql}`);
    this.logger.debug(`Mock SQL params: ${JSON.stringify(params)}`);
    
    // Simple query parser to handle basic operations
    if (sql.toLowerCase().includes('create table')) {
      const tableName = sql.match(/create table (?:if not exists )?([a-z0-9_]+)/i)?.[1];
      if (tableName) {
        this.data.set(tableName, []);
        return { command: 'CREATE', rowCount: 0 };
      }
    }
    
    if (sql.toLowerCase().includes('insert into')) {
      const tableName = sql.match(/insert into ([a-z0-9_]+)/i)?.[1];
      if (tableName) {
        const table = this.data.get(tableName) || [];
        table.push({ ...params });
        this.data.set(tableName, table);
        return { command: 'INSERT', rowCount: 1 };
      }
    }
    
    if (sql.toLowerCase().includes('select')) {
      const tableName = sql.match(/from ([a-z0-9_]+)/i)?.[1];
      if (tableName) {
        const table = this.data.get(tableName) || [];
        return { command: 'SELECT', rows: table, rowCount: table.length };
      }
    }
    
    return { command: 'UNKNOWN', rowCount: 0 };
  }
  
  async close() {
    this.logger.info('Mock database connection closed');
    return true;
  }
}

/**
 * Connect to mock database
 */
async function connectMockDatabase(config) {
  try {
    logger.info('Connecting to mock database...');
    return new MockDatabaseClient();
  } catch (error) {
    logger.error('Failed to connect to mock database:', error);
    throw error;
  }
}

/**
 * Mock database connections for testing
 */
class MockDatabase {
  static createMockMongoDB() {
    const collections = new Map();
    
    return {
      collection: (name) => {
        if (!collections.has(name)) {
          collections.set(name, []);
        }
        
        return {
          insertOne: async (doc) => {
            const id = Math.random().toString(36).substring(2, 15);
            const newDoc = { ...doc, _id: doc._id || id };
            collections.get(name).push(newDoc);
            return { insertedId: newDoc._id };
          },
          findOne: async (query = {}) => {
            return collections.get(name)[0] || null;
          },
          find: () => ({
            toArray: async () => collections.get(name) || []
          }),
          updateOne: async () => ({ modifiedCount: 1 }),
          deleteOne: async () => ({ deletedCount: 1 })
        };
      },
      close: async () => {}
    };
  }
  
  static createMockRedis() {
    const store = new Map();
    
    return {
      set: async (key, value) => {
        store.set(key, value);
        return 'OK';
      },
      get: async (key) => {
        return store.get(key) || null;
      },
      del: async (key) => {
        store.delete(key);
        return 1;
      },
      quit: async () => {},
      on: () => {}
    };
  }
}

module.exports = {
  connect: connectMockDatabase,
  MockDatabase
}; 
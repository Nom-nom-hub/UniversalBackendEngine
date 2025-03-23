const logger = require('../../utils/logger');

/**
 * PostgreSQL Event Store
 */
class PostgresEventStore {
  constructor(dbClient) {
    this.db = dbClient;
  }
  
  /**
   * Initialize event store
   */
  async initialize() {
    try {
      // Create events table if it doesn't exist
      await this.db.$executeRaw`
        CREATE TABLE IF NOT EXISTS events (
          id SERIAL PRIMARY KEY,
          type VARCHAR(255) NOT NULL,
          data JSONB NOT NULL,
          metadata JSONB,
          created_at TIMESTAMP NOT NULL DEFAULT NOW()
        );
        
        CREATE INDEX IF NOT EXISTS idx_events_type ON events (type);
        CREATE INDEX IF NOT EXISTS idx_events_created_at ON events (created_at);
      `;
      
      return true;
    } catch (error) {
      logger.error('Failed to initialize PostgreSQL event store:', error);
      throw error;
    }
  }
  
  /**
   * Store an event
   */
  async storeEvent(event) {
    try {
      const { type, data, metadata } = event;
      
      await this.db.$executeRaw`
        INSERT INTO events (type, data, metadata, created_at)
        VALUES (${type}, ${JSON.stringify(data)}, ${JSON.stringify(metadata)}, NOW())
      `;
      
      return true;
    } catch (error) {
      logger.error('Failed to store event:', error);
      throw error;
    }
  }
  
  /**
   * Get events
   */
  async getEvents(options = {}) {
    try {
      const {
        types,
        startDate,
        endDate,
        limit = 100,
        offset = 0,
        sortDirection = 'ASC'
      } = options;
      
      let query = `
        SELECT * FROM events
        WHERE 1=1
      `;
      
      const params = [];
      
      // Filter by types
      if (types && types.length > 0) {
        query += ` AND type IN (${types.map((_, i) => `$${params.length + i + 1}`).join(', ')})`;
        params.push(...types);
      }
      
      // Filter by date range
      if (startDate) {
        query += ` AND created_at >= $${params.length + 1}`;
        params.push(startDate);
      }
      
      if (endDate) {
        query += ` AND created_at <= $${params.length + 1}`;
        params.push(endDate);
      }
      
      // Add sorting
      query += ` ORDER BY created_at ${sortDirection === 'DESC' ? 'DESC' : 'ASC'}`;
      
      // Add pagination
      query += ` LIMIT $${params.length + 1} OFFSET $${params.length + 2}`;
      params.push(limit, offset);
      
      const result = await this.db.$queryRaw(query, ...params);
      
      return result;
    } catch (error) {
      logger.error('Failed to get events:', error);
      throw error;
    }
  }
}

module.exports = {
  PostgresEventStore
}; 
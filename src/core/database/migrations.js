const fs = require('fs');
const path = require('path');
const { getDatabaseClient } = require('./index');
const logger = require('../utils/logger');

/**
 * Run database migrations
 */
async function runMigrations(connections, config) {
  try {
    logger.info('Running database migrations...');
    
    // Create migrations table if it doesn't exist
    await createMigrationsTable(connections, config);
    
    // Get applied migrations
    const appliedMigrations = await getAppliedMigrations(connections, config);
    
    // Get all migration files
    const migrationsDir = path.join(__dirname, '../../migrations');
    if (!fs.existsSync(migrationsDir)) {
      fs.mkdirSync(migrationsDir, { recursive: true });
      logger.info('Created migrations directory');
      return;
    }
    
    // Get all migration files
    const migrationFiles = fs.readdirSync(migrationsDir)
      .filter(file => file.endsWith('.js'))
      .sort();
    
    // Run pending migrations
    for (const file of migrationFiles) {
      const migrationName = path.basename(file, '.js');
      
      // Skip if already applied
      if (appliedMigrations.includes(migrationName)) {
        logger.debug(`Migration ${migrationName} already applied, skipping`);
        continue;
      }
      
      // Load migration
      const migration = require(path.join(migrationsDir, file));
      
      // Run migration
      logger.info(`Running migration: ${migrationName}`);
      
      // Get the appropriate database client
      const dbClient = getDatabaseClient(migration.database, connections);
      
      // Run the migration
      await migration.up(dbClient);
      
      // Record migration
      await recordMigration(connections, config, migrationName);
      
      logger.info(`Migration ${migrationName} completed successfully`);
    }
    
    logger.info('All migrations completed successfully');
  } catch (error) {
    logger.error('Failed to run migrations:', error);
    throw error;
  }
}

/**
 * Create migrations table if it doesn't exist
 */
async function createMigrationsTable(connections, config) {
  const dbType = config.migrations.database || 'postgres';
  const dbClient = getDatabaseClient(dbType, connections);
  
  switch (dbType) {
    case 'postgres':
      await dbClient.$executeRaw`
        CREATE TABLE IF NOT EXISTS migrations (
          id SERIAL PRIMARY KEY,
          name VARCHAR(255) NOT NULL,
          applied_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
        )
      `;
      break;
    case 'mysql':
      await dbClient.query(`
        CREATE TABLE IF NOT EXISTS migrations (
          id INT AUTO_INCREMENT PRIMARY KEY,
          name VARCHAR(255) NOT NULL,
          applied_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
        )
      `);
      break;
    case 'mongodb':
      const db = dbClient.connection.db;
      const collections = await db.listCollections({ name: 'migrations' }).toArray();
      
      if (collections.length === 0) {
        await db.createCollection('migrations');
        await db.collection('migrations').createIndex({ name: 1 }, { unique: true });
      }
      break;
    default:
      throw new Error(`Unsupported database type for migrations: ${dbType}`);
  }
}

/**
 * Get applied migrations
 */
async function getAppliedMigrations(connections, config) {
  const dbType = config.migrations.database || 'postgres';
  const dbClient = getDatabaseClient(dbType, connections);
  
  switch (dbType) {
    case 'postgres':
      const result = await dbClient.$queryRaw`SELECT name FROM migrations ORDER BY id`;
      return result.map(row => row.name);
    case 'mysql':
      const [rows] = await dbClient.query('SELECT name FROM migrations ORDER BY id');
      return rows.map(row => row.name);
    case 'mongodb':
      const db = dbClient.connection.db;
      const migrations = await db.collection('migrations').find({}, { projection: { name: 1, _id: 0 } }).toArray();
      return migrations.map(m => m.name);
    default:
      throw new Error(`Unsupported database type for migrations: ${dbType}`);
  }
}

/**
 * Record a migration
 */
async function recordMigration(connections, config, migrationName) {
  const dbType = config.migrations.database || 'postgres';
  const dbClient = getDatabaseClient(dbType, connections);
  
  switch (dbType) {
    case 'postgres':
      await dbClient.$executeRaw`INSERT INTO migrations (name) VALUES (${migrationName})`;
      break;
    case 'mysql':
      await dbClient.query('INSERT INTO migrations (name) VALUES (?)', [migrationName]);
      break;
    case 'mongodb':
      const db = dbClient.connection.db;
      await db.collection('migrations').insertOne({
        name: migrationName,
        applied_at: new Date()
      });
      break;
    default:
      throw new Error(`Unsupported database type for migrations: ${dbType}`);
  }
}

/**
 * Create a new migration file
 */
function createMigration(name, database = 'postgres') {
  try {
    const timestamp = new Date().toISOString().replace(/[-:\.T]/g, '').slice(0, 14);
    const fileName = `${timestamp}_${name}.js`;
    const migrationsDir = path.join(__dirname, '../../migrations');
    
    // Create migrations directory if it doesn't exist
    if (!fs.existsSync(migrationsDir)) {
      fs.mkdirSync(migrationsDir, { recursive: true });
    }
    
    // Create migration file
    const filePath = path.join(migrationsDir, fileName);
    const template = `
/**
 * Migration: ${name}
 * Database: ${database}
 */
module.exports = {
  database: '${database}',
  
  async up(db) {
    // Write your migration code here
    
  },
  
  async down(db) {
    // Write code to revert the migration here
    
  }
};
`;
    
    fs.writeFileSync(filePath, template);
    logger.info(`Created migration file: ${fileName}`);
    
    return fileName;
  } catch (error) {
    logger.error('Failed to create migration:', error);
    throw error;
  }
}

module.exports = {
  runMigrations,
  createMigration
}; 
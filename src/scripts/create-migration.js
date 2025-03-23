const { createMigration } = require('../core/database/migrations');
const logger = require('../core/utils/logger');

async function main() {
  try {
    // Get migration name from command line arguments
    const args = process.argv.slice(2);
    
    if (args.length === 0) {
      logger.error('Migration name is required');
      console.log('Usage: npm run create-migration <name> [database]');
      process.exit(1);
    }
    
    const name = args[0];
    const database = args[1] || 'postgres';
    
    // Create migration
    const fileName = createMigration(name, database);
    logger.info(`Migration created: ${fileName}`);
  } catch (error) {
    logger.error('Failed to create migration:', error);
    process.exit(1);
  }
}

// Run the script
main(); 
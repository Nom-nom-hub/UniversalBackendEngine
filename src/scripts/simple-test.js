const logger = require('../core/utils/logger');

/**
 * Simple test to verify logger is working
 */
async function simpleTest() {
  try {
    logger.info('Starting simple test...');
    logger.debug('This is a debug message');
    logger.warn('This is a warning message');
    logger.error('This is an error message');
    logger.info('Simple test completed successfully');
  } catch (error) {
    console.error('Test failed:', error);
  }
}

// Run the simple test
simpleTest(); 
const path = require('path');
const { loadConfig } = require('../config');
const { generateReactSDK } = require('../core/sdk-generators/react');
const { generateVueSDK } = require('../core/sdk-generators/vue');
const logger = require('../core/utils/logger');

async function main() {
  try {
    // Load configuration
    const config = loadConfig();
    
    // Check if SDK generation is enabled
    if (!config.sdkGeneration || !config.sdkGeneration.enabled) {
      logger.error('SDK generation is not enabled in the configuration');
      process.exit(1);
    }
    
    // Generate SDKs for each target
    const { targets } = config.sdkGeneration;
    
    if (targets.includes('react')) {
      const outputDir = path.join(process.cwd(), 'sdk', 'react');
      await generateReactSDK(config, outputDir);
      logger.info(`React SDK generated in ${outputDir}`);
    }
    
    if (targets.includes('vue')) {
      const outputDir = path.join(process.cwd(), 'sdk', 'vue');
      await generateVueSDK(config, outputDir);
      logger.info(`Vue.js SDK generated in ${outputDir}`);
    }
    
    // Add other SDK generators here
    
    logger.info('SDK generation completed successfully');
  } catch (error) {
    logger.error('Failed to generate SDKs:', error);
    process.exit(1);
  }
}

// Run the script
main(); 
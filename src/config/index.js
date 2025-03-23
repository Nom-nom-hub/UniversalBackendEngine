const fs = require('fs');
const path = require('path');
const logger = require('../core/utils/logger');

// Default configuration
const defaultConfig = {
  api: {
    rest: {
      enabled: true,
      basePath: '/api',
      version: 'v1',
      documentation: true
    },
    graphql: {
      enabled: true,
      introspection: true,
      playground: process.env.NODE_ENV !== 'production'
    },
    websocket: {
      enabled: true,
      path: '/ws'
    },
    grpc: {
      enabled: false,
      port: 50051
    }
  },
  databases: {
    default: 'postgres',
    postgres: {
      enabled: true,
      host: process.env.POSTGRES_HOST || 'localhost',
      port: process.env.POSTGRES_PORT || 5432,
      username: process.env.POSTGRES_USER || 'postgres',
      password: process.env.POSTGRES_PASSWORD || 'postgres',
      database: process.env.POSTGRES_DB || 'universal_backend'
    },
    mysql: {
      enabled: false,
      host: process.env.MYSQL_HOST || 'localhost',
      port: process.env.MYSQL_PORT || 3306,
      username: process.env.MYSQL_USER || 'root',
      password: process.env.MYSQL_PASSWORD || 'root',
      database: process.env.MYSQL_DB || 'universal_backend'
    },
    mongodb: {
      enabled: false,
      uri: process.env.MONGODB_URI || 'mongodb://localhost:27017/universal_backend'
    },
    redis: {
      enabled: true,
      host: process.env.REDIS_HOST || 'localhost',
      port: process.env.REDIS_PORT || 6379,
      password: process.env.REDIS_PASSWORD || ''
    }
  },
  auth: {
    jwt: {
      enabled: true,
      secret: process.env.JWT_SECRET || 'your-secret-key',
      expiresIn: '1d'
    },
    oauth2: {
      enabled: false,
      providers: {
        google: {
          clientId: process.env.GOOGLE_CLIENT_ID,
          clientSecret: process.env.GOOGLE_CLIENT_SECRET,
          callbackURL: '/auth/google/callback'
        }
      }
    },
    apiKey: {
      enabled: true,
      header: 'X-API-Key'
    }
  },
  security: {
    rateLimit: {
      enabled: true,
      windowMs: 15 * 60 * 1000, // 15 minutes
      max: 100 // limit each IP to 100 requests per windowMs
    },
    cors: {
      origin: process.env.CORS_ORIGIN || '*'
    }
  },
  sdkGeneration: {
    enabled: true,
    targets: ['react', 'nextjs', 'flutter', 'unity', 'vue']
  },
  logging: {
    level: process.env.LOG_LEVEL || 'info',
    format: 'json'
  }
};

/**
 * Loads and merges configuration from various sources
 * Priority (highest to lowest):
 * 1. Environment variables
 * 2. Config file (if exists)
 * 3. Default config
 */
function loadConfig() {
  let config = { ...defaultConfig };
  
  // Try to load config from file
  const configPath = process.env.CONFIG_PATH || path.join(process.cwd(), 'config.json');
  try {
    if (fs.existsSync(configPath)) {
      const fileConfig = JSON.parse(fs.readFileSync(configPath, 'utf8'));
      config = deepMerge(config, fileConfig);
      logger.info(`Loaded configuration from ${configPath}`);
    }
  } catch (error) {
    logger.warn(`Failed to load configuration from ${configPath}: ${error.message}`);
  }
  
  // Override with environment variables
  // For example, DATABASES_POSTGRES_HOST would override config.databases.postgres.host
  Object.entries(process.env).forEach(([key, value]) => {
    if (key.startsWith('UBE_')) {
      const configPath = key.substring(4).toLowerCase().split('_');
      setNestedValue(config, configPath, value);
    }
  });
  
  return config;
}

/**
 * Deep merge two objects
 */
function deepMerge(target, source) {
  const output = { ...target };
  
  if (isObject(target) && isObject(source)) {
    Object.keys(source).forEach(key => {
      if (isObject(source[key])) {
        if (!(key in target)) {
          Object.assign(output, { [key]: source[key] });
        } else {
          output[key] = deepMerge(target[key], source[key]);
        }
      } else {
        Object.assign(output, { [key]: source[key] });
      }
    });
  }
  
  return output;
}

/**
 * Check if value is an object
 */
function isObject(item) {
  return (item && typeof item === 'object' && !Array.isArray(item));
}

/**
 * Set a nested value in an object based on path array
 */
function setNestedValue(obj, path, value) {
  if (path.length === 1) {
    obj[path[0]] = parseConfigValue(value);
    return;
  }
  
  if (!obj[path[0]]) {
    obj[path[0]] = {};
  }
  
  setNestedValue(obj[path[0]], path.slice(1), value);
}

/**
 * Parse config value to appropriate type
 */
function parseConfigValue(value) {
  if (value.toLowerCase() === 'true') return true;
  if (value.toLowerCase() === 'false') return false;
  if (value.toLowerCase() === 'null') return null;
  if (!isNaN(value) && value.trim() !== '') return Number(value);
  return value;
}

module.exports = {
  loadConfig,
  defaultConfig
}; 
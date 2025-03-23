# Configuration

Universal Backend Engine is highly configurable to meet your specific requirements. This guide explains the configuration options available.

## Configuration File

The configuration file is a JavaScript object that defines how your backend should behave. You can create it as a separate file and import it:

```javascript
// config.js
module.exports = {
  server: {
    port: 3000,
    host: 'localhost',
    cors: {
      enabled: true,
      origin: '*'
    }
  },
  // ... other configuration options
};
```

## Environment Variables

You can use environment variables to override configuration values:

```javascript
module.exports = {
  server: {
    port: process.env.PORT || 3000,
    host: process.env.HOST || 'localhost'
  },
  databases: {
    postgres: {
      url: process.env.POSTGRES_URL || 'postgresql://user:password@localhost:5432/mydb'
    }
  },
  auth: {
    jwt: {
      secret: process.env.JWT_SECRET || 'your-secret-key'
    }
  }
};
```

## Configuration Options

### Server Configuration

```javascript
{
  server: {
    port: 3000,
    host: 'localhost',
    cors: {
      enabled: true,
      origin: '*',
      methods: ['GET', 'POST', 'PUT', 'DELETE'],
      allowedHeaders: ['Content-Type', 'Authorization']
    },
    helmet: {
      enabled: true
    },
    compression: {
      enabled: true
    },
    bodyParser: {
      json: {
        limit: '1mb'
      },
      urlencoded: {
        extended: true,
        limit: '1mb'
      }
    },
    static: {
      enabled: true,
      path: './public'
    }
  }
}
```

### Database Configuration

```javascript
{
  databases: {
    postgres: {
      enabled: true,
      url: 'postgresql://user:password@localhost:5432/mydb',
      poolSize: 10,
      ssl: false
    },
    mongodb: {
      enabled: true,
      url: 'mongodb://localhost:27017/mydb',
      options: {
        useNewUrlParser: true,
        useUnifiedTopology: true
      }
    },
    redis: {
      enabled: true,
      url: 'redis://localhost:6379',
      password: null,
      db: 0
    },
    mysql: {
      enabled: false,
      url: 'mysql://user:password@localhost:3306/mydb',
      connectionLimit: 10
    }
  }
}
```

### API Configuration

```javascript
{
  apis: {
    rest: {
      enabled: true,
      prefix: '/api',
      version: 'v1',
      documentation: true,
      rateLimiting: {
        enabled: true,
        windowMs: 15 * 60 * 1000, // 15 minutes
        max: 100 // limit each IP to 100 requests per windowMs
      }
    },
    graphql: {
      enabled: true,
      path: '/graphql',
      playground: true,
      introspection: true
    },
    websocket: {
      enabled: true,
      path: '/ws'
    },
    grpc: {
      enabled: false,
      port: 50051,
      protoDir: './proto'
    }
  }
}
```

### Authentication Configuration

```javascript
{
  auth: {
    jwt: {
      enabled: true,
      secret: 'your-secret-key',
      expiresIn: '1d',
      algorithm: 'HS256'
    },
    oauth: {
      enabled: false,
      providers: {
        google: {
          clientId: 'your-client-id',
          clientSecret: 'your-client-secret',
          callbackURL: 'http://localhost:3000/auth/google/callback'
        }
      }
    },
    apiKey: {
      enabled: false,
      header: 'X-API-Key'
    }
  }
}
```

### Validation Configuration

```javascript
{
  validation: {
    enabled: true,
    ajv: {
      allErrors: true,
      removeAdditional: 'all'
    },
    customFormats: {
      zipCode: {
        type: 'string',
        validate: (code) => /^\d{5}(-\d{4})?$/.test(code)
      }
    }
  }
}
```

### Internationalization Configuration

```javascript
{
  i18n: {
    enabled: true,
    defaultLanguage: 'en',
    supportedLanguages: ['en', 'es', 'fr'],
    namespaces: ['common', 'errors', 'validation'],
    resourcesPath: './locales'
  }
}
```

### Monitoring Configuration

```javascript
{
  monitoring: {
    enabled: true,
    prometheus: {
      enabled: true,
      path: '/metrics'
    },
    health: {
      enabled: true,
      path: '/health'
    },
    logging: {
      level: 'info',
      format: 'json',
      transports: ['console', 'file'],
      filename: './logs/app.log'
    }
  }
}
```

## Loading Configuration

You can load the configuration in your application:

```javascript
const { loadConfig } = require('universal-backend-engine');

// Load configuration from default location (./config.js)
const config = loadConfig();

// Or specify a custom path
const customConfig = loadConfig('./path/to/config.js');

// Or provide configuration object directly
const directConfig = loadConfig({
  server: {
    port: 3000
  }
});
```

## Environment-Specific Configuration

You can create environment-specific configuration files:

```javascript
// config/index.js
const development = require('./development');
const production = require('./production');
const test = require('./test');

const env = process.env.NODE_ENV || 'development';

const configs = {
  development,
  production,
  test
};

module.exports = configs[env];
```

This allows you to have different configurations for development, production, and testing environments.
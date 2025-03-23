module.exports = {
  databases: {
    postgres: {
      enabled: true,
      mock: true,
      url: 'postgresql://postgres:postgres@localhost:5432/test_db'
    },
    redis: {
      enabled: true,
      mock: true,
      url: 'redis://localhost:6379'
    },
    mongodb: {
      enabled: true,
      mock: true,
      url: 'mongodb://localhost:27017/test_db'
    }
  },
  api: {
    rest: {
      enabled: true,
      prefix: '/api'
    },
    graphql: {
      enabled: true
    },
    websocket: {
      enabled: true
    },
    grpc: {
      enabled: false
    }
  },
  auth: {
    jwt: {
      secret: process.env.JWT_SECRET || 'test-secret-key',
      expiresIn: '1d'
    }
  },
  security: {
    cors: {
      origin: '*'
    },
    rateLimit: {
      enabled: true,
      max: 100,
      windowMs: 60000
    },
    audit: {
      enabled: true,
      database: 'mock'
    },
    scanner: {
      enabled: true,
      scanOnStartup: false,
      scanDependencies: false,
      scanCode: true,
      scanConfigurations: false,
      saveReports: false
    }
  },
  multiTenant: {
    enabled: false
  },
  events: {
    enabled: false
  },
  ai: {
    enabled: false
  },
  admin: {
    enabled: true,
    basePath: '/admin'
  },
  validation: {
    enabled: true,
    removeAdditional: 'all',
    customFormats: {
      zipCode: {
        type: 'string',
        validate: (code) => /^\d{5}(-\d{4})?$/.test(code)
      }
    }
  },
  i18n: {
    enabled: false
  },
  workflow: {
    enabled: false
  },
  audit: {
    enabled: false
  },
  edge: {
    enabled: false
  },
  cache: {
    enabled: false
  }
}; 
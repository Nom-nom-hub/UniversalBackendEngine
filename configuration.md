# Configuration

Universal Backend Engine can be configured through a variety of methods to suit your needs.

## Configuration Methods

1. **Environment Variables**: Set environment variables to configure the engine
2. **Configuration File**: Create a `config.json` file in your project root
3. **Programmatic Configuration**: Pass configuration options when creating the server

## Basic Configuration Options

```javascript
{
  // Server configuration
  "server": {
    "port": 3000,
    "host": "0.0.0.0",
    "cors": {
      "origin": "*",
      "methods": ["GET", "POST", "PUT", "DELETE"]
    }
  },
  
  // Database configuration
  "databases": {
    "postgres": {
      "url": "postgresql://user:password@localhost:5432/mydb",
      "poolSize": 10
    },
    "mongodb": {
      "url": "mongodb://localhost:27017/mydb"
    },
    "redis": {
      "url": "redis://localhost:6379"
    }
  },
  
  // API configuration
  "apis": {
    "rest": {
      "enabled": true,
      "prefix": "/api"
    },
    "graphql": {
      "enabled": true,
      "path": "/graphql"
    },
    "websocket": {
      "enabled": true
    },
    "grpc": {
      "enabled": false,
      "port": 50051
    }
  }
}
```

## Advanced Configuration

For advanced configuration options, see the following sections:

- [Security Configuration](security.md)
- [Multi-tenant Configuration](multi-tenancy.md)
- [Workflow Configuration](workflow.md)
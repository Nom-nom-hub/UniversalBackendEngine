# Configuration

Universal Backend Engine is highly configurable to adapt to different project requirements.

## Configuration Methods

There are three ways to configure the engine:

1. **Environment Variables**: Using `.env` file or system environment variables
2. **Configuration Files**: Using `config.json` in the root directory
3. **Programmatic Configuration**: Directly in code

## Core Configuration Options

### API Configuration

```javascript
{
  "api": {
    "rest": {
      "enabled": true,
      "basePath": "/api",
      "version": "v1",
      "documentation": true
    },
    "graphql": {
      "enabled": true,
      "introspection": true,
      "playground": true
    },
    "websocket": {
      "enabled": true,
      "path": "/ws"
    },
    "grpc": {
      "enabled": false,
      "port": 50051
    }
  }
}
```

### Database Configuration

```javascript
{
  "database": {
    "default": "postgres",
    "postgres": {
      "host": "localhost",
      "port": 5432,
      "user": "postgres",
      "password": "postgres",
      "database": "universal_backend"
    },
    "mongodb": {
      "uri": "mongodb://localhost:27017/universal_backend"
    }
  }
}
```

### Authentication Configuration

```javascript
{
  "auth": {
    "jwt": {
      "secret": "your-secret-key",
      "expiresIn": "1d"
    },
    "oauth": {
      "enabled": false,
      "providers": []
    },
    "apiKey": {
      "enabled": true
    }
  }
}
```

### SDK Generation Configuration

```javascript
{
  "sdkGeneration": {
    "enabled": true,
    "targets": ["react", "nextjs", "flutter", "unity", "vue"]
  }
}
```

## Environment Variables

Key environment variables include:

| Variable | Description | Default |
|----------|-------------|---------|
| `PORT` | Server port | `3000` |
| `NODE_ENV` | Environment (development/production) | `development` |
| `JWT_SECRET` | Secret for JWT tokens | - |
| `POSTGRES_HOST` | PostgreSQL host | `localhost` |
| `POSTGRES_PORT` | PostgreSQL port | `5432` |
| `POSTGRES_USER` | PostgreSQL username | `postgres` |
| `POSTGRES_PASSWORD` | PostgreSQL password | - |
| `POSTGRES_DB` | PostgreSQL database name | `universal_backend` |
| `REDIS_HOST` | Redis host | `localhost` |
| `REDIS_PORT` | Redis port | `6379` |
| `LOG_LEVEL` | Logging level | `info` |

## Loading Configuration

The engine loads configuration in the following order:

1. Default configuration
2. Configuration file (`config.json`)
3. Environment variables (overrides previous settings)

```javascript
// Example of loading configuration
const config = loadConfig();
```

## Advanced Configuration

For advanced use cases, you can extend the configuration by creating custom configuration files in the `src/config` directory.
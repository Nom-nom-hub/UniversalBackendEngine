# Getting Started with Universal Backend Engine

This guide will help you get started with Universal Backend Engine, a powerful and flexible backend framework.

## Prerequisites

Before you begin, ensure you have the following installed:

- Node.js 16+
- PostgreSQL, MySQL, or MongoDB
- Redis (optional, for caching)
- Docker (optional, for containerized deployment)

## Installation

```bash
npm install universal-backend-engine
```

## Basic Usage

### 1. Create a Configuration File

Create a `config.js` file in your project:

```javascript
module.exports = {
  server: {
    port: 3000,
    host: 'localhost'
  },
  databases: {
    postgres: {
      enabled: true,
      url: 'postgresql://user:password@localhost:5432/mydb'
    }
  },
  apis: {
    rest: {
      enabled: true,
      prefix: '/api'
    },
    graphql: {
      enabled: true
    }
  },
  auth: {
    jwt: {
      secret: process.env.JWT_SECRET || 'your-secret-key',
      expiresIn: '1d'
    }
  }
};
```

### 2. Create Your Main File

Create an `index.js` file:

```javascript
const { startServer } = require('universal-backend-engine');
const config = require('./config');

async function main() {
  try {
    const server = await startServer(config);
    console.log(`Server running at http://${config.server.host}:${config.server.port}`);
  } catch (error) {
    console.error('Failed to start server:', error);
    process.exit(1);
  }
}

main();
```

### 3. Define Your Routes

Create a `routes` directory and add your route files:

```javascript
// routes/users.js
const { router } = require('universal-backend-engine');

router.get('/users', async (req, res) => {
  const users = await req.db.postgres.query('SELECT * FROM users');
  res.json(users.rows);
});

router.get('/users/:id', async (req, res) => {
  const { id } = req.params;
  const result = await req.db.postgres.query('SELECT * FROM users WHERE id = $1', [id]);
  
  if (result.rows.length === 0) {
    return res.status(404).json({ error: 'User not found' });
  }
  
  res.json(result.rows[0]);
});

module.exports = router;
```

### 4. Start the Server

```bash
node index.js
```

## Configuration

See the [Configuration](configuration.md) page for detailed configuration options.

## Next Steps

- Learn about [Configuration](configuration.md)
- Explore [Database Integration](database-integration.md)
- Understand [API Generation](api-generation.md)
- Discover [SDK Generation](sdk-generation.md)
# Getting Started with Universal Backend Engine

This guide will help you set up and start using the Universal Backend Engine.

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

## Basic Setup

Create a new file called `index.js` with the following content:

```javascript
const { createServer } = require('universal-backend-engine');

// Create a new server instance
const server = createServer({
  port: 3000,
  databases: {
    postgres: {
      url: process.env.DATABASE_URL || 'postgresql://postgres:postgres@localhost:5432/mydb'
    }
  },
  apis: ['rest', 'graphql']
});

// Start the server
server.start().then(() => {
  console.log('Server started on port 3000');
});
```

## Configuration

See the [Configuration](configuration.md) page for detailed configuration options.

## Next Steps

- Learn about [API Generation](api-generation.md)
- Explore [Database Integration](database-integration.md)
- Discover [Advanced Features](advanced-features.md)
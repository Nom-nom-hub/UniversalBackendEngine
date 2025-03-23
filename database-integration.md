# Database Integration

Universal Backend Engine supports multiple database systems and provides an adaptive layer for seamless integration.

## Supported Databases

- PostgreSQL
- MySQL
- MongoDB

## Configuration

Configure your database connections in the configuration:

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
    },
    "mysql": {
      "host": "localhost",
      "port": 3306,
      "user": "root",
      "password": "password",
      "database": "universal_backend"
    }
  }
}
```

## Database Connection

The engine automatically connects to configured databases on startup:

```javascript
// src/core/database/index.js
async function connectDatabases(config) {
  const { default: defaultDb, ...databases } = config.database;
  
  // Connect to each configured database
  for (const [name, dbConfig] of Object.entries(databases)) {
    if (typeof dbConfig === 'object') {
      await connectToDatabase(name, dbConfig);
    }
  }
}
```

## Models

Define your data models to work with the database:

```javascript
// src/models/user.js
module.exports = {
  name: 'User',
  fields: ['id', 'name', 'email', 'password', 'createdAt', 'updatedAt'],
  database: 'postgres', // Specify which database to use
  schema: {
    id: { type: 'uuid', primaryKey: true, defaultValue: 'uuid_generate_v4()' },
    name: { type: 'string', required: true },
    email: { type: 'string', required: true, unique: true },
    password: { type: 'string', required: true },
    createdAt: { type: 'timestamp', defaultValue: 'CURRENT_TIMESTAMP' },
    updatedAt: { type: 'timestamp', defaultValue: 'CURRENT_TIMESTAMP' }
  },
  // GraphQL schema definition
  graphql: {
    typeDefs: `
      type User {
        id: ID!
        name: String!
        email: String!
        createdAt: String!
        updatedAt: String!
      }
      
      input UserInput {
        name: String!
        email: String!
        password: String!
      }
      
      extend type Query {
        users: [User!]!
        user(id: ID!): User
      }
      
      extend type Mutation {
        createUser(input: UserInput!): User!
        updateUser(id: ID!, input: UserInput!): User!
        deleteUser(id: ID!): Boolean!
      }
    `,
    resolvers: {
      // Resolver implementations
    }
  }
}
```

## Query Builder

The engine provides a unified query builder interface for different database types:

```javascript
// Example of using the query builder
const { createQueryBuilder } = require('../core/database/query-builder');

async function getUsersByRole(role) {
  const qb = createQueryBuilder('users');
  
  return qb
    .select(['id', 'name', 'email'])
    .where('role', '=', role)
    .orderBy('name', 'ASC')
    .limit(10)
    .execute();
}
```

## Migrations

Database migrations are supported for schema changes:

```javascript
// migrations/20230101000000_create_users_table.js
module.exports = {
  database: 'postgres',
  up: async (client) => {
    await client.query(`
      CREATE TABLE users (
        id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
        name VARCHAR(255) NOT NULL,
        email VARCHAR(255) NOT NULL UNIQUE,
        password VARCHAR(255) NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);
  },
  down: async (client) => {
    await client.query('DROP TABLE users');
  }
};
```

Run migrations using the CLI:

```bash
npm run migrate
```

## Multi-Tenancy

The engine supports multi-tenant database configurations:

- Separate databases per tenant
- Separate schemas per tenant
- Shared database with tenant ID column

Configure multi-tenancy in your configuration:

```javascript
{
  "multiTenant": {
    "enabled": true,
    "databaseStrategy": "schema", // "separate", "schema", or "column"
    "tenantIdField": "tenant_id" // For column strategy
  }
}
```

## Transactions

Database transactions are supported for atomic operations:

```javascript
const { getTransaction } = require('../core/database');

async function transferFunds(fromAccountId, toAccountId, amount) {
  const transaction = await getTransaction();
  
  try {
    // Start transaction
    await transaction.begin();
    
    // Perform operations
    await transaction.query(
      'UPDATE accounts SET balance = balance - $1 WHERE id = $2',
      [amount, fromAccountId]
    );
    
    await transaction.query(
      'UPDATE accounts SET balance = balance + $1 WHERE id = $2',
      [amount, toAccountId]
    );
    
    // Commit transaction
    await transaction.commit();
    
    return true;
  } catch (error) {
    // Rollback on error
    await transaction.rollback();
    throw error;
  }
}
```

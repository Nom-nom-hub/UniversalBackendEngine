# Database Integration

Universal Backend Engine supports multiple database types out of the box, making it easy to work with different data storage solutions based on your project requirements.

## Supported Databases

- **PostgreSQL**: A powerful, open-source object-relational database system
- **MongoDB**: A document-oriented NoSQL database
- **Redis**: An in-memory data structure store, used as a database, cache, and message broker
- **MySQL**: A popular open-source relational database

## Configuration

You can configure database connections in your configuration file:

```javascript
{
  "databases": {
    "postgres": {
      "enabled": true,
      "url": "postgresql://user:password@localhost:5432/mydb",
      "poolSize": 10
    },
    "mongodb": {
      "enabled": true,
      "url": "mongodb://localhost:27017/mydb"
    },
    "redis": {
      "enabled": true,
      "url": "redis://localhost:6379"
    },
    "mysql": {
      "enabled": false,
      "url": "mysql://user:password@localhost:3306/mydb"
    }
  }
}
```

## Using Databases in Your Application

### PostgreSQL Example

```javascript
const { db } = require('universal-backend-engine');

async function getUserById(id) {
  const result = await db.postgres.query(
    'SELECT * FROM users WHERE id = $1',
    [id]
  );
  return result.rows[0];
}
```

### MongoDB Example

```javascript
const { db } = require('universal-backend-engine');

async function createProduct(product) {
  const collection = db.mongodb.collection('products');
  const result = await collection.insertOne(product);
  return result.insertedId;
}
```

### Redis Example

```javascript
const { db } = require('universal-backend-engine');

async function cacheUserData(userId, userData) {
  await db.redis.set(`user:${userId}`, JSON.stringify(userData), 'EX', 3600);
}

async function getCachedUserData(userId) {
  const data = await db.redis.get(`user:${userId}`);
  return data ? JSON.parse(data) : null;
}
```

## Migrations

Universal Backend Engine includes a built-in migration system to help you manage database schema changes:

```bash
# Create a new migration
npm run create-migration -- "add_users_table"

# Run migrations
npm run migrate
```

## Multi-Database Transactions

For complex operations that span multiple databases, you can use the transaction manager:

```javascript
const { transaction } = require('universal-backend-engine');

async function transferUserData(userId) {
  await transaction.run(async (tx) => {
    // Get user from PostgreSQL
    const user = await tx.postgres.query('SELECT * FROM users WHERE id = $1', [userId]);
    
    // Store in MongoDB
    await tx.mongodb.collection('users').insertOne(user.rows[0]);
    
    // Update cache in Redis
    await tx.redis.set(`user:${userId}`, JSON.stringify(user.rows[0]), 'EX', 3600);
    
    // If any operation fails, all will be rolled back (when supported)
  });
}
```

## Database Adapters

Universal Backend Engine uses adapters to normalize the interface for different database types. You can create custom adapters for additional database systems by implementing the adapter interface.

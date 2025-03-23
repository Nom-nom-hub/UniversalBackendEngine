# API Generation

Universal Backend Engine supports multiple API types, allowing you to expose your services through different protocols based on your application needs.

## Supported API Types

- **REST API**: Traditional HTTP-based API with JSON responses
- **GraphQL**: Query language for your API with a single endpoint
- **WebSocket**: Real-time bidirectional communication
- **gRPC**: High-performance RPC framework

## Configuration

Configure your APIs in the configuration file:

```javascript
{
  "apis": {
    "rest": {
      "enabled": true,
      "prefix": "/api",
      "version": "v1",
      "documentation": true
    },
    "graphql": {
      "enabled": true,
      "path": "/graphql",
      "playground": true,
      "introspection": true
    },
    "websocket": {
      "enabled": true,
      "path": "/ws"
    },
    "grpc": {
      "enabled": false,
      "port": 50051,
      "protoDir": "./proto"
    }
  }
}
```

## REST API

### Creating REST Endpoints

Define your REST endpoints using the route definition system:

```javascript
// src/routes/users.js
const { router } = require('universal-backend-engine');

// Get all users
router.get('/users', async (req, res) => {
  const users = await req.db.postgres.query('SELECT * FROM users');
  res.json(users.rows);
});

// Get user by ID
router.get('/users/:id', async (req, res) => {
  const { id } = req.params;
  const result = await req.db.postgres.query('SELECT * FROM users WHERE id = $1', [id]);
  
  if (result.rows.length === 0) {
    return res.status(404).json({ error: 'User not found' });
  }
  
  res.json(result.rows[0]);
});

// Create a new user
router.post('/users', async (req, res) => {
  const { username, email, password } = req.body;
  
  // Validate input
  if (!username || !email || !password) {
    return res.status(400).json({ error: 'Missing required fields' });
  }
  
  // Insert user
  const result = await req.db.postgres.query(
    'INSERT INTO users (username, email, password) VALUES ($1, $2, $3) RETURNING *',
    [username, email, password]
  );
  
  res.status(201).json(result.rows[0]);
});

module.exports = router;
```

### API Documentation

REST APIs automatically generate OpenAPI/Swagger documentation, accessible at `/api/docs`.

## GraphQL API

### Defining GraphQL Schema

Define your GraphQL schema and resolvers:

```javascript
// src/graphql/schema.js
const { gql } = require('universal-backend-engine');

const typeDefs = gql`
  type User {
    id: ID!
    username: String!
    email: String!
    createdAt: String!
  }
  
  type Query {
    users: [User]
    user(id: ID!): User
  }
  
  type Mutation {
    createUser(username: String!, email: String!, password: String!): User
  }
`;

const resolvers = {
  Query: {
    users: async (_, __, { db }) => {
      const result = await db.postgres.query('SELECT * FROM users');
      return result.rows;
    },
    user: async (_, { id }, { db }) => {
      const result = await db.postgres.query('SELECT * FROM users WHERE id = $1', [id]);
      return result.rows[0] || null;
    }
  },
  Mutation: {
    createUser: async (_, { username, email, password }, { db }) => {
      const result = await db.postgres.query(
        'INSERT INTO users (username, email, password) VALUES ($1, $2, $3) RETURNING *',
        [username, email, password]
      );
      return result.rows[0];
    }
  }
};

module.exports = { typeDefs, resolvers };
```

### GraphQL Playground

When enabled, the GraphQL Playground is available at `/graphql`.

## WebSocket API

### Creating WebSocket Handlers

Define WebSocket event handlers:

```javascript
// src/websocket/handlers.js
const { websocket } = require('universal-backend-engine');

// Handle connection
websocket.on('connection', (socket) => {
  console.log('Client connected:', socket.id);
  
  // Handle chat messages
  socket.on('chat:message', async (data) => {
    // Save message to database
    await socket.db.postgres.query(
      'INSERT INTO messages (user_id, content) VALUES ($1, $2)',
      [data.userId, data.content]
    );
    
    // Broadcast to all clients
    websocket.emit('chat:message', {
      userId: data.userId,
      username: data.username,
      content: data.content,
      timestamp: new Date().toISOString()
    });
  });
  
  // Handle disconnection
  socket.on('disconnect', () => {
    console.log('Client disconnected:', socket.id);
  });
});

module.exports = websocket;
```

## gRPC API

### Defining gRPC Services

Define your gRPC services using Protocol Buffers:

```protobuf
// proto/user_service.proto
syntax = "proto3";

package userservice;

service UserService {
  rpc GetUser (GetUserRequest) returns (User);
  rpc ListUsers (ListUsersRequest) returns (ListUsersResponse);
  rpc CreateUser (CreateUserRequest) returns (User);
}

message GetUserRequest {
  string id = 1;
}

message ListUsersRequest {
  int32 limit = 1;
  int32 offset = 2;
}

message ListUsersResponse {
  repeated User users = 1;
  int32 total = 2;
}

message CreateUserRequest {
  string username = 1;
  string email = 2;
  string password = 3;
}

message User {
  string id = 1;
  string username = 2;
  string email = 3;
  string created_at = 4;
}
```

### Implementing gRPC Services

Implement the service handlers:

```javascript
// src/grpc/user_service.js
const { db } = require('universal-backend-engine');

const userService = {
  getUser: async (call, callback) => {
    try {
      const { id } = call.request;
      const result = await db.postgres.query('SELECT * FROM users WHERE id = $1', [id]);
      
      if (result.rows.length === 0) {
        return callback(new Error('User not found'));
      }
      
      callback(null, {
        id: result.rows[0].id,
        username: result.rows[0].username,
        email: result.rows[0].email,
        created_at: result.rows[0].created_at.toISOString()
      });
    } catch (error) {
      callback(error);
    }
  },
  
  listUsers: async (call, callback) => {
    try {
      const { limit = 10, offset = 0 } = call.request;
      
      const result = await db.postgres.query(
        'SELECT * FROM users LIMIT $1 OFFSET $2',
        [limit, offset]
      );
      
      const countResult = await db.postgres.query('SELECT COUNT(*) FROM users');
      
      callback(null, {
        users: result.rows.map(user => ({
          id: user.id,
          username: user.username,
          email: user.email,
          created_at: user.created_at.toISOString()
        })),
        total: parseInt(countResult.rows[0].count)
      });
    } catch (error) {
      callback(error);
    }
  },
  
  createUser: async (call, callback) => {
    try {
      const { username, email, password } = call.request;
      
      const result = await db.postgres.query(
        'INSERT INTO users (username, email, password) VALUES ($1, $2, $3) RETURNING *',
        [username, email, password]
      );
      
      callback(null, {
        id: result.rows[0].id,
        username: result.rows[0].username,
        email: result.rows[0].email,
        created_at: result.rows[0].created_at.toISOString()
      });
    } catch (error) {
      callback(error);
    }
  }
};

module.exports = userService;
```

## API Versioning

Universal Backend Engine supports API versioning to maintain backward compatibility:

```javascript
// For REST APIs
router.get('/v1/users', handlersV1.getUsers);
router.get('/v2/users', handlersV2.getUsers);

// For GraphQL, you can use schema stitching
const schemaV1 = makeExecutableSchema({ typeDefs: typeDefsV1, resolvers: resolversV1 });
const schemaV2 = makeExecutableSchema({ typeDefs: typeDefsV2, resolvers: resolversV2 });

// For WebSocket, you can namespace events
socket.on('v1:chat:message', handlersV1.chatMessage);
socket.on('v2:chat:message', handlersV2.chatMessage);
```

## API Security

All APIs support various security mechanisms:

- Authentication (JWT, OAuth, API Keys)
- Authorization (Role-based, Permission-based)
- Rate limiting
- CORS configuration
- Input validation

See the [Security Configuration](security.md) documentation for more details.
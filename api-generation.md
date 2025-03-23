# API Generation

Universal Backend Engine can dynamically generate multiple API types from your data models.

## Supported API Types

- **REST API**: RESTful endpoints with Swagger documentation
- **GraphQL API**: GraphQL schema with resolvers
- **WebSocket API**: Real-time communication
- **gRPC API**: High-performance RPC framework

## REST API

### Configuration

```javascript
{
  "api": {
    "rest": {
      "enabled": true,
      "basePath": "/api",
      "version": "v1",
      "documentation": true
    }
  }
}
```

### Automatic Route Generation

The engine automatically generates REST endpoints for your models:

- `GET /{model}` - List all resources
- `GET /{model}/:id` - Get a specific resource
- `POST /{model}` - Create a new resource
- `PUT /{model}/:id` - Update a resource
- `DELETE /{model}/:id` - Delete a resource

### Custom Routes

You can define custom routes in your model:

```javascript
// Example model with custom routes
module.exports = {
  name: 'User',
  // Standard CRUD routes
  routes: {
    getAll: async (req, res) => { /* ... */ },
    getById: async (req, res) => { /* ... */ },
    create: async (req, res) => { /* ... */ },
    update: async (req, res) => { /* ... */ },
    delete: async (req, res) => { /* ... */ },
    // Custom routes
    custom: [
      {
        method: 'GET',
        path: '/search',
        handler: async (req, res) => { /* ... */ }
      }
    ]
  }
};
```

### Middleware Support

You can apply middleware to specific routes:

```javascript
module.exports = {
  name: 'User',
  routes: { /* ... */ },
  middlewares: {
    all: [authMiddleware],
    getAll: [paginationMiddleware],
    create: [validationMiddleware]
  }
};
```

### API Documentation

When enabled, Swagger documentation is automatically generated and available at:

```
/api/v1/docs
```

## GraphQL API

### Configuration

```javascript
{
  "api": {
    "graphql": {
      "enabled": true,
      "introspection": true,
      "playground": true
    }
  }
}
```

### Schema Generation

The engine generates GraphQL schema from your models:

```javascript
// Example model with GraphQL schema
module.exports = {
  name: 'User',
  graphql: {
    typeDefs: `
      type User {
        id: ID!
        name: String!
        email: String!
        createdAt: String
      }
      
      extend type Query {
        users: [User]
        user(id: ID!): User
      }
      
      extend type Mutation {
        createUser(name: String!, email: String!): User
        updateUser(id: ID!, name: String, email: String): User
        deleteUser(id: ID!): Boolean
      }
    `,
    resolvers: {
      Query: {
        users: async () => { /* ... */ },
        user: async (_, { id }) => { /* ... */ }
      },
      Mutation: {
        createUser: async (_, { name, email }) => { /* ... */ },
        updateUser: async (_, { id, ...data }) => { /* ... */ },
        deleteUser: async (_, { id }) => { /* ... */ }
      }
    }
  }
};
```

## WebSocket API

### Configuration

```javascript
{
  "api": {
    "websocket": {
      "enabled": true,
      "path": "/ws"
    }
  }
}
```

### Event Handling

```javascript
// Example WebSocket event handlers
module.exports = {
  name: 'Chat',
  websocket: {
    events: {
      'message:send': async (socket, data) => {
        // Process message
        const message = await saveMessage(data);
        
        // Broadcast to room
        socket.to(data.roomId).emit('message:received', message);
      },
      'room:join': (socket, { roomId }) => {
        socket.join(roomId);
        socket.emit('room:joined', { roomId });
      }
    }
  }
};
```

## gRPC API

### Configuration

```javascript
{
  "api": {
    "grpc": {
      "enabled": true,
      "port": 50051
    }
  }
}
```

### Proto File Definition

Create proto files in the `src/protos` directory:

```protobuf
// Example user.proto
syntax = "proto3";

package user;

service UserService {
  rpc GetUser (GetUserRequest) returns (User);
  rpc ListUsers (ListUsersRequest) returns (ListUsersResponse);
  rpc CreateUser (CreateUserRequest) returns (User);
  rpc UpdateUser (UpdateUserRequest) returns (User);
  rpc DeleteUser (DeleteUserRequest) returns (DeleteUserResponse);
}

message GetUserRequest {
  string id = 1;
}

message User {
  string id = 1;
  string name = 2;
  string email = 3;
}

// Additional message definitions...
```

### Service Implementation

```javascript
// Example gRPC service implementation
module.exports = {
  name: 'User',
  grpc: {
    protoFile: 'user.proto',
    implementation: {
      GetUser: async (call, callback) => {
        try {
          const user = await getUserById(call.request.id);
          callback(null, user);
        } catch (error) {
          callback(error);
        }
      },
      // Other method implementations...
    }
  }
};
```
const { gql } = require('apollo-server-express');
const { isAuthenticated, hasRoles } = require('../core/auth');
const logger = require('../core/utils/logger');

// User model definition
const User = {
  name: 'User',
  
  // REST API routes
  routes: {
    // Get all users
    getAll: async (req, res) => {
      try {
        // In a real implementation, you would fetch users from the database
        const users = [
          { id: 1, username: 'user1', email: 'user1@example.com' },
          { id: 2, username: 'user2', email: 'user2@example.com' }
        ];
        
        res.json(users);
      } catch (error) {
        logger.error('Error fetching users:', error);
        res.status(500).json({ error: 'Failed to fetch users' });
      }
    },
    
    // Get user by ID
    getById: async (req, res) => {
      try {
        const { _id } = req.params;
        
        // In a real implementation, you would fetch the user from the database
        const user = { id: parseInt(_id), username: `user${_id}`, email: `user${_id}@example.com` };
        
        if (!user) {
          return res.status(404).json({ error: 'User not found' });
        }
        
        res.json(user);
      } catch (error) {
        logger.error('Error fetching user:', error);
        res.status(500).json({ error: 'Failed to fetch user' });
      }
    },
    
    // Create a new user
    create: async (req, res) => {
      try {
        const { username, email, _password } = req.body;
        
        // Validate input
        if (!username || !email || !_password) {
          return res.status(400).json({ error: 'Username, email, and password are required' });
        }
        
        // In a real implementation, you would create the user in the database
        const user = { id: 3, username, email };
        
        res.status(201).json(user);
      } catch (error) {
        logger.error('Error creating user:', error);
        res.status(500).json({ error: 'Failed to create user' });
      }
    },
    
    // Update a user
    update: async (req, res) => {
      try {
        const { _id } = req.params;
        const { username, email } = req.body;
        
        // In a real implementation, you would update the user in the database
        const user = { id: parseInt(_id), username, email };
        
        res.json(user);
      } catch (error) {
        logger.error('Error updating user:', error);
        res.status(500).json({ error: 'Failed to update user' });
      }
    },
    
    // Delete a user
    delete: async (req, res) => {
      try {
        const { _id } = req.params;
        
        // In a real implementation, you would delete the user from the database
        
        res.status(204).end();
      } catch (error) {
        logger.error('Error deleting user:', error);
        res.status(500).json({ error: 'Failed to delete user' });
      }
    },
    
    // Custom routes
    custom: [
      {
        method: 'GET',
        path: '/me',
        middleware: isAuthenticated,
        handler: async (req, res) => {
          try {
            // Return the authenticated user
            res.json({ id: req.user.id, roles: req.user.roles });
          } catch (error) {
            logger.error('Error fetching current user:', error);
            res.status(500).json({ error: 'Failed to fetch current user' });
          }
        }
      },
      {
        method: 'GET',
        path: '/admin',
        middleware: [isAuthenticated, hasRoles(['admin'])],
        handler: async (req, res) => {
          try {
            // This route is only accessible to admins
            res.json({ message: 'Admin access granted' });
          } catch (error) {
            logger.error('Error in admin route:', error);
            res.status(500).json({ error: 'Internal server error' });
          }
        }
      }
    ]
  },
  
  // Route-specific middleware
  middlewares: {
    // Apply authentication to all user routes except getAll and create
    getById: isAuthenticated,
    update: isAuthenticated,
    delete: [isAuthenticated, hasRoles(['admin'])]
  },
  
  // GraphQL schema and resolvers
  graphql: {
    // GraphQL type definitions
    typeDefs: gql`
      type User {
        id: ID!
        username: String!
        email: String!
        roles: [String!]
      }
      
      extend type Query {
        users: [User!]!
        user(id: ID!): User
        me: User
      }
      
      extend type Mutation {
        createUser(username: String!, email: String!, password: String!): User!
        updateUser(id: ID!, username: String, email: String): User!
        deleteUser(id: ID!): Boolean!
      }
    `,
    
    // GraphQL resolvers
    resolvers: {
      Query: {
        users: async () => {
          // In a real implementation, you would fetch users from the database
          return [
            { id: 1, username: 'user1', email: 'user1@example.com', roles: ['user'] },
            { id: 2, username: 'user2', email: 'user2@example.com', roles: ['user', 'admin'] }
          ];
        },
        
        user: async (_, { _id }) => {
          // In a real implementation, you would fetch the user from the database
          return { id: _id, username: `user${_id}`, email: `user${_id}@example.com`, roles: ['user'] };
        },
        
        me: async (_, __, { req }) => {
          // Check if the user is authenticated
          if (!req.user) {
            throw new Error('Not authenticated');
          }
          
          // In a real implementation, you would fetch the user from the database
          return { id: req.user.id, username: req.user.id, email: `${req.user.id}@example.com`, roles: req.user.roles };
        }
      },
      
      Mutation: {
        createUser: async (_, { username, email, _password }) => {
          // In a real implementation, you would create the user in the database
          return { id: 3, username, email, roles: ['user'] };
        },
        
        updateUser: async (_, { id, username, email }, { req }) => {
          // Check if the user is authenticated
          if (!req.user) {
            throw new Error('Not authenticated');
          }
          
          // In a real implementation, you would update the user in the database
          return { id, username, email, roles: ['user'] };
        },
        
        deleteUser: async (_, { id }, { req }) => {
          // Check if the user is authenticated and has admin role
          if (!req.user || !req.user.roles.includes('admin')) {
            throw new Error('Not authorized');
          }
          
          // In a real implementation, you would delete the user from the database
          return true;
        }
      }
    }
  },
  
  // WebSocket events
  websocket: {
    events: {
      // User created event
      created: async (data, socket) => {
        // In a real implementation, you would create the user in the database
        const user = { id: data.id, username: data.username, email: data.email };
        
        // Broadcast to all clients that a new user was created
        socket.broadcast.emit('User:created', user);
        
        return user;
      },
      
      // User updated event
      updated: async (data, socket) => {
        // In a real implementation, you would update the user in the database
        const user = { id: data.id, username: data.username, email: data.email };
        
        // Broadcast to all clients that a user was updated
        socket.broadcast.emit('User:updated', user);
        
        return user;
      },
      
      // User deleted event
      deleted: async (data, socket) => {
        // In a real implementation, you would delete the user from the database
        
        // Broadcast to all clients that a user was deleted
        socket.broadcast.emit('User:deleted', { id: data.id });
        
        return { success: true };
      }
    }
  }
};

module.exports = User; 
const { gql } = require('apollo-server-express');
const { isAuthenticated, hasRoles } = require('../core/auth');
const logger = require('../core/utils/logger');

// Product model definition
const Product = {
  name: 'Product',
  
  // REST API routes
  routes: {
    // Get all products
    getAll: async (req, res) => {
      try {
        // In a real implementation, you would fetch products from the database
        const products = [
          { id: 1, name: 'Product 1', price: 99.99, category: 'Electronics' },
          { id: 2, name: 'Product 2', price: 49.99, category: 'Books' },
          { id: 3, name: 'Product 3', price: 149.99, category: 'Electronics' }
        ];
        
        res.json(products);
      } catch (error) {
        logger.error('Error fetching products:', error);
        res.status(500).json({ error: 'Failed to fetch products' });
      }
    },
    
    // Get product by ID
    getById: async (req, res) => {
      try {
        const { id } = req.params;
        
        // In a real implementation, you would fetch the product from the database
        const product = { id: parseInt(id), name: `Product ${id}`, price: 99.99, category: 'Electronics' };
        
        if (!product) {
          return res.status(404).json({ error: 'Product not found' });
        }
        
        res.json(product);
      } catch (error) {
        logger.error('Error fetching product:', error);
        res.status(500).json({ error: 'Failed to fetch product' });
      }
    },
    
    // Create a new product
    create: [isAuthenticated, hasRoles(['admin']), async (req, res) => {
      try {
        const { name, price, category } = req.body;
        
        // Validate input
        if (!name || !price) {
          return res.status(400).json({ error: 'Name and price are required' });
        }
        
        // In a real implementation, you would create the product in the database
        const product = { id: 4, name, price, category };
        
        res.status(201).json(product);
      } catch (error) {
        logger.error('Error creating product:', error);
        res.status(500).json({ error: 'Failed to create product' });
      }
    }],
    
    // Update a product
    update: [isAuthenticated, hasRoles(['admin']), async (req, res) => {
      try {
        const { id } = req.params;
        const { name, price, category } = req.body;
        
        // In a real implementation, you would update the product in the database
        const product = { id: parseInt(id), name, price, category };
        
        res.json(product);
      } catch (error) {
        logger.error('Error updating product:', error);
        res.status(500).json({ error: 'Failed to update product' });
      }
    }],
    
    // Delete a product
    delete: [isAuthenticated, hasRoles(['admin']), async (req, res) => {
      try {
        const { id } = req.params;
        
        // In a real implementation, you would delete the product from the database
        
        res.status(204).end();
      } catch (error) {
        logger.error('Error deleting product:', error);
        res.status(500).json({ error: 'Failed to delete product' });
      }
    }],
    
    // Custom routes
    custom: [
      {
        method: 'GET',
        path: '/category/:category',
        handler: async (req, res) => {
          try {
            const { category } = req.params;
            
            // In a real implementation, you would fetch products by category from the database
            const products = [
              { id: 1, name: 'Product 1', price: 99.99, category }
            ];
            
            res.json(products);
          } catch (error) {
            logger.error('Error fetching products by category:', error);
            res.status(500).json({ error: 'Failed to fetch products by category' });
          }
        }
      },
      {
        method: 'GET',
        path: '/search',
        handler: async (req, res) => {
          try {
            const { query } = req.query;
            
            // In a real implementation, you would search products in the database
            const products = [
              { id: 1, name: 'Product 1', price: 99.99, category: 'Electronics' }
            ];
            
            res.json(products);
          } catch (error) {
            logger.error('Error searching products:', error);
            res.status(500).json({ error: 'Failed to search products' });
          }
        }
      }
    ]
  },
  
  // GraphQL schema
  graphql: {
    // GraphQL type definitions
    typeDefs: gql`
      type Product {
        id: ID!
        name: String!
        price: Float!
        category: String
        createdAt: String
        updatedAt: String
      }
      
      extend type Query {
        products: [Product]
        product(id: ID!): Product
        productsByCategory(category: String!): [Product]
      }
      
      extend type Mutation {
        createProduct(name: String!, price: Float!, category: String): Product
        updateProduct(id: ID!, name: String, price: Float, category: String): Product
        deleteProduct(id: ID!): Boolean
      }
      
      extend type Subscription {
        productCreated: Product
        productUpdated: Product
        productDeleted: ID
      }
    `,
    
    // GraphQL resolvers
    resolvers: {
      Query: {
        products: async () => {
          // In a real implementation, you would fetch products from the database
          return [
            { id: 1, name: 'Product 1', price: 99.99, category: 'Electronics' },
            { id: 2, name: 'Product 2', price: 49.99, category: 'Books' }
          ];
        },
        
        product: async (_, { id }) => {
          // In a real implementation, you would fetch the product from the database
          return { id, name: `Product ${id}`, price: 99.99, category: 'Electronics' };
        },
        
        productsByCategory: async (_, { category }) => {
          // In a real implementation, you would fetch products by category from the database
          return [
            { id: 1, name: 'Product 1', price: 99.99, category }
          ];
        }
      },
      
      Mutation: {
        createProduct: async (_, { name, price, category }, { req }) => {
          // Check if the user is authenticated and has admin role
          if (!req.user || !req.user.roles.includes('admin')) {
            throw new Error('Not authorized');
          }
          
          // In a real implementation, you would create the product in the database
          return { id: 4, name, price, category };
        },
        
        updateProduct: async (_, { id, name, price, category }, { req }) => {
          // Check if the user is authenticated and has admin role
          if (!req.user || !req.user.roles.includes('admin')) {
            throw new Error('Not authorized');
          }
          
          // In a real implementation, you would update the product in the database
          return { id, name, price, category };
        },
        
        deleteProduct: async (_, { id }, { req }) => {
          // Check if the user is authenticated and has admin role
          if (!req.user || !req.user.roles.includes('admin')) {
            throw new Error('Not authorized');
          }
          
          // In a real implementation, you would delete the product from the database
          return true;
        }
      },
      
      Subscription: {
        productCreated: {
          subscribe: (_, __, { pubsub }) => pubsub.asyncIterator(['PRODUCT_CREATED'])
        },
        
        productUpdated: {
          subscribe: (_, __, { pubsub }) => pubsub.asyncIterator(['PRODUCT_UPDATED'])
        },
        
        productDeleted: {
          subscribe: (_, __, { pubsub }) => pubsub.asyncIterator(['PRODUCT_DELETED'])
        }
      }
    }
  },
  
  // WebSocket events
  websocket: {
    events: {
      // Product created event
      created: async (data, socket) => {
        // In a real implementation, you would create the product in the database
        const product = { id: data.id, name: data.name, price: data.price, category: data.category };
        
        // Broadcast to all clients that a new product was created
        socket.broadcast.emit('Product:created', product);
        
        return product;
      },
      
      // Product updated event
      updated: async (data, socket) => {
        // In a real implementation, you would update the product in the database
        const product = { id: data.id, name: data.name, price: data.price, category: data.category };
        
        // Broadcast to all clients that a product was updated
        socket.broadcast.emit('Product:updated', product);
        
        return product;
      },
      
      // Product deleted event
      deleted: async (data, socket) => {
        // In a real implementation, you would delete the product from the database
        
        // Broadcast to all clients that a product was deleted
        socket.broadcast.emit('Product:deleted', { id: data.id });
        
        return { success: true };
      }
    }
  }
};

module.exports = Product; 
const { gql } = require('apollo-server-express');
const { makeExecutableSchema } = require('@graphql-tools/schema');
const fs = require('fs');
const path = require('path');
const logger = require('../utils/logger');

/**
 * Setup GraphQL schema
 */
function setupGraphQLSchema(config) {
  // Define base types
  const baseTypeDefs = gql`
    type Query {
      _empty: String
    }
    
    type Mutation {
      _empty: String
    }
    
    type Subscription {
      _empty: String
    }
  `;
  
  // Collect type definitions and resolvers from models
  const typeDefs = [baseTypeDefs];
  const resolvers = {
    Query: {},
    Mutation: {},
    Subscription: {}
  };
  
  // Dynamically load GraphQL schemas from models
  const modelsDir = path.join(__dirname, '../../models');
  if (fs.existsSync(modelsDir)) {
    fs.readdirSync(modelsDir).forEach(file => {
      if (file.endsWith('.js')) {
        const model = require(path.join(modelsDir, file));
        if (model.graphql) {
          // Add type definitions
          if (model.graphql.typeDefs) {
            typeDefs.push(model.graphql.typeDefs);
          }
          
          // Merge resolvers
          if (model.graphql.resolvers) {
            mergeResolvers(resolvers, model.graphql.resolvers);
          }
        }
      }
    });
  }
  
  // Create executable schema
  const schema = makeExecutableSchema({
    typeDefs,
    resolvers
  });
  
  logger.info('GraphQL schema generated successfully');
  return schema;
}

/**
 * Merge resolvers from a model into the main resolvers object
 */
function mergeResolvers(mainResolvers, modelResolvers) {
  // Merge Query resolvers
  if (modelResolvers.Query) {
    Object.assign(mainResolvers.Query, modelResolvers.Query);
  }
  
  // Merge Mutation resolvers
  if (modelResolvers.Mutation) {
    Object.assign(mainResolvers.Mutation, modelResolvers.Mutation);
  }
  
  // Merge Subscription resolvers
  if (modelResolvers.Subscription) {
    Object.assign(mainResolvers.Subscription, modelResolvers.Subscription);
  }
  
  // Merge type resolvers
  Object.keys(modelResolvers).forEach(key => {
    if (!['Query', 'Mutation', 'Subscription'].includes(key)) {
      mainResolvers[key] = mainResolvers[key] || {};
      Object.assign(mainResolvers[key], modelResolvers[key]);
    }
  });
}

module.exports = {
  setupGraphQLSchema
}; 
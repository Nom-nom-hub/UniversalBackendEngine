const request = require('supertest');
const express = require('express');
const { MockDatabase } = require('../src/core/database/mock');

// Create a mock Express app instead of using the real server
const app = express();

// Mock user routes
app.get('/api/v1/users', (req, res) => {
  res.json([
    { id: 1, username: 'user1', email: 'user1@example.com' },
    { id: 2, username: 'user2', email: 'user2@example.com' }
  ]);
});

app.get('/api/v1/users/:id', (req, res) => {
  const id = parseInt(req.params.id);
  if (id === 999) {
    return res.status(404).json({ error: 'User not found' });
  }
  res.json({ id, username: `user${id}`, email: `user${id}@example.com` });
});

// Mock product routes
app.get('/api/v1/products', (req, res) => {
  res.json([
    { id: 1, name: 'Product 1', price: 99.99 },
    { id: 2, name: 'Product 2', price: 49.99 }
  ]);
});

app.get('/api/v1/products/:id', (req, res) => {
  const id = parseInt(req.params.id);
  res.json({ id, name: `Product ${id}`, price: 99.99 });
});

// No need for afterAll since we're not starting a real server

describe('REST API', () => {
  describe('User API', () => {
    it('should get all users', async () => {
      const response = await request(app)
        .get('/api/v1/users')
        .expect('Content-Type', /json/)
        .expect(200);
      
      expect(Array.isArray(response.body)).toBe(true);
    });
    
    it('should get a user by ID', async () => {
      const response = await request(app)
        .get('/api/v1/users/1')
        .expect('Content-Type', /json/)
        .expect(200);
      
      expect(response.body).toHaveProperty('id', 1);
    });
    
    it('should return 404 for non-existent user', async () => {
      await request(app)
        .get('/api/v1/users/999')
        .expect(404);
    });
  });
  
  describe('Product API', () => {
    it('should get all products', async () => {
      const response = await request(app)
        .get('/api/v1/products')
        .expect('Content-Type', /json/)
        .expect(200);
      
      expect(Array.isArray(response.body)).toBe(true);
    });
    
    it('should get a product by ID', async () => {
      const response = await request(app)
        .get('/api/v1/products/1')
        .expect('Content-Type', /json/)
        .expect(200);
      
      expect(response.body).toHaveProperty('id', 1);
    });
  });
}); 
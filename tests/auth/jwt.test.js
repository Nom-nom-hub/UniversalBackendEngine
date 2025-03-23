const request = require('supertest');
const express = require('express');
const jwt = require('jsonwebtoken');

// Create a mock Express app
const app = express();

// Mock JWT secret
const JWT_SECRET = 'test-secret-key';

// Middleware to verify JWT token
const verifyToken = (req, res, next) => {
  const token = req.headers.authorization?.split(' ')[1];
  
  if (!token) {
    return res.status(401).json({ error: 'No token provided' });
  }
  
  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    req.user = decoded;
    next();
  } catch (error) {
    return res.status(401).json({ error: 'Invalid token' });
  }
};

// Middleware to check admin role
const isAdmin = (req, res, next) => {
  if (!req.user.roles.includes('admin')) {
    return res.status(403).json({ error: 'Requires admin role' });
  }
  next();
};

// Mock routes
app.get('/api/v1/public', (req, res) => {
  res.json({ message: 'Public route' });
});

app.get('/api/v1/protected', verifyToken, (req, res) => {
  res.json({ message: 'Protected route', user: req.user });
});

app.get('/api/v1/admin', verifyToken, isAdmin, (req, res) => {
  res.json({ message: 'Admin route' });
});

// Login route to get a token
app.post('/api/v1/login', (req, res) => {
  const { username, password } = req.body;
  
  // Simple mock authentication
  if (username === 'admin' && password === 'admin') {
    const token = jwt.sign({ id: 1, username, roles: ['admin', 'user'] }, JWT_SECRET, { expiresIn: '1h' });
    return res.json({ token });
  } else if (username === 'user' && password === 'user') {
    const token = jwt.sign({ id: 2, username, roles: ['user'] }, JWT_SECRET, { expiresIn: '1h' });
    return res.json({ token });
  }
  
  res.status(401).json({ error: 'Invalid credentials' });
});

describe('JWT Authentication', () => {
  let adminToken;
  let userToken;
  
  beforeAll(async () => {
    // Get tokens for testing
    const adminResponse = await request(app)
      .post('/api/v1/login')
      .send({ username: 'admin', password: 'admin' });
    
    adminToken = adminResponse.body.token;
    
    const userResponse = await request(app)
      .post('/api/v1/login')
      .send({ username: 'user', password: 'user' });
    
    userToken = userResponse.body.token;
  });
  
  it('should allow access to protected routes with valid token', async () => {
    const response = await request(app)
      .get('/api/v1/protected')
      .set('Authorization', `Bearer ${adminToken}`)
      .expect(200);
    
    expect(response.body).toHaveProperty('message', 'Protected route');
  });
  
  it('should deny access to protected routes without token', async () => {
    await request(app)
      .get('/api/v1/protected')
      .expect(401);
  });
  
  it('should deny access to protected routes with invalid token', async () => {
    await request(app)
      .get('/api/v1/protected')
      .set('Authorization', 'Bearer invalid-token')
      .expect(401);
  });
  
  it('should deny access to admin routes for non-admin users', async () => {
    await request(app)
      .get('/api/v1/admin')
      .set('Authorization', `Bearer ${userToken}`)
      .expect(403);
  });
}); 
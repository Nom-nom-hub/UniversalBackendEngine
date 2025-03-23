const request = require('supertest');
const jwt = require('jsonwebtoken');
const { startServer } = require('../../src/server');

let server;
let app;
let token;

beforeAll(async () => {
  server = await startServer();
  app = server.address().port ? server : server._events.request;
  
  // Create a test token
  token = jwt.sign(
    { id: 1, username: 'testuser', roles: ['user'] },
    process.env.JWT_SECRET,
    { expiresIn: '1h' }
  );
});

afterAll(async () => {
  await new Promise((resolve) => server.close(resolve));
});

describe('JWT Authentication', () => {
  it('should allow access to protected routes with valid token', async () => {
    const response = await request(app)
      .get('/api/v1/users/me')
      .set('Authorization', `Bearer ${token}`)
      .expect('Content-Type', /json/)
      .expect(200);
    
    expect(response.body).toHaveProperty('id', 1);
    expect(response.body).toHaveProperty('username', 'testuser');
  });
  
  it('should deny access to protected routes without token', async () => {
    await request(app)
      .get('/api/v1/users/me')
      .expect('Content-Type', /json/)
      .expect(401);
  });
  
  it('should deny access to protected routes with invalid token', async () => {
    await request(app)
      .get('/api/v1/users/me')
      .set('Authorization', 'Bearer invalid-token')
      .expect('Content-Type', /json/)
      .expect(401);
  });
  
  it('should deny access to admin routes for non-admin users', async () => {
    await request(app)
      .post('/api/v1/users')
      .set('Authorization', `Bearer ${token}`)
      .send({ username: 'newuser', email: 'newuser@example.com' })
      .expect('Content-Type', /json/)
      .expect(403);
  });
}); 
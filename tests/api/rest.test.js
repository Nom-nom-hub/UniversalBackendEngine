const request = require('supertest');
const { startServer } = require('../../src/server');

let server;
let app;

beforeAll(async () => {
  server = await startServer();
  app = server.address().port ? server : server._events.request;
});

afterAll(async () => {
  await new Promise((resolve) => server.close(resolve));
});

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
        .expect('Content-Type', /json/)
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
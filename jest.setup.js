// Mock environment variables
process.env.NODE_ENV = 'test';
process.env.JWT_SECRET = 'test-secret-key';

// Global test setup
jest.mock('@grpc/grpc-js');
jest.mock('@grpc/proto-loader'); 
// Mock implementation for gRPC
const grpc = {
  Server: jest.fn().mockImplementation(() => ({
    addService: jest.fn(),
    bindAsync: jest.fn((address, credentials, callback) => {
      callback(null, 0);
    }),
    start: jest.fn()
  })),
  ServerCredentials: {
    createInsecure: jest.fn()
  }
};

module.exports = grpc; 
module.exports = {
  testEnvironment: 'node',
  collectCoverage: true,
  coverageDirectory: 'coverage',
  collectCoverageFrom: [
    'src/**/*.js',
    '!src/tests/**',
    '!**/node_modules/**'
  ],
  coverageReporters: ['text', 'lcov'],
  testMatch: [
    '**/tests/**/*.test.js',
    '**/src/tests/**/*.test.js'
  ],
  moduleNameMapper: {
    '@grpc/grpc-js': '<rootDir>/src/core/api-generators/__mocks__/grpc.js',
    'prom-client': '<rootDir>/src/middleware/__mocks__/prom-client.js'
  },
  setupFilesAfterEnv: ['<rootDir>/jest.setup.js']
}; 
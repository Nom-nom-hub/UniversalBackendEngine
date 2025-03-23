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
    '@grpc/grpc-js': '<rootDir>/src/core/api-generators/__mocks__/grpc.js'
  },
  setupFilesAfterEnv: ['<rootDir>/jest.setup.js']
}; 
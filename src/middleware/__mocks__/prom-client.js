// Mock implementation for prom-client
const promClient = {
  Registry: jest.fn().mockImplementation(() => ({
    registerMetric: jest.fn(),
    metrics: jest.fn().mockResolvedValue('mock metrics'),
    contentType: 'text/plain',
    clear: jest.fn()
  })),
  Counter: jest.fn().mockImplementation(() => ({
    inc: jest.fn()
  })),
  Gauge: jest.fn().mockImplementation(() => ({
    set: jest.fn(),
    inc: jest.fn(),
    dec: jest.fn()
  })),
  Histogram: jest.fn().mockImplementation(() => ({
    observe: jest.fn()
  })),
  Summary: jest.fn().mockImplementation(() => ({
    observe: jest.fn()
  })),
  collectDefaultMetrics: jest.fn()
};

module.exports = promClient; 
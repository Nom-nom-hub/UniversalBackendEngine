const { performance } = require('perf_hooks');
const axios = require('axios');

// Configuration
const config = {
  baseUrl: 'http://localhost:3000',
  endpoints: [
    { path: '/api/health', method: 'get' },
    { path: '/api/users', method: 'get' },
    { path: '/api/products', method: 'get' }
  ],
  iterations: 100,
  concurrency: 10
};

/**
 * Run performance test for an endpoint
 */
async function testEndpoint(endpoint) {
  const startTime = performance.now();
  
  try {
    const response = await axios[endpoint.method](`${config.baseUrl}${endpoint.path}`);
    const endTime = performance.now();
    
    return {
      endpoint: endpoint.path,
      method: endpoint.method.toUpperCase(),
      status: response.status,
      duration: endTime - startTime,
      success: true
    };
  } catch (error) {
    const endTime = performance.now();
    
    return {
      endpoint: endpoint.path,
      method: endpoint.method.toUpperCase(),
      status: error.response?.status || 0,
      duration: endTime - startTime,
      success: false,
      error: error.message
    };
  }
}

/**
 * Run concurrent tests
 */
async function runConcurrentTests(endpoint, concurrency) {
  const promises = [];
  
  for (let i = 0; i < concurrency; i++) {
    promises.push(testEndpoint(endpoint));
  }
  
  return Promise.all(promises);
}

/**
 * Run all performance tests
 */
async function runPerformanceTests() {
  console.log('Starting performance tests...');
  console.log(`Iterations: ${config.iterations}, Concurrency: ${config.concurrency}`);
  
  const results = {};
  
  for (const endpoint of config.endpoints) {
    console.log(`Testing ${endpoint.method.toUpperCase()} ${endpoint.path}...`);
    
    const endpointResults = [];
    
    for (let i = 0; i < config.iterations; i++) {
      const iterationResults = await runConcurrentTests(endpoint, config.concurrency);
      endpointResults.push(...iterationResults);
      
      // Progress indicator
      if ((i + 1) % 10 === 0) {
        console.log(`  Progress: ${i + 1}/${config.iterations} iterations`);
      }
    }
    
    // Calculate statistics
    const durations = endpointResults.map(result => result.duration);
    const successCount = endpointResults.filter(result => result.success).length;
    const successRate = (successCount / endpointResults.length) * 100;
    
    results[`${endpoint.method.toUpperCase()} ${endpoint.path}`] = {
      totalRequests: endpointResults.length,
      successRate: `${successRate.toFixed(2)}%`,
      min: Math.min(...durations).toFixed(2),
      max: Math.max(...durations).toFixed(2),
      avg: (durations.reduce((sum, duration) => sum + duration, 0) / durations.length).toFixed(2),
      p95: calculatePercentile(durations, 95).toFixed(2),
      p99: calculatePercentile(durations, 99).toFixed(2)
    };
  }
  
  console.log('\nPerformance Test Results:');
  console.table(results);
}

/**
 * Calculate percentile
 */
function calculatePercentile(values, percentile) {
  const sorted = [...values].sort((a, b) => a - b);
  const index = Math.ceil((percentile / 100) * sorted.length) - 1;
  return sorted[index];
}

// Run the tests
runPerformanceTests().catch(console.error); 
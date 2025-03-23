const logger = require('../utils/logger');
const os = require('os');
const process = require('process');

/**
 * Monitoring Manager
 */
class MonitoringManager {
  constructor(config = {}) {
    this.config = config;
    this.metrics = new Map();
    this.startTime = Date.now();
    this.providers = new Map();
  }
  
  /**
   * Initialize monitoring
   */
  async initialize() {
    try {
      // Initialize configured providers
      if (this.config.providers) {
        for (const [providerName, providerConfig] of Object.entries(this.config.providers)) {
          if (providerConfig.enabled) {
            await this.initializeProvider(providerName, providerConfig);
          }
        }
      }
      
      // Start collecting system metrics
      if (this.config.collectSystemMetrics) {
        this.startSystemMetricsCollection();
      }
      
      logger.info(`Monitoring initialized with ${this.providers.size} providers`);
      return true;
    } catch (error) {
      logger.error('Failed to initialize monitoring:', error);
      throw error;
    }
  }
  
  /**
   * Initialize a monitoring provider
   */
  async initializeProvider(providerName, providerConfig) {
    try {
      let provider;
      
      switch (providerName) {
        case 'datadog':
          provider = await this.initializeDatadog(providerConfig);
          break;
        case 'newrelic':
          provider = await this.initializeNewRelic(providerConfig);
          break;
        case 'prometheus':
          provider = await this.initializePrometheus(providerConfig);
          break;
        default:
          throw new Error(`Unknown monitoring provider: ${providerName}`);
      }
      
      this.providers.set(providerName, provider);
      logger.info(`Initialized monitoring provider: ${providerName}`);
      
      return provider;
    } catch (error) {
      logger.error(`Failed to initialize monitoring provider ${providerName}:`, error);
      throw error;
    }
  }
  
  /**
   * Initialize Datadog monitoring
   */
  async initializeDatadog(config) {
    try {
      const { StatsD } = require('hot-shots');
      
      const client = new StatsD({
        host: config.host || 'localhost',
        port: config.port || 8125,
        prefix: config.prefix || 'universal_backend.',
        globalTags: config.tags || {}
      });
      
      return {
        name: 'datadog',
        client,
        recordMetric: (name, value, tags = {}) => {
          client.gauge(name, value, tags);
        },
        incrementCounter: (name, value = 1, tags = {}) => {
          client.increment(name, value, tags);
        },
        recordHistogram: (name, value, tags = {}) => {
          client.histogram(name, value, tags);
        },
        startTimer: (name, tags = {}) => {
          return client.timer(name, tags);
        }
      };
    } catch (error) {
      logger.error('Failed to initialize Datadog:', error);
      throw error;
    }
  }
  
  /**
   * Initialize New Relic monitoring
   */
  async initializeNewRelic(config) {
    try {
      // Require at runtime to avoid loading if not used
      const newrelic = require('newrelic');
      
      return {
        name: 'newrelic',
        client: newrelic,
        recordMetric: (name, value) => {
          newrelic.recordMetric(name, value);
        },
        incrementCounter: (name, value = 1) => {
          newrelic.incrementMetric(name, value);
        },
        recordHistogram: (name, value) => {
          newrelic.recordMetric(name, value);
        },
        startTimer: (name) => {
          const startTime = Date.now();
          return {
            end: () => {
              const duration = Date.now() - startTime;
              newrelic.recordMetric(name, duration);
              return duration;
            }
          };
        }
      };
    } catch (error) {
      logger.error('Failed to initialize New Relic:', error);
      throw error;
    }
  }
  
  /**
   * Initialize Prometheus monitoring
   */
  async initializePrometheus(config) {
    try {
      const prometheus = require('prom-client');
      
      // Create registry
      const registry = new prometheus.Registry();
      
      // Add default metrics
      prometheus.collectDefaultMetrics({ register: registry });
      
      return {
        name: 'prometheus',
        client: prometheus,
        registry,
        metrics: new Map(),
        recordMetric: (name, value, labels = {}) => {
          let metric = this.metrics.get(name);
          
          if (!metric) {
            metric = new prometheus.Gauge({
              name,
              help: `Gauge for ${name}`,
              labelNames: Object.keys(labels),
              registers: [registry]
            });
            this.metrics.set(name, metric);
          }
          
          metric.set(labels, value);
        },
        incrementCounter: (name, value = 1, labels = {}) => {
          let metric = this.metrics.get(name);
          
          if (!metric) {
            metric = new prometheus.Counter({
              name,
              help: `Counter for ${name}`,
              labelNames: Object.keys(labels),
              registers: [registry]
            });
            this.metrics.set(name, metric);
          }
          
          metric.inc(labels, value);
        },
        recordHistogram: (name, value, labels = {}) => {
          let metric = this.metrics.get(name);
          
          if (!metric) {
            metric = new prometheus.Histogram({
              name,
              help: `Histogram for ${name}`,
              labelNames: Object.keys(labels),
              registers: [registry]
            });
            this.metrics.set(name, metric);
          }
          
          metric.observe(labels, value);
        },
        startTimer: (name, labels = {}) => {
          let metric = this.metrics.get(name);
          
          if (!metric) {
            metric = new prometheus.Histogram({
              name,
              help: `Timing histogram for ${name}`,
              labelNames: Object.keys(labels),
              registers: [registry]
            });
            this.metrics.set(name, metric);
          }
          
          const end = metric.startTimer(labels);
          return { end };
        },
        getMetricsHandler: () => async (req, res) => {
          res.set('Content-Type', registry.contentType);
          res.end(await registry.metrics());
        }
      };
    } catch (error) {
      logger.error('Failed to initialize Prometheus:', error);
      throw error;
    }
  }
  
  /**
   * Start collecting system metrics
   */
  startSystemMetricsCollection() {
    const collectSystemMetrics = () => {
      // CPU usage
      const cpuUsage = process.cpuUsage();
      this.recordMetric('system.cpu.user', cpuUsage.user / 1000);
      this.recordMetric('system.cpu.system', cpuUsage.system / 1000);
      
      // Memory usage
      const memoryUsage = process.memoryUsage();
      this.recordMetric('system.memory.rss', memoryUsage.rss);
      this.recordMetric('system.memory.heapTotal', memoryUsage.heapTotal);
      this.recordMetric('system.memory.heapUsed', memoryUsage.heapUsed);
      this.recordMetric('system.memory.external', memoryUsage.external);
      
      // System memory
      this.recordMetric('system.memory.total', os.totalmem());
      this.recordMetric('system.memory.free', os.freemem());
      
      // Uptime
      this.recordMetric('system.uptime', process.uptime());
      
      // Load average
      const loadAvg = os.loadavg();
      this.recordMetric('system.load.1m', loadAvg[0]);
      this.recordMetric('system.load.5m', loadAvg[1]);
      this.recordMetric('system.load.15m', loadAvg[2]);
    };
    
    // Collect immediately
    collectSystemMetrics();
    
    // Then collect periodically
    const interval = this.config.systemMetricsInterval || 60000;
    this.systemMetricsInterval = setInterval(collectSystemMetrics, interval);
  }
  
  /**
   * Record a metric
   */
  recordMetric(name, value, tags = {}) {
    // Store in memory
    this.metrics.set(name, {
      value,
      tags,
      timestamp: Date.now()
    });
    
    // Send to all providers
    for (const provider of this.providers.values()) {
      provider.recordMetric(name, value, tags);
    }
  }
  
  /**
   * Increment a counter
   */
  incrementCounter(name, value = 1, tags = {}) {
    // Send to all providers
    for (const provider of this.providers.values()) {
      provider.incrementCounter(name, value, tags);
    }
  }
  
  /**
   * Record a histogram value
   */
  recordHistogram(name, value, tags = {}) {
    // Send to all providers
    for (const provider of this.providers.values()) {
      provider.recordHistogram(name, value, tags);
    }
  }
  
  /**
   * Start a timer
   */
  startTimer(name, tags = {}) {
    const startTime = Date.now();
    const providerTimers = [];
    
    // Start timers in all providers
    for (const provider of this.providers.values()) {
      if (provider.startTimer) {
        providerTimers.push(provider.startTimer(name, tags));
      }
    }
    
    // Return a timer object
    return {
      end: () => {
        const duration = Date.now() - startTime;
        
        // End all provider timers
        for (const timer of providerTimers) {
          if (timer.end) {
            timer.end();
          }
        }
        
        return duration;
      }
    };
  }
  
  /**
   * Create Express middleware for request monitoring
   */
  createMiddleware() {
    return (req, res, next) => {
      // Skip monitoring for certain paths
      if (this.config.excludePaths && this.config.excludePaths.some(path => req.path.startsWith(path))) {
        return next();
      }
      
      // Increment request counter
      this.incrementCounter('http.requests', 1, {
        method: req.method,
        path: req.route ? req.route.path : req.path
      });
      
      // Start timer
      const timer = this.startTimer('http.request.duration', {
        method: req.method,
        path: req.route ? req.route.path : req.path
      });
      
      // Track response
      res.on('finish', () => {
        // End timer
        const duration = timer.end();
        
        // Record status code
        this.incrementCounter('http.responses', 1, {
          method: req.method,
          path: req.route ? req.route.path : req.path,
          status: res.statusCode
        });
        
        // Record response time histogram
        this.recordHistogram('http.response.time', duration, {
          method: req.method,
          path: req.route ? req.route.path : req.path,
          status: res.statusCode
        });
      });
      
      next();
    };
  }
  
  /**
   * Get metrics endpoint handler
   */
  getMetricsHandler() {
    // If Prometheus is configured, use its handler
    const prometheusProvider = this.providers.get('prometheus');
    if (prometheusProvider && prometheusProvider.getMetricsHandler) {
      return prometheusProvider.getMetricsHandler();
    }
    
    // Otherwise, return a simple JSON handler
    return (req, res) => {
      const metrics = {};
      
      for (const [name, metric] of this.metrics.entries()) {
        metrics[name] = metric;
      }
      
      res.json({
        metrics,
        uptime: process.uptime(),
        memory: process.memoryUsage(),
        cpu: process.cpuUsage()
      });
    };
  }
  
  /**
   * Shutdown monitoring
   */
  async shutdown() {
    // Clear system metrics interval
    if (this.systemMetricsInterval) {
      clearInterval(this.systemMetricsInterval);
    }
    
    // Shutdown providers
    for (const [name, provider] of this.providers.entries()) {
      if (provider.shutdown) {
        try {
          await provider.shutdown();
          logger.info(`Shut down monitoring provider: ${name}`);
        } catch (error) {
          logger.error(`Failed to shut down monitoring provider ${name}:`, error);
        }
      }
    }
    
    logger.info('Monitoring shut down');
  }
}

module.exports = MonitoringManager; 
const { resilienceManager } = require('../middleware/resilience');
const logger = require('../utils/logger');
const axios = require('axios');
const { EventEmitter } = require('events');

/**
 * Resilient API service for external integrations in Maestro Conductor
 * Provides circuit breaker protection, retry logic, and bulkhead isolation for all external API calls
 */
class ResilientApiService extends EventEmitter {
  constructor(options = {}) {
    super();

    this.name = options.name || 'api-service';
    this.baseURL = options.baseURL;
    this.timeout = options.timeout || 30000;
    this.headers = options.headers || {};

    // Create axios instance with default config
    this.axios = axios.create({
      baseURL: this.baseURL,
      timeout: this.timeout,
      headers: {
        'User-Agent': 'Maestro-Conductor/1.0',
        ...this.headers,
      },
      validateStatus: (status) => status < 500, // Don't treat 4xx as errors for retry logic
    });

    // Setup resilience patterns
    this.circuitBreaker = resilienceManager.getCircuitBreaker(
      `${this.name}-api`,
      {
        failureThreshold: 5,
        recoveryTimeout: 60000, // 1 minute
        monitoringWindow: 300000, // 5 minutes
        expectedErrors: [
          'ECONNREFUSED',
          'ENOTFOUND',
          'ETIMEDOUT',
          'ECONNRESET',
          '401',
          '403',
          '404', // Client errors shouldn't trip circuit
        ],
      },
    );

    this.bulkhead = resilienceManager.getBulkhead(`${this.name}-api`, {
      maxConcurrent: 15,
      queueSize: 100,
      timeoutMs: 45000,
    });

    this.retryPolicy = resilienceManager.getRetryPolicy(`${this.name}-api`, {
      maxAttempts: 3,
      baseDelay: 1000,
      maxDelay: 10000,
      retryableErrors: [
        'ECONNRESET',
        'ETIMEDOUT',
        'ENOTFOUND',
        '429', // Rate limited
        '502',
        '503',
        '504', // Server errors
      ],
    });

    this.setupEventHandlers();
    this.setupAxiosInterceptors();
  }

  setupEventHandlers() {
    this.circuitBreaker.on('trip', (data) => {
      logger.error(`API circuit breaker '${this.name}' tripped`, data);
      this.emit('circuitTripped', data);
    });

    this.circuitBreaker.on('reset', (data) => {
      logger.info(`API circuit breaker '${this.name}' reset`, data);
      this.emit('circuitReset', data);
    });

    this.circuitBreaker.on('halfOpen', (data) => {
      logger.info(`API circuit breaker '${this.name}' half-open`, data);
      this.emit('circuitHalfOpen', data);
    });
  }

  setupAxiosInterceptors() {
    // Request interceptor for logging and metrics
    this.axios.interceptors.request.use(
      (config) => {
        config.metadata = { startTime: Date.now() };
        logger.debug(
          `API request started: ${config.method?.toUpperCase()} ${config.url}`,
        );
        return config;
      },
      (error) => {
        logger.error('API request error:', error);
        return Promise.reject(error);
      },
    );

    // Response interceptor for logging and metrics
    this.axios.interceptors.response.use(
      (response) => {
        const duration = Date.now() - response.config.metadata.startTime;
        logger.debug(
          `API response: ${response.status} ${response.config.url} (${duration}ms)`,
        );

        this.emit('requestCompleted', {
          url: response.config.url,
          method: response.config.method,
          status: response.status,
          duration,
        });

        return response;
      },
      (error) => {
        const duration = error.config?.metadata
          ? Date.now() - error.config.metadata.startTime
          : 0;
        logger.error(
          `API error: ${error.message} ${error.config?.url} (${duration}ms)`,
        );

        this.emit('requestFailed', {
          url: error.config?.url,
          method: error.config?.method,
          error: error.message,
          status: error.response?.status,
          duration,
        });

        return Promise.reject(error);
      },
    );
  }

  /**
   * Execute HTTP request with full resilience protection
   */
  async request(config) {
    return resilienceManager.executeWithResilience(
      `${this.name}-request`,
      async () => {
        const response = await this.axios.request(config);

        // Handle HTTP error status codes
        if (response.status >= 400) {
          const error = new Error(
            `HTTP ${response.status}: ${response.statusText}`,
          );
          error.status = response.status;
          error.response = response;
          throw error;
        }

        return response;
      },
      {
        timeout: this.timeout + 5000, // Slightly longer than axios timeout
        enableCircuitBreaker: true,
        enableRetry: true,
        enableBulkhead: true,
        enableTimeout: true,
        circuitBreaker: {
          failureThreshold: 5,
          expectedErrors: ['401', '403', '404', '400'], // Client errors
        },
        retry: {
          maxAttempts: 3,
          retryableErrors: [
            'ECONNRESET',
            'ETIMEDOUT',
            '429',
            '502',
            '503',
            '504',
          ],
        },
        bulkhead: {
          maxConcurrent: 15,
          queueSize: 100,
        },
      },
    );
  }

  // Convenience methods for common HTTP verbs
  async get(url, config = {}) {
    return this.request({ ...config, method: 'GET', url });
  }

  async post(url, data, config = {}) {
    return this.request({ ...config, method: 'POST', url, data });
  }

  async put(url, data, config = {}) {
    return this.request({ ...config, method: 'PUT', url, data });
  }

  async patch(url, data, config = {}) {
    return this.request({ ...config, method: 'PATCH', url, data });
  }

  async delete(url, config = {}) {
    return this.request({ ...config, method: 'DELETE', url });
  }

  /**
   * Batch requests with concurrency control
   */
  async batchRequests(requests, options = {}) {
    const { maxConcurrency = 5, failFast = false } = options;

    return resilienceManager.executeWithResilience(
      `${this.name}-batch`,
      async () => {
        const results = [];
        const errors = [];

        // Process requests in batches to control concurrency
        for (let i = 0; i < requests.length; i += maxConcurrency) {
          const batch = requests.slice(i, i + maxConcurrency);

          const batchPromises = batch.map(async (request, index) => {
            try {
              const result = await this.request(request);
              return { index: i + index, success: true, result };
            } catch (error) {
              const errorResult = { index: i + index, success: false, error };

              if (failFast) {
                throw error;
              }

              return errorResult;
            }
          });

          const batchResults = await Promise.all(batchPromises);

          for (const result of batchResults) {
            if (result.success) {
              results[result.index] = result.result;
            } else {
              errors.push(result);
            }
          }
        }

        return { results, errors };
      },
      {
        timeout: this.timeout * Math.ceil(requests.length / maxConcurrency),
        enableCircuitBreaker: false, // Individual requests handle circuit breaking
        enableRetry: false, // Individual requests handle retries
        enableBulkhead: true,
        enableTimeout: true,
      },
    );
  }

  /**
   * Health check for the external service
   */
  async healthCheck() {
    try {
      const startTime = Date.now();

      // Try to make a lightweight request (HEAD or GET to root/health endpoint)
      const response = await this.axios.request({
        method: 'HEAD',
        url: this.baseURL || '/',
        timeout: 5000,
      });

      const latency = Date.now() - startTime;

      return {
        healthy: response.status < 400,
        latency,
        status: response.status,
        details: {
          circuitState: this.circuitBreaker.state,
          baseURL: this.baseURL,
        },
      };
    } catch (error) {
      return {
        healthy: false,
        error: error.message,
        details: {
          circuitState: this.circuitBreaker.state,
          baseURL: this.baseURL,
          lastError: error.code || error.response?.status,
        },
      };
    }
  }

  /**
   * Get service metrics for monitoring
   */
  getMetrics() {
    return {
      service: this.name,
      baseURL: this.baseURL,
      circuitBreaker: this.circuitBreaker.getHealthMetrics(),
      bulkhead: this.bulkhead.getStatus(),
      axios: {
        timeout: this.timeout,
        defaultHeaders: this.headers,
      },
    };
  }

  /**
   * Update service configuration
   */
  updateConfig(config = {}) {
    if (config.timeout) {
      this.timeout = config.timeout;
      this.axios.defaults.timeout = config.timeout;
    }

    if (config.headers) {
      this.headers = { ...this.headers, ...config.headers };
      this.axios.defaults.headers = {
        ...this.axios.defaults.headers,
        ...config.headers,
      };
    }

    if (config.baseURL) {
      this.baseURL = config.baseURL;
      this.axios.defaults.baseURL = config.baseURL;
    }

    logger.info(`Updated API service config for '${this.name}'`, config);
  }

  /**
   * Cleanup resources
   */
  destroy() {
    this.removeAllListeners();

    // Cancel any pending requests
    if (this.axios.defaults.cancelToken) {
      this.axios.defaults.cancelToken.cancel('Service destroyed');
    }
  }
}

/**
 * Factory for creating resilient API service instances
 */
class ApiServiceFactory {
  constructor() {
    this.services = new Map();
  }

  /**
   * Create or get existing API service instance
   */
  createService(name, options = {}) {
    if (!this.services.has(name)) {
      const service = new ResilientApiService({ name, ...options });
      this.services.set(name, service);

      logger.info(`Created resilient API service: ${name}`, options);
    }

    return this.services.get(name);
  }

  /**
   * Get existing service or throw error
   */
  getService(name) {
    const service = this.services.get(name);
    if (!service) {
      throw new Error(`API service '${name}' not found`);
    }
    return service;
  }

  /**
   * Remove and cleanup service
   */
  destroyService(name) {
    const service = this.services.get(name);
    if (service) {
      service.destroy();
      this.services.delete(name);
      logger.info(`Destroyed API service: ${name}`);
    }
  }

  /**
   * Get health status of all services
   */
  async getAllHealthStatus() {
    const statuses = {};

    for (const [name, service] of this.services) {
      try {
        statuses[name] = await service.healthCheck();
      } catch (error) {
        statuses[name] = {
          healthy: false,
          error: error.message,
        };
      }
    }

    return statuses;
  }

  /**
   * Get metrics for all services
   */
  getAllMetrics() {
    const metrics = {};

    for (const [name, service] of this.services) {
      metrics[name] = service.getMetrics();
    }

    return metrics;
  }

  /**
   * Cleanup all services
   */
  destroy() {
    for (const [name, service] of this.services) {
      service.destroy();
    }
    this.services.clear();
  }
}

// Export singleton factory
const apiServiceFactory = new ApiServiceFactory();

module.exports = {
  ResilientApiService,
  ApiServiceFactory,
  apiServiceFactory,
};

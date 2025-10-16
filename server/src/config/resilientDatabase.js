const { resilienceManager } = require('../middleware/resilience');
const logger = require('../utils/logger');
const { EventEmitter } = require('events');

/**
 * Resilient database connection wrappers for Maestro Conductor
 * Implements circuit breakers, retry logic, and connection pooling with health monitoring
 */

class ResilientNeo4jConnection extends EventEmitter {
  constructor(driver) {
    super();
    this.driver = driver;
    this.circuitBreaker = resilienceManager.getCircuitBreaker('neo4j', {
      failureThreshold: 3,
      recoveryTimeout: 30000, // 30 seconds
      monitoringWindow: 120000, // 2 minutes
      expectedErrors: ['ServiceUnavailable', 'SessionExpired'],
    });

    this.bulkhead = resilienceManager.getBulkhead('neo4j', {
      maxConcurrent: 20, // Neo4j connection pool size
      queueSize: 50,
      timeoutMs: 15000,
    });

    this.setupEventHandlers();
  }

  setupEventHandlers() {
    this.circuitBreaker.on('trip', (data) => {
      logger.error(`Neo4j circuit breaker tripped`, data);
      this.emit('circuitTripped', data);
    });

    this.circuitBreaker.on('reset', (data) => {
      logger.info(`Neo4j circuit breaker reset`, data);
      this.emit('circuitReset', data);
    });

    this.circuitBreaker.on('halfOpen', (data) => {
      logger.info(`Neo4j circuit breaker half-open`, data);
      this.emit('circuitHalfOpen', data);
    });
  }

  async session(config = {}) {
    return this.circuitBreaker.execute(async () => {
      return this.bulkhead.execute(async () => {
        return this.driver.session(config);
      });
    });
  }

  async executeRead(query, parameters = {}, config = {}) {
    return this.executeTransaction(query, parameters, 'READ', config);
  }

  async executeWrite(query, parameters = {}, config = {}) {
    return this.executeTransaction(query, parameters, 'WRITE', config);
  }

  async executeTransaction(
    query,
    parameters = {},
    accessMode = 'READ',
    config = {},
  ) {
    return resilienceManager.executeWithResilience(
      `neo4j-${accessMode.toLowerCase()}`,
      async () => {
        const session = await this.session(config);
        try {
          const result = await session.executeRead(async (tx) => {
            if (accessMode === 'WRITE') {
              return await tx.run(query, parameters);
            } else {
              return await tx.run(query, parameters);
            }
          });
          return result;
        } finally {
          await session.close();
        }
      },
      {
        timeout: 30000,
        retry: {
          maxAttempts: 3,
          retryableErrors: [
            'ServiceUnavailable',
            'TransientError',
            'ECONNRESET',
          ],
        },
        circuitBreaker: {
          failureThreshold: 3,
          expectedErrors: ['ClientError'], // Don't trip on client errors
        },
      },
    );
  }

  async healthCheck() {
    try {
      const result = await this.executeRead('RETURN 1 as health');
      return {
        healthy: true,
        latency: Date.now() - Date.now(),
        details: { records: result.records.length },
      };
    } catch (error) {
      return {
        healthy: false,
        error: error.message,
        details: { circuitState: this.circuitBreaker.state },
      };
    }
  }

  getMetrics() {
    return {
      ...this.circuitBreaker.getHealthMetrics(),
      ...this.bulkhead.getStatus(),
      connection: {
        available: this.driver.supportsMultiDb(),
        serverInfo: this.driver.getServerInfo
          ? this.driver.getServerInfo()
          : null,
      },
    };
  }
}

class ResilientPostgresConnection extends EventEmitter {
  constructor(pool) {
    super();
    this.pool = pool;

    this.circuitBreaker = resilienceManager.getCircuitBreaker('postgres', {
      failureThreshold: 5,
      recoveryTimeout: 60000, // 1 minute
      monitoringWindow: 300000, // 5 minutes
      expectedErrors: ['ECONNREFUSED', 'ENOTFOUND'],
    });

    this.bulkhead = resilienceManager.getBulkhead('postgres', {
      maxConcurrent: 15, // Based on pool size
      queueSize: 100,
      timeoutMs: 20000,
    });

    this.setupEventHandlers();
    this.setupPoolEventHandlers();
  }

  setupEventHandlers() {
    this.circuitBreaker.on('trip', (data) => {
      logger.error(`PostgreSQL circuit breaker tripped`, data);
      this.emit('circuitTripped', data);
    });

    this.circuitBreaker.on('reset', (data) => {
      logger.info(`PostgreSQL circuit breaker reset`, data);
      this.emit('circuitReset', data);
    });
  }

  setupPoolEventHandlers() {
    this.pool.on('error', (err, client) => {
      logger.error('PostgreSQL pool error:', err);
      this.emit('poolError', err);
    });

    this.pool.on('connect', (client) => {
      logger.debug('PostgreSQL client connected');
      this.emit('clientConnected');
    });

    this.pool.on('remove', (client) => {
      logger.debug('PostgreSQL client removed');
      this.emit('clientRemoved');
    });
  }

  async query(text, parameters = []) {
    return resilienceManager.executeWithResilience(
      'postgres-query',
      async () => {
        const client = await this.pool.connect();
        try {
          const result = await client.query(text, parameters);
          return result;
        } finally {
          client.release();
        }
      },
      {
        timeout: 20000,
        retry: {
          maxAttempts: 3,
          retryableErrors: ['ECONNRESET', 'ENOTFOUND', 'ETIMEDOUT'],
        },
        circuitBreaker: {
          failureThreshold: 5,
          expectedErrors: ['23505', '23503'], // Unique violation, foreign key violation
        },
      },
    );
  }

  async transaction(queries) {
    return resilienceManager.executeWithResilience(
      'postgres-transaction',
      async () => {
        const client = await this.pool.connect();
        try {
          await client.query('BEGIN');
          const results = [];

          for (const query of queries) {
            const result = await client.query(query.text, query.parameters);
            results.push(result);
          }

          await client.query('COMMIT');
          return results;
        } catch (error) {
          await client.query('ROLLBACK');
          throw error;
        } finally {
          client.release();
        }
      },
      {
        timeout: 30000,
        retry: {
          maxAttempts: 2, // Fewer retries for transactions
          retryableErrors: ['ECONNRESET', 'ENOTFOUND'],
        },
      },
    );
  }

  async healthCheck() {
    try {
      const startTime = Date.now();
      const result = await this.query('SELECT NOW() as current_time');
      const latency = Date.now() - startTime;

      return {
        healthy: true,
        latency,
        details: {
          totalConnections: this.pool.totalCount,
          idleConnections: this.pool.idleCount,
          waitingConnections: this.pool.waitingCount,
        },
      };
    } catch (error) {
      return {
        healthy: false,
        error: error.message,
        details: {
          circuitState: this.circuitBreaker.state,
          poolStats: {
            totalConnections: this.pool.totalCount,
            idleConnections: this.pool.idleCount,
            waitingConnections: this.pool.waitingCount,
          },
        },
      };
    }
  }

  getMetrics() {
    return {
      ...this.circuitBreaker.getHealthMetrics(),
      ...this.bulkhead.getStatus(),
      pool: {
        totalConnections: this.pool.totalCount,
        idleConnections: this.pool.idleCount,
        waitingConnections: this.pool.waitingCount,
      },
    };
  }
}

class ResilientRedisConnection extends EventEmitter {
  constructor(client) {
    super();
    this.client = client;

    this.circuitBreaker = resilienceManager.getCircuitBreaker('redis', {
      failureThreshold: 3,
      recoveryTimeout: 30000, // 30 seconds
      monitoringWindow: 120000, // 2 minutes
      expectedErrors: ['READONLY', 'LOADING', 'MASTERDOWN'],
    });

    this.bulkhead = resilienceManager.getBulkhead('redis', {
      maxConcurrent: 25,
      queueSize: 200,
      timeoutMs: 5000, // Redis should be fast
    });

    this.setupEventHandlers();
  }

  setupEventHandlers() {
    this.circuitBreaker.on('trip', (data) => {
      logger.error(`Redis circuit breaker tripped`, data);
      this.emit('circuitTripped', data);
    });

    this.circuitBreaker.on('reset', (data) => {
      logger.info(`Redis circuit breaker reset`, data);
      this.emit('circuitReset', data);
    });

    if (this.client) {
      this.client.on('error', (err) => {
        logger.error('Redis client error:', err.message);
        this.emit('clientError', err);
      });

      this.client.on('reconnecting', (ms) => {
        logger.info(`Redis reconnecting in ${ms}ms`);
        this.emit('reconnecting', ms);
      });
    }
  }

  async execute(command, ...args) {
    if (!this.client) {
      throw new Error('Redis client not available');
    }

    return resilienceManager.executeWithResilience(
      `redis-${command}`,
      async () => {
        return await this.client[command](...args);
      },
      {
        timeout: 5000,
        retry: {
          maxAttempts: 3,
          retryableErrors: ['ECONNRESET', 'ETIMEDOUT', 'ENOTFOUND'],
        },
        circuitBreaker: {
          failureThreshold: 3,
          expectedErrors: ['WRONGTYPE', 'READONLY'], // Expected Redis errors
        },
      },
    );
  }

  // Common Redis operations with resilience
  async get(key) {
    return this.execute('get', key);
  }

  async set(key, value, ...options) {
    return this.execute('set', key, value, ...options);
  }

  async del(key) {
    return this.execute('del', key);
  }

  async exists(key) {
    return this.execute('exists', key);
  }

  async expire(key, ttl) {
    return this.execute('expire', key, ttl);
  }

  async incr(key) {
    return this.execute('incr', key);
  }

  async hget(key, field) {
    return this.execute('hget', key, field);
  }

  async hset(key, field, value) {
    return this.execute('hset', key, field, value);
  }

  async lpush(key, ...values) {
    return this.execute('lpush', key, ...values);
  }

  async rpop(key) {
    return this.execute('rpop', key);
  }

  async healthCheck() {
    try {
      if (!this.client) {
        return {
          healthy: false,
          error: 'Redis client not available',
          details: { circuitState: this.circuitBreaker.state },
        };
      }

      const startTime = Date.now();
      const result = await this.execute('ping');
      const latency = Date.now() - startTime;

      return {
        healthy: result === 'PONG',
        latency,
        details: {
          status: this.client.status,
          mode: this.client.mode,
        },
      };
    } catch (error) {
      return {
        healthy: false,
        error: error.message,
        details: {
          circuitState: this.circuitBreaker.state,
          clientStatus: this.client ? this.client.status : 'unavailable',
        },
      };
    }
  }

  getMetrics() {
    return {
      ...this.circuitBreaker.getHealthMetrics(),
      ...this.bulkhead.getStatus(),
      client: this.client
        ? {
            status: this.client.status,
            mode: this.client.mode,
            commandQueue: this.client.commandQueueLength,
            offlineQueue: this.client.offlineQueue
              ? this.client.offlineQueue.length
              : 0,
          }
        : null,
    };
  }
}

module.exports = {
  ResilientNeo4jConnection,
  ResilientPostgresConnection,
  ResilientRedisConnection,
};

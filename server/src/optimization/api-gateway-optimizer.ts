// server/src/optimization/api-gateway-optimizer.ts

import { getRedisClient } from '../config/database.js';
import logger from '../utils/logger.js';
import { createHash } from 'crypto';
import { EventEmitter } from 'events';

interface CacheConfig {
  ttl: number;
  staleWhileRevalidate?: number;
  cacheKey?: (req: any) => string;
  shouldCache?: (req: any, res: any) => boolean;
  tags?: string[];
}

interface CircuitBreakerConfig {
  failureThreshold: number;
  resetTimeoutMs: number;
  monitoringPeriodMs: number;
  halfOpenMaxCalls: number;
}

interface CircuitBreakerState {
  state: 'CLOSED' | 'OPEN' | 'HALF_OPEN';
  failures: number;
  successes: number;
  nextAttempt: number;
  lastFailureTime: number;
  halfOpenCalls: number;
}

interface BulkheadConfig {
  maxConcurrent: number;
  queueSize: number;
  timeoutMs: number;
}

interface RequestBatch {
  id: string;
  requests: Array<{
    id: string;
    endpoint: string;
    params: any;
    resolve: (value: any) => void;
    reject: (error: any) => void;
  }>;
  timeoutId: NodeJS.Timeout;
  maxWaitMs: number;
}

interface RouteMetrics {
  totalRequests: number;
  successfulRequests: number;
  failedRequests: number;
  avgResponseTime: number;
  p95ResponseTime: number;
  p99ResponseTime: number;
  cacheHitRate: number;
  circuitBreakerTrips: number;
  lastAccessed: number;
}

interface CostMetrics {
  totalCost: number;
  requestCount: number;
  avgCostPerRequest: number;
  costByEndpoint: Map<string, number>;
  costByUser: Map<string, number>;
  dailyCost: number;
  monthlyCost: number;
}

export class ApiGatewayOptimizer extends EventEmitter {
  private redis = getRedisClient();
  private circuitBreakers: Map<string, CircuitBreakerState> = new Map();
  private bulkheads: Map<string, { active: number; queue: any[] }> = new Map();
  private requestBatches: Map<string, RequestBatch> = new Map();
  private routeMetrics: Map<string, RouteMetrics> = new Map();
  private costMetrics: CostMetrics = {
    totalCost: 0,
    requestCount: 0,
    avgCostPerRequest: 0,
    costByEndpoint: new Map(),
    costByUser: new Map(),
    dailyCost: 0,
    monthlyCost: 0,
  };

  private readonly CACHE_PREFIX = 'api:cache:';
  private readonly METRICS_PREFIX = 'api:metrics:';
  private readonly BATCH_WINDOW_MS = 100;
  private readonly MAX_BATCH_SIZE = 50;

  constructor() {
    super();
    this.initializeMonitoring();
    this.startMaintenanceTasks();
  }

  /**
   * 🚀 CORE: Intelligent response caching with cache invalidation
   */
  createCacheMiddleware(config: CacheConfig) {
    return async (req: any, res: any, next: any) => {
      const startTime = Date.now();
      const routeKey = this.getRouteKey(req);

      try {
        // Skip caching for non-GET requests unless explicitly configured
        if (req.method !== 'GET' && !config.shouldCache) {
          return next();
        }

        // Generate cache key
        const cacheKey = config.cacheKey
          ? config.cacheKey(req)
          : this.generateCacheKey(req);

        // Try to get cached response
        const cachedResponse = await this.getCachedResponse(cacheKey);

        if (cachedResponse) {
          // Check if cache is stale but serve it while revalidating
          const isStale =
            config.staleWhileRevalidate &&
            Date.now() - cachedResponse.timestamp > config.ttl * 1000;

          if (isStale) {
            // Serve stale content immediately
            this.serveCachedResponse(res, cachedResponse);
            this.updateRouteMetrics(
              routeKey,
              Date.now() - startTime,
              true,
              true,
            );

            // Revalidate in background
            this.revalidateInBackground(req, next, cacheKey, config);
            return;
          }

          // Serve fresh cached content
          this.serveCachedResponse(res, cachedResponse);
          this.updateRouteMetrics(routeKey, Date.now() - startTime, true, true);
          this.emit('cacheHit', { routeKey, cacheKey });
          return;
        }

        // Cache miss - execute request and cache response
        const originalSend = res.send;
        const originalJson = res.json;
        let responseData: any;
        let statusCode: number;

        res.send = function (data: any) {
          responseData = data;
          statusCode = this.statusCode;
          return originalSend.call(this, data);
        };

        res.json = function (data: any) {
          responseData = data;
          statusCode = this.statusCode;
          return originalJson.call(this, data);
        };

        // Continue to actual handler
        next();

        // Cache the response after it's sent
        res.on('finish', async () => {
          const responseTime = Date.now() - startTime;
          const shouldCache = config.shouldCache
            ? config.shouldCache(req, { statusCode, data: responseData })
            : this.shouldCacheResponse(statusCode, responseData);

          if (shouldCache) {
            await this.cacheResponse(
              cacheKey,
              {
                statusCode,
                data: responseData,
                headers: res.getHeaders(),
                timestamp: Date.now(),
              },
              config.ttl,
              config.tags,
            );
          }

          this.updateRouteMetrics(
            routeKey,
            responseTime,
            statusCode < 400,
            false,
          );
        });
      } catch (error) {
        logger.error('Cache middleware error:', error);
        next();
      }
    };
  }

  /**
   * ⚡ Circuit Breaker Pattern Implementation
   */
  createCircuitBreakerMiddleware(config: CircuitBreakerConfig) {
    return async (req: any, res: any, next: any) => {
      const routeKey = this.getRouteKey(req);
      const circuitBreaker = this.getCircuitBreaker(routeKey, config);

      // Check circuit breaker state
      if (circuitBreaker.state === 'OPEN') {
        if (Date.now() < circuitBreaker.nextAttempt) {
          // Circuit is open, reject request
          this.emit('circuitBreakerOpen', {
            routeKey,
            failures: circuitBreaker.failures,
          });
          return res.status(503).json({
            error: 'Service temporarily unavailable',
            code: 'CIRCUIT_BREAKER_OPEN',
            retryAfter: Math.ceil(
              (circuitBreaker.nextAttempt - Date.now()) / 1000,
            ),
          });
        } else {
          // Move to half-open state
          circuitBreaker.state = 'HALF_OPEN';
          circuitBreaker.halfOpenCalls = 0;
        }
      }

      if (
        circuitBreaker.state === 'HALF_OPEN' &&
        circuitBreaker.halfOpenCalls >= config.halfOpenMaxCalls
      ) {
        // Too many half-open calls, reject
        return res.status(503).json({
          error: 'Service temporarily unavailable',
          code: 'CIRCUIT_BREAKER_HALF_OPEN_LIMIT',
        });
      }

      // Track the request
      if (circuitBreaker.state === 'HALF_OPEN') {
        circuitBreaker.halfOpenCalls++;
      }

      const startTime = Date.now();

      // Override response to track success/failure
      const originalSend = res.send;
      const originalJson = res.json;

      const trackResponse = (statusCode: number) => {
        const responseTime = Date.now() - startTime;

        if (statusCode >= 500 || responseTime > config.monitoringPeriodMs) {
          // Record failure
          this.recordCircuitBreakerFailure(routeKey, circuitBreaker, config);
        } else {
          // Record success
          this.recordCircuitBreakerSuccess(routeKey, circuitBreaker, config);
        }
      };

      res.send = function (data: any) {
        trackResponse(this.statusCode);
        return originalSend.call(this, data);
      };

      res.json = function (data: any) {
        trackResponse(this.statusCode);
        return originalJson.call(this, data);
      };

      // Handle request timeout
      const timeout = setTimeout(() => {
        this.recordCircuitBreakerFailure(routeKey, circuitBreaker, config);
        if (!res.headersSent) {
          res.status(408).json({
            error: 'Request timeout',
            code: 'CIRCUIT_BREAKER_TIMEOUT',
          });
        }
      }, config.monitoringPeriodMs);

      res.on('finish', () => {
        clearTimeout(timeout);
      });

      next();
    };
  }

  /**
   * 🚧 Bulkhead Pattern for Resource Isolation
   */
  createBulkheadMiddleware(config: BulkheadConfig) {
    return async (req: any, res: any, next: any) => {
      const routeKey = this.getRouteKey(req);
      const bulkhead = this.getBulkhead(routeKey);

      // Check if we can proceed immediately
      if (bulkhead.active < config.maxConcurrent) {
        bulkhead.active++;

        // Track completion
        const complete = () => {
          bulkhead.active--;
          // Process next queued request if any
          if (bulkhead.queue.length > 0) {
            const nextRequest = bulkhead.queue.shift();
            if (nextRequest) {
              process.nextTick(() => nextRequest.execute());
            }
          }
        };

        res.on('finish', complete);
        res.on('close', complete);

        return next();
      }

      // Check queue capacity
      if (bulkhead.queue.length >= config.queueSize) {
        this.emit('bulkheadRejection', {
          routeKey,
          queueSize: bulkhead.queue.length,
        });
        return res.status(429).json({
          error: 'Too many requests',
          code: 'BULKHEAD_QUEUE_FULL',
          retryAfter: 1,
        });
      }

      // Queue the request
      const queuedRequest = {
        execute: () => {
          bulkhead.active++;

          const complete = () => {
            bulkhead.active--;
            if (bulkhead.queue.length > 0) {
              const nextRequest = bulkhead.queue.shift();
              if (nextRequest) {
                process.nextTick(() => nextRequest.execute());
              }
            }
          };

          res.on('finish', complete);
          res.on('close', complete);

          next();
        },
      };

      bulkhead.queue.push(queuedRequest);

      // Set timeout for queued request
      setTimeout(() => {
        const index = bulkhead.queue.indexOf(queuedRequest);
        if (index > -1) {
          bulkhead.queue.splice(index, 1);
          if (!res.headersSent) {
            res.status(408).json({
              error: 'Request timeout in queue',
              code: 'BULKHEAD_QUEUE_TIMEOUT',
            });
          }
        }
      }, config.timeoutMs);
    };
  }

  /**
   * 📦 Request Batching and Coalescing
   */
  createBatchingMiddleware() {
    return async (req: any, res: any, next: any) => {
      const routeKey = this.getRouteKey(req);

      // Only batch GET requests to specific endpoints
      if (req.method !== 'GET' || !this.isBatchableEndpoint(routeKey)) {
        return next();
      }

      const batchKey = this.generateBatchKey(req);
      const requestId = this.generateRequestId();

      return new Promise((resolve, reject) => {
        const requestEntry = {
          id: requestId,
          endpoint: routeKey,
          params: { ...req.query, ...req.params },
          resolve: (data: any) => {
            res.json(data);
            resolve(data);
          },
          reject: (error: any) => {
            res.status(500).json({ error: error.message });
            reject(error);
          },
        };

        // Get or create batch
        let batch = this.requestBatches.get(batchKey);
        if (!batch) {
          batch = {
            id: this.generateBatchId(),
            requests: [],
            timeoutId: setTimeout(() => {
              this.executeBatch(batchKey);
            }, this.BATCH_WINDOW_MS),
            maxWaitMs: this.BATCH_WINDOW_MS,
          };
          this.requestBatches.set(batchKey, batch);
        }

        batch.requests.push(requestEntry);

        // Execute immediately if batch is full
        if (batch.requests.length >= this.MAX_BATCH_SIZE) {
          clearTimeout(batch.timeoutId);
          this.executeBatch(batchKey);
        }
      });
    };
  }

  /**
   * 💡 Intelligent Cache Invalidation
   */
  async invalidateCache(tags?: string[], patterns?: string[]): Promise<void> {
    if (!this.redis) return;

    const keysToDelete: string[] = [];

    // Invalidate by tags
    if (tags && tags.length > 0) {
      for (const tag of tags) {
        const taggedKeys = await this.redis.smembers(`cache:tags:${tag}`);
        keysToDelete.push(...taggedKeys);

        // Clean up tag set
        await this.redis.del(`cache:tags:${tag}`);
      }
    }

    // Invalidate by patterns
    if (patterns && patterns.length > 0) {
      for (const pattern of patterns) {
        const matchingKeys = await this.redis.keys(
          `${this.CACHE_PREFIX}${pattern}`,
        );
        keysToDelete.push(...matchingKeys);
      }
    }

    // Remove duplicates and delete keys
    const uniqueKeys = [...new Set(keysToDelete)];
    if (uniqueKeys.length > 0) {
      await this.redis.del(...uniqueKeys);
      this.emit('cacheInvalidation', {
        tags,
        patterns,
        keysDeleted: uniqueKeys.length,
      });
      logger.info(`Invalidated ${uniqueKeys.length} cache entries`, {
        tags,
        patterns,
      });
    }
  }

  /**
   * 💰 Cost Optimization and Budget Tracking
   */
  trackRequestCost(userId: string, endpoint: string, cost: number): void {
    this.costMetrics.totalCost += cost;
    this.costMetrics.requestCount += 1;
    this.costMetrics.avgCostPerRequest =
      this.costMetrics.totalCost / this.costMetrics.requestCount;

    // Track by endpoint
    const endpointCost = this.costMetrics.costByEndpoint.get(endpoint) || 0;
    this.costMetrics.costByEndpoint.set(endpoint, endpointCost + cost);

    // Track by user
    const userCost = this.costMetrics.costByUser.get(userId) || 0;
    this.costMetrics.costByUser.set(userId, userCost + cost);

    // Update daily/monthly costs
    this.updatePeriodCosts();

    this.emit('costTracked', {
      userId,
      endpoint,
      cost,
      totalCost: this.costMetrics.totalCost,
    });
  }

  async checkBudgetLimit(
    userId: string,
    requestCost: number,
  ): Promise<{
    allowed: boolean;
    reason?: string;
    currentSpend: number;
    limit: number;
  }> {
    const userBudget = await this.getUserBudget(userId);
    const currentSpend = this.costMetrics.costByUser.get(userId) || 0;

    if (currentSpend + requestCost > userBudget.limit) {
      return {
        allowed: false,
        reason: 'Budget limit exceeded',
        currentSpend,
        limit: userBudget.limit,
      };
    }

    return {
      allowed: true,
      currentSpend,
      limit: userBudget.limit,
    };
  }

  createBudgetMiddleware() {
    return async (req: any, res: any, next: any) => {
      const userId = (req as any).user?.id;
      if (!userId) return next();

      const estimatedCost = this.estimateRequestCost(req);
      const budgetCheck = await this.checkBudgetLimit(userId, estimatedCost);

      if (!budgetCheck.allowed) {
        this.emit('budgetExceeded', { userId, estimatedCost, ...budgetCheck });
        return res.status(402).json({
          error: 'Budget limit exceeded',
          code: 'BUDGET_EXCEEDED',
          currentSpend: budgetCheck.currentSpend,
          limit: budgetCheck.limit,
          estimatedCost,
        });
      }

      // Track actual cost after request completion
      res.on('finish', () => {
        const actualCost = this.calculateActualCost(req, res);
        this.trackRequestCost(userId, this.getRouteKey(req), actualCost);
      });

      next();
    };
  }

  /**
   * 🔧 Utility Methods
   */
  private initializeMonitoring(): void {
    setInterval(() => {
      this.emitMetrics();
      this.cleanupExpiredBatches();
      this.updateCircuitBreakerStates();
    }, 30000); // Every 30 seconds
  }

  private startMaintenanceTasks(): void {
    setInterval(() => {
      this.cleanupExpiredMetrics();
      this.optimizeCacheStorage();
    }, 300000); // Every 5 minutes
  }

  private getRouteKey(req: any): string {
    return `${req.method}:${req.route?.path || req.path}`;
  }

  private generateCacheKey(req: any): string {
    const route = this.getRouteKey(req);
    const query = JSON.stringify(req.query, Object.keys(req.query).sort());
    const params = JSON.stringify(req.params, Object.keys(req.params).sort());
    const userId = (req as any).user?.id || 'anonymous';

    return createHash('md5')
      .update(`${route}:${query}:${params}:${userId}`)
      .digest('hex');
  }

  private generateBatchKey(req: any): string {
    const route = this.getRouteKey(req);
    return `${route}:${Math.floor(Date.now() / this.BATCH_WINDOW_MS)}`;
  }

  private generateRequestId(): string {
    return `req_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  private generateBatchId(): string {
    return `batch_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  private async getCachedResponse(cacheKey: string): Promise<any> {
    if (!this.redis) return null;

    const cached = await this.redis.get(`${this.CACHE_PREFIX}${cacheKey}`);
    if (!cached) return null;

    try {
      return JSON.parse(cached);
    } catch (error) {
      logger.warn('Failed to parse cached response', { cacheKey });
      await this.redis.del(`${this.CACHE_PREFIX}${cacheKey}`);
      return null;
    }
  }

  private async cacheResponse(
    cacheKey: string,
    response: any,
    ttl: number,
    tags?: string[],
  ): Promise<void> {
    if (!this.redis) return;

    try {
      // Cache the response
      await this.redis.setex(
        `${this.CACHE_PREFIX}${cacheKey}`,
        ttl,
        JSON.stringify(response),
      );

      // Add to tag sets for invalidation
      if (tags && tags.length > 0) {
        for (const tag of tags) {
          await this.redis.sadd(
            `cache:tags:${tag}`,
            `${this.CACHE_PREFIX}${cacheKey}`,
          );
          await this.redis.expire(`cache:tags:${tag}`, ttl + 3600); // Tags expire 1 hour after cache
        }
      }
    } catch (error) {
      logger.warn('Failed to cache response', {
        cacheKey,
        error: error.message,
      });
    }
  }

  private serveCachedResponse(res: any, cachedResponse: any): void {
    res.status(cachedResponse.statusCode);

    // Set cached headers
    if (cachedResponse.headers) {
      Object.entries(cachedResponse.headers).forEach(([key, value]) => {
        res.set(key, value);
      });
    }

    // Add cache headers
    res.set('X-Cache-Status', 'HIT');
    res.set('X-Cache-Time', new Date(cachedResponse.timestamp).toISOString());

    res.send(cachedResponse.data);
  }

  private shouldCacheResponse(statusCode: number, data: any): boolean {
    // Only cache successful responses
    if (statusCode >= 400) return false;

    // Don't cache empty responses
    if (!data) return false;

    // Don't cache very large responses (>1MB)
    if (JSON.stringify(data).length > 1024 * 1024) return false;

    return true;
  }

  private async revalidateInBackground(
    req: any,
    next: any,
    cacheKey: string,
    config: CacheConfig,
  ): Promise<void> {
    // This would trigger a background request to update the cache
    // Implementation depends on your specific framework
    process.nextTick(async () => {
      try {
        // Execute request handler to get fresh data
        // This is simplified - real implementation would depend on your routing framework
        logger.info('Background revalidation started', { cacheKey });
      } catch (error) {
        logger.warn('Background revalidation failed', {
          cacheKey,
          error: error.message,
        });
      }
    });
  }

  private getCircuitBreaker(
    routeKey: string,
    config: CircuitBreakerConfig,
  ): CircuitBreakerState {
    if (!this.circuitBreakers.has(routeKey)) {
      this.circuitBreakers.set(routeKey, {
        state: 'CLOSED',
        failures: 0,
        successes: 0,
        nextAttempt: 0,
        lastFailureTime: 0,
        halfOpenCalls: 0,
      });
    }
    return this.circuitBreakers.get(routeKey)!;
  }

  private recordCircuitBreakerFailure(
    routeKey: string,
    circuitBreaker: CircuitBreakerState,
    config: CircuitBreakerConfig,
  ): void {
    circuitBreaker.failures++;
    circuitBreaker.lastFailureTime = Date.now();

    if (circuitBreaker.state === 'HALF_OPEN') {
      // Half-open failure immediately opens the circuit
      circuitBreaker.state = 'OPEN';
      circuitBreaker.nextAttempt = Date.now() + config.resetTimeoutMs;
      this.emit('circuitBreakerOpened', {
        routeKey,
        failures: circuitBreaker.failures,
      });
    } else if (circuitBreaker.failures >= config.failureThreshold) {
      // Threshold reached, open the circuit
      circuitBreaker.state = 'OPEN';
      circuitBreaker.nextAttempt = Date.now() + config.resetTimeoutMs;
      this.updateRouteMetrics(routeKey, 0, false, false, true);
      this.emit('circuitBreakerOpened', {
        routeKey,
        failures: circuitBreaker.failures,
      });
    }
  }

  private recordCircuitBreakerSuccess(
    routeKey: string,
    circuitBreaker: CircuitBreakerState,
    config: CircuitBreakerConfig,
  ): void {
    circuitBreaker.successes++;

    if (circuitBreaker.state === 'HALF_OPEN') {
      // Successful half-open call
      if (circuitBreaker.halfOpenCalls >= config.halfOpenMaxCalls) {
        // Enough successful calls, close the circuit
        circuitBreaker.state = 'CLOSED';
        circuitBreaker.failures = 0;
        circuitBreaker.successes = 0;
        circuitBreaker.halfOpenCalls = 0;
        this.emit('circuitBreakerClosed', { routeKey });
      }
    } else if (circuitBreaker.state === 'CLOSED') {
      // Reset failure count on success
      if (circuitBreaker.failures > 0) {
        circuitBreaker.failures = Math.max(0, circuitBreaker.failures - 1);
      }
    }
  }

  private getBulkhead(routeKey: string): { active: number; queue: any[] } {
    if (!this.bulkheads.has(routeKey)) {
      this.bulkheads.set(routeKey, { active: 0, queue: [] });
    }
    return this.bulkheads.get(routeKey)!;
  }

  private isBatchableEndpoint(routeKey: string): boolean {
    // Define which endpoints can be batched
    const batchablePatterns = [
      'GET:/api/entities',
      'GET:/api/search',
      'GET:/api/analytics',
    ];

    return batchablePatterns.some((pattern) => routeKey.includes(pattern));
  }

  private async executeBatch(batchKey: string): Promise<void> {
    const batch = this.requestBatches.get(batchKey);
    if (!batch || batch.requests.length === 0) return;

    try {
      this.emit('batchExecution', {
        batchId: batch.id,
        requestCount: batch.requests.length,
      });

      // Group requests by endpoint and parameters similarity
      const groupedRequests = this.groupSimilarRequests(batch.requests);

      // Execute each group
      for (const group of groupedRequests) {
        await this.executeBatchGroup(group);
      }
    } catch (error) {
      logger.error('Batch execution failed', {
        batchKey,
        error: error.message,
      });

      // Reject all requests in the batch
      batch.requests.forEach((req) => {
        req.reject(new Error('Batch execution failed'));
      });
    } finally {
      this.requestBatches.delete(batchKey);
    }
  }

  private groupSimilarRequests(requests: any[]): any[][] {
    // Group requests that can be efficiently batched together
    const groups: any[][] = [];
    const processed = new Set();

    for (let i = 0; i < requests.length; i++) {
      if (processed.has(i)) continue;

      const group = [requests[i]];
      processed.add(i);

      // Find similar requests
      for (let j = i + 1; j < requests.length; j++) {
        if (processed.has(j)) continue;

        if (this.areRequestsSimilar(requests[i], requests[j])) {
          group.push(requests[j]);
          processed.add(j);
        }
      }

      groups.push(group);
    }

    return groups;
  }

  private areRequestsSimilar(req1: any, req2: any): boolean {
    // Check if requests can be batched together
    if (req1.endpoint !== req2.endpoint) return false;

    // Check parameter similarity (simplified)
    const params1 = JSON.stringify(
      req1.params,
      Object.keys(req1.params).sort(),
    );
    const params2 = JSON.stringify(
      req2.params,
      Object.keys(req2.params).sort(),
    );

    return params1 === params2;
  }

  private async executeBatchGroup(group: any[]): Promise<void> {
    // This would execute the actual batched request
    // Implementation depends on your specific API endpoints

    // For demonstration, we'll simulate processing each request
    for (const request of group) {
      try {
        // Simulate API call
        const result = await this.simulateApiCall(request);
        request.resolve(result);
      } catch (error) {
        request.reject(error);
      }
    }
  }

  private async simulateApiCall(request: any): Promise<any> {
    // Simulate different API responses based on endpoint
    await new Promise((resolve) => setTimeout(resolve, 100)); // Simulate latency

    return {
      id: request.id,
      data: `Processed ${request.endpoint}`,
      timestamp: Date.now(),
    };
  }

  private updateRouteMetrics(
    routeKey: string,
    responseTime: number,
    success: boolean,
    cacheHit: boolean,
    circuitBreakerTrip: boolean = false,
  ): void {
    let metrics = this.routeMetrics.get(routeKey);
    if (!metrics) {
      metrics = {
        totalRequests: 0,
        successfulRequests: 0,
        failedRequests: 0,
        avgResponseTime: 0,
        p95ResponseTime: 0,
        p99ResponseTime: 0,
        cacheHitRate: 0,
        circuitBreakerTrips: 0,
        lastAccessed: 0,
      };
      this.routeMetrics.set(routeKey, metrics);
    }

    metrics.totalRequests++;
    if (success) {
      metrics.successfulRequests++;
    } else {
      metrics.failedRequests++;
    }

    // Update response time metrics (simplified)
    metrics.avgResponseTime =
      (metrics.avgResponseTime * (metrics.totalRequests - 1) + responseTime) /
      metrics.totalRequests;

    // Update cache hit rate
    const cacheHits = cacheHit ? 1 : 0;
    metrics.cacheHitRate =
      (metrics.cacheHitRate * (metrics.totalRequests - 1) + cacheHits) /
      metrics.totalRequests;

    if (circuitBreakerTrip) {
      metrics.circuitBreakerTrips++;
    }

    metrics.lastAccessed = Date.now();
  }

  private estimateRequestCost(req: any): number {
    const routeKey = this.getRouteKey(req);

    // Base costs by endpoint type
    const baseCosts = {
      'POST:/api/ai/': 0.05,
      'GET:/api/search': 0.01,
      'GET:/api/entities': 0.005,
      'POST:/api/analysis': 0.03,
    };

    let cost = 0.001; // Default base cost

    for (const [pattern, patternCost] of Object.entries(baseCosts)) {
      if (routeKey.includes(pattern)) {
        cost = patternCost;
        break;
      }
    }

    // Adjust based on complexity
    if (req.body && JSON.stringify(req.body).length > 1000) {
      cost *= 1.5; // Large payloads cost more
    }

    if (req.query.limit && parseInt(req.query.limit) > 100) {
      cost *= 1.3; // Large result sets cost more
    }

    return cost;
  }

  private calculateActualCost(req: any, res: any): number {
    let estimatedCost = this.estimateRequestCost(req);

    // Adjust based on response
    if (res.statusCode >= 500) {
      estimatedCost *= 0.5; // Reduced cost for errors
    }

    const responseSize = res.get('content-length');
    if (responseSize && parseInt(responseSize) > 10000) {
      estimatedCost *= 1.2; // Larger responses cost more
    }

    return estimatedCost;
  }

  private async getUserBudget(
    userId: string,
  ): Promise<{ limit: number; period: string }> {
    // This would fetch from database or configuration
    // Simplified implementation
    return {
      limit: 10.0, // $10 per month
      period: 'monthly',
    };
  }

  private updatePeriodCosts(): void {
    // Update daily/monthly cost tracking
    // This would typically involve date-based aggregation
    const now = new Date();
    const today = now.toISOString().split('T')[0];
    const month = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;

    // This is simplified - real implementation would track historical data
    this.costMetrics.dailyCost = this.costMetrics.totalCost; // Simplified
    this.costMetrics.monthlyCost = this.costMetrics.totalCost; // Simplified
  }

  private emitMetrics(): void {
    const metrics = {
      routes: Object.fromEntries(this.routeMetrics),
      circuitBreakers: Object.fromEntries(this.circuitBreakers),
      bulkheads: Object.fromEntries(this.bulkheads),
      costs: this.costMetrics,
      activeBatches: this.requestBatches.size,
    };

    this.emit('performanceMetrics', metrics);
  }

  private cleanupExpiredBatches(): void {
    const now = Date.now();
    for (const [key, batch] of this.requestBatches) {
      // Clean up batches that are too old
      if (
        now - parseInt(key.split(':').pop()!) * this.BATCH_WINDOW_MS >
        60000
      ) {
        clearTimeout(batch.timeoutId);
        this.requestBatches.delete(key);
      }
    }
  }

  private updateCircuitBreakerStates(): void {
    const now = Date.now();
    for (const [routeKey, state] of this.circuitBreakers) {
      // Reset circuit breaker if timeout has passed
      if (state.state === 'OPEN' && now >= state.nextAttempt) {
        state.state = 'HALF_OPEN';
        state.halfOpenCalls = 0;
        this.emit('circuitBreakerTransition', {
          routeKey,
          newState: 'HALF_OPEN',
        });
      }
    }
  }

  private cleanupExpiredMetrics(): void {
    const cutoffTime = Date.now() - 24 * 60 * 60 * 1000; // 24 hours ago

    for (const [routeKey, metrics] of this.routeMetrics) {
      if (metrics.lastAccessed < cutoffTime) {
        this.routeMetrics.delete(routeKey);
      }
    }
  }

  private async optimizeCacheStorage(): Promise<void> {
    if (!this.redis) return;

    try {
      // Get cache statistics
      const keys = await this.redis.keys(`${this.CACHE_PREFIX}*`);
      const totalKeys = keys.length;

      if (totalKeys > 10000) {
        // Too many keys
        // Remove least recently accessed items
        const sampleSize = Math.min(1000, totalKeys);
        const sampleKeys = keys.slice(0, sampleSize);

        const keyStats = [];
        for (const key of sampleKeys) {
          const ttl = await this.redis.ttl(key);
          keyStats.push({ key, ttl });
        }

        // Sort by TTL (ascending) and remove items with low TTL first
        keyStats.sort((a, b) => a.ttl - b.ttl);
        const keysToRemove = keyStats
          .slice(0, Math.floor(sampleSize * 0.1))
          .map((stat) => stat.key);

        if (keysToRemove.length > 0) {
          await this.redis.del(...keysToRemove);
          logger.info(
            `Cleaned up ${keysToRemove.length} cache entries for storage optimization`,
          );
        }
      }
    } catch (error) {
      logger.warn('Cache optimization failed:', error);
    }
  }

  /**
   * 📊 Public API for performance insights
   */
  async getPerformanceReport(): Promise<any> {
    const report = {
      routes: Object.fromEntries(this.routeMetrics),
      circuitBreakers: Object.fromEntries(
        Array.from(this.circuitBreakers.entries()).map(([key, value]) => [
          key,
          {
            ...value,
            nextAttemptIn: Math.max(0, value.nextAttempt - Date.now()),
          },
        ]),
      ),
      bulkheads: Object.fromEntries(this.bulkheads),
      costs: {
        ...this.costMetrics,
        topCostlyEndpoints: Array.from(
          this.costMetrics.costByEndpoint.entries(),
        )
          .sort(([, a], [, b]) => b - a)
          .slice(0, 10),
        topUsers: Array.from(this.costMetrics.costByUser.entries())
          .sort(([, a], [, b]) => b - a)
          .slice(0, 10),
      },
      cache: await this.getCacheStats(),
    };

    return report;
  }

  private async getCacheStats(): Promise<any> {
    if (!this.redis) return { available: false };

    try {
      const keys = await this.redis.keys(`${this.CACHE_PREFIX}*`);
      return {
        available: true,
        totalEntries: keys.length,
        memoryUsage: 'N/A', // Would need Redis MEMORY command
      };
    } catch (error) {
      return { available: false, error: error.message };
    }
  }

  async clearAllCaches(): Promise<void> {
    if (!this.redis) return;

    const keys = await this.redis.keys(`${this.CACHE_PREFIX}*`);
    if (keys.length > 0) {
      await this.redis.del(...keys);
      logger.info(`Cleared all ${keys.length} cache entries`);
    }
  }
}

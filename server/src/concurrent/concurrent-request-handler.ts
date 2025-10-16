/**
 * Concurrent Request Handler - Enhanced parallel processing for high-throughput scenarios
 * Implements advanced queuing, load balancing, and resource management
 */

import { EventEmitter } from 'events';
import { Worker, isMainThread, parentPort, workerData } from 'worker_threads';
import { randomUUID } from 'crypto';
import { Logger } from 'pino';
import { z } from 'zod';
import Redis from 'ioredis';

// Types and interfaces
export interface RequestContext {
  id: string;
  tenantId: string;
  userId: string;
  priority: number; // 0-10, higher = more priority
  timeout: number;
  retries: number;
  metadata: Record<string, any>;
  correlationId?: string;
}

export interface ProcessingResult<T = any> {
  requestId: string;
  success: boolean;
  data?: T;
  error?: string;
  duration: number;
  resources: {
    memoryUsed: number;
    cpuTime: number;
  };
}

export interface QueueMetrics {
  pending: number;
  processing: number;
  completed: number;
  failed: number;
  avgWaitTime: number;
  avgProcessingTime: number;
  throughput: number; // requests per second
}

export interface WorkerPoolConfig {
  minWorkers: number;
  maxWorkers: number;
  idleTimeout: number;
  maxQueueSize: number;
  maxConcurrentPerWorker: number;
}

export interface LoadBalancerConfig {
  algorithm:
    | 'round-robin'
    | 'least-connections'
    | 'weighted-response-time'
    | 'adaptive';
  healthCheckInterval: number;
  failureThreshold: number;
  recoveryThreshold: number;
}

// Request validation schema
const RequestContextSchema = z.object({
  id: z.string(),
  tenantId: z.string(),
  userId: z.string(),
  priority: z.number().int().min(0).max(10),
  timeout: z.number().positive().max(300000), // max 5 minutes
  retries: z.number().int().min(0).max(5),
  metadata: z.record(z.any()),
  correlationId: z.string().optional(),
});

export class ConcurrentRequestHandler extends EventEmitter {
  private redis: Redis;
  private logger: Logger;
  private workerPool: WorkerPool;
  private loadBalancer: LoadBalancer;
  private rateLimiter: RateLimiter;
  private metrics: MetricsCollector;

  // Queue management
  private priorityQueues: Map<number, RequestContext[]> = new Map();
  private processingRequests: Map<string, RequestContext> = new Map();
  private requestResults: Map<string, ProcessingResult> = new Map();

  // Configuration
  private maxConcurrent: number = 50;
  private batchSize: number = 10;
  private backpressureThreshold: number = 100;

  constructor(
    redis: Redis,
    logger: Logger,
    workerPoolConfig: WorkerPoolConfig,
    loadBalancerConfig: LoadBalancerConfig,
  ) {
    super();

    this.redis = redis;
    this.logger = logger;
    this.workerPool = new WorkerPool(workerPoolConfig, logger);
    this.loadBalancer = new LoadBalancer(loadBalancerConfig, logger);
    this.rateLimiter = new RateLimiter(redis, logger);
    this.metrics = new MetricsCollector(logger);

    // Initialize priority queues (0-10)
    for (let i = 0; i <= 10; i++) {
      this.priorityQueues.set(i, []);
    }

    // Start processing loop
    this.startProcessingLoop();

    // Start metrics collection
    this.metrics.start();

    // Setup cleanup
    process.on('SIGTERM', () => this.gracefulShutdown());
    process.on('SIGINT', () => this.gracefulShutdown());
  }

  /**
   * Submit request for concurrent processing
   */
  async submitRequest<T>(
    request: RequestContext,
    processor: (ctx: RequestContext) => Promise<T>,
  ): Promise<string> {
    // Validate request
    const validation = RequestContextSchema.safeParse(request);
    if (!validation.success) {
      throw new Error(`Invalid request: ${validation.error.message}`);
    }

    const startTime = Date.now();

    try {
      // Rate limiting check
      const rateLimitResult = await this.rateLimiter.checkLimit(
        request.tenantId,
      );
      if (!rateLimitResult.allowed) {
        throw new Error(`Rate limit exceeded: ${rateLimitResult.reason}`);
      }

      // Backpressure check
      const totalQueued = this.getTotalQueuedRequests();
      if (totalQueued >= this.backpressureThreshold) {
        throw new Error('System overloaded - backpressure applied');
      }

      // Add correlation ID if not provided
      if (!request.correlationId) {
        request.correlationId = randomUUID();
      }

      // Store processor function for the worker
      await this.redis.setex(
        `processor:${request.id}`,
        300, // 5 minutes
        JSON.stringify({
          processorCode: processor.toString(),
          context: request,
        }),
      );

      // Add to priority queue
      const priority = Math.max(0, Math.min(10, request.priority));
      this.priorityQueues.get(priority)!.push(request);

      // Update metrics
      this.metrics.recordRequestSubmitted(request.tenantId, startTime);

      // Emit event
      this.emit('requestSubmitted', { requestId: request.id, priority });

      this.logger.info(
        {
          requestId: request.id,
          tenantId: request.tenantId,
          priority,
          queueLength: totalQueued + 1,
        },
        'Request submitted to concurrent handler',
      );

      return request.id;
    } catch (error) {
      this.logger.error(
        {
          requestId: request.id,
          error: error.message,
        },
        'Failed to submit request',
      );

      this.metrics.recordRequestFailed(request.tenantId, startTime);
      throw error;
    }
  }

  /**
   * Get result of processed request
   */
  async getResult(
    requestId: string,
    timeout: number = 30000,
  ): Promise<ProcessingResult> {
    const startTime = Date.now();

    while (Date.now() - startTime < timeout) {
      // Check local cache
      const result = this.requestResults.get(requestId);
      if (result) {
        this.requestResults.delete(requestId); // Clean up
        return result;
      }

      // Check Redis cache
      const redisResult = await this.redis.get(`result:${requestId}`);
      if (redisResult) {
        const result = JSON.parse(redisResult) as ProcessingResult;
        await this.redis.del(`result:${requestId}`); // Clean up
        return result;
      }

      // Wait a bit before checking again
      await new Promise((resolve) => setTimeout(resolve, 100));
    }

    throw new Error(`Timeout waiting for result of request ${requestId}`);
  }

  /**
   * Get current queue metrics
   */
  getQueueMetrics(): QueueMetrics {
    const pending = this.getTotalQueuedRequests();
    const processing = this.processingRequests.size;

    return {
      pending,
      processing,
      completed: this.metrics.getCompletedCount(),
      failed: this.metrics.getFailedCount(),
      avgWaitTime: this.metrics.getAverageWaitTime(),
      avgProcessingTime: this.metrics.getAverageProcessingTime(),
      throughput: this.metrics.getThroughput(),
    };
  }

  /**
   * Main processing loop
   */
  private async startProcessingLoop(): Promise<void> {
    while (true) {
      try {
        const batch = this.getNextBatch();

        if (batch.length === 0) {
          await new Promise((resolve) => setTimeout(resolve, 10)); // 10ms wait
          continue;
        }

        // Process batch concurrently
        await this.processBatch(batch);
      } catch (error) {
        this.logger.error({ error: error.message }, 'Error in processing loop');
        await new Promise((resolve) => setTimeout(resolve, 1000)); // 1s backoff
      }
    }
  }

  /**
   * Get next batch of requests to process (priority-based)
   */
  private getNextBatch(): RequestContext[] {
    const batch: RequestContext[] = [];
    const availableSlots = this.maxConcurrent - this.processingRequests.size;

    if (availableSlots <= 0) {
      return batch;
    }

    const batchSize = Math.min(this.batchSize, availableSlots);

    // Process from highest to lowest priority
    for (
      let priority = 10;
      priority >= 0 && batch.length < batchSize;
      priority--
    ) {
      const queue = this.priorityQueues.get(priority)!;

      while (queue.length > 0 && batch.length < batchSize) {
        const request = queue.shift()!;
        batch.push(request);
      }
    }

    return batch;
  }

  /**
   * Process batch of requests
   */
  private async processBatch(batch: RequestContext[]): Promise<void> {
    const processingPromises = batch.map((request) =>
      this.processRequest(request),
    );

    // Wait for all to complete (or fail)
    await Promise.allSettled(processingPromises);
  }

  /**
   * Process individual request
   */
  private async processRequest(request: RequestContext): Promise<void> {
    const startTime = Date.now();

    // Mark as processing
    this.processingRequests.set(request.id, request);

    try {
      this.logger.debug(
        {
          requestId: request.id,
          tenantId: request.tenantId,
        },
        'Starting request processing',
      );

      // Get optimal worker
      const worker = await this.loadBalancer.getOptimalWorker(
        await this.workerPool.getAvailableWorkers(),
      );

      if (!worker) {
        throw new Error('No available workers');
      }

      // Execute on worker with timeout
      const result = await this.executeOnWorker(worker, request);

      // Store result
      this.requestResults.set(request.id, result);
      await this.redis.setex(
        `result:${request.id}`,
        300,
        JSON.stringify(result),
      );

      // Update metrics
      this.metrics.recordRequestCompleted(
        request.tenantId,
        startTime,
        result.duration,
      );

      // Emit success event
      this.emit('requestCompleted', {
        requestId: request.id,
        success: true,
        duration: result.duration,
      });

      this.logger.info(
        {
          requestId: request.id,
          tenantId: request.tenantId,
          duration: result.duration,
          success: result.success,
        },
        'Request processed successfully',
      );
    } catch (error) {
      const duration = Date.now() - startTime;

      // Create error result
      const result: ProcessingResult = {
        requestId: request.id,
        success: false,
        error: error.message,
        duration,
        resources: { memoryUsed: 0, cpuTime: 0 },
      };

      // Store error result
      this.requestResults.set(request.id, result);
      await this.redis.setex(
        `result:${request.id}`,
        300,
        JSON.stringify(result),
      );

      // Update metrics
      this.metrics.recordRequestFailed(request.tenantId, startTime);

      // Emit failure event
      this.emit('requestFailed', {
        requestId: request.id,
        error: error.message,
        duration,
      });

      this.logger.error(
        {
          requestId: request.id,
          tenantId: request.tenantId,
          error: error.message,
          duration,
        },
        'Request processing failed',
      );

      // Retry if configured
      if (request.retries > 0) {
        request.retries--;
        this.priorityQueues
          .get(Math.max(0, request.priority - 1))!
          .push(request);
      }
    } finally {
      // Remove from processing
      this.processingRequests.delete(request.id);
    }
  }

  /**
   * Execute request on worker thread
   */
  private async executeOnWorker(
    worker: Worker,
    request: RequestContext,
  ): Promise<ProcessingResult> {
    return new Promise((resolve, reject) => {
      const timeout = setTimeout(() => {
        reject(new Error('Worker execution timeout'));
      }, request.timeout);

      worker.once('message', (result) => {
        clearTimeout(timeout);

        if (result.error) {
          reject(new Error(result.error));
        } else {
          resolve(result);
        }
      });

      worker.once('error', (error) => {
        clearTimeout(timeout);
        reject(error);
      });

      // Send request to worker
      worker.postMessage({
        type: 'execute',
        requestId: request.id,
        context: request,
      });
    });
  }

  /**
   * Get total queued requests across all priorities
   */
  private getTotalQueuedRequests(): number {
    let total = 0;
    for (const queue of this.priorityQueues.values()) {
      total += queue.length;
    }
    return total;
  }

  /**
   * Graceful shutdown
   */
  private async gracefulShutdown(): Promise<void> {
    this.logger.info(
      'Starting graceful shutdown of concurrent request handler',
    );

    try {
      // Stop accepting new requests
      this.maxConcurrent = 0;

      // Wait for processing requests to complete (max 30 seconds)
      const shutdownTimeout = 30000;
      const startTime = Date.now();

      while (
        this.processingRequests.size > 0 &&
        Date.now() - startTime < shutdownTimeout
      ) {
        await new Promise((resolve) => setTimeout(resolve, 100));
      }

      // Cleanup workers
      await this.workerPool.shutdown();

      // Stop metrics collection
      this.metrics.stop();

      this.logger.info('Graceful shutdown completed');
    } catch (error) {
      this.logger.error(
        { error: error.message },
        'Error during graceful shutdown',
      );
    }
  }
}

/**
 * Worker Pool Management
 */
class WorkerPool {
  private workers: Map<string, Worker> = new Map();
  private config: WorkerPoolConfig;
  private logger: Logger;

  constructor(config: WorkerPoolConfig, logger: Logger) {
    this.config = config;
    this.logger = logger;
    this.initializeWorkers();
  }

  private initializeWorkers(): void {
    for (let i = 0; i < this.config.minWorkers; i++) {
      this.createWorker();
    }
  }

  private createWorker(): Worker {
    const workerId = randomUUID();
    const worker = new Worker(__filename, {
      workerData: { workerId },
    });

    worker.on('error', (error) => {
      this.logger.error({ workerId, error: error.message }, 'Worker error');
      this.workers.delete(workerId);
      // Create replacement worker
      this.createWorker();
    });

    worker.on('exit', (code) => {
      this.logger.info({ workerId, exitCode: code }, 'Worker exited');
      this.workers.delete(workerId);
    });

    this.workers.set(workerId, worker);
    return worker;
  }

  async getAvailableWorkers(): Promise<Worker[]> {
    return Array.from(this.workers.values());
  }

  async shutdown(): Promise<void> {
    const terminationPromises = Array.from(this.workers.values()).map(
      (worker) => worker.terminate(),
    );
    await Promise.all(terminationPromises);
    this.workers.clear();
  }
}

/**
 * Load Balancer for Worker Selection
 */
class LoadBalancer {
  private config: LoadBalancerConfig;
  private logger: Logger;
  private workerStats: Map<
    string,
    { connections: number; responseTime: number }
  > = new Map();
  private roundRobinIndex = 0;

  constructor(config: LoadBalancerConfig, logger: Logger) {
    this.config = config;
    this.logger = logger;
  }

  async getOptimalWorker(workers: Worker[]): Promise<Worker | null> {
    if (workers.length === 0) return null;

    switch (this.config.algorithm) {
      case 'round-robin':
        return this.getRoundRobinWorker(workers);

      case 'least-connections':
        return this.getLeastConnectionsWorker(workers);

      case 'weighted-response-time':
        return this.getWeightedResponseTimeWorker(workers);

      case 'adaptive':
        return this.getAdaptiveWorker(workers);

      default:
        return workers[0];
    }
  }

  private getRoundRobinWorker(workers: Worker[]): Worker {
    const worker = workers[this.roundRobinIndex % workers.length];
    this.roundRobinIndex++;
    return worker;
  }

  private getLeastConnectionsWorker(workers: Worker[]): Worker {
    // Simplified - would track actual connections per worker
    return workers[0];
  }

  private getWeightedResponseTimeWorker(workers: Worker[]): Worker {
    // Simplified - would use actual response time metrics
    return workers[0];
  }

  private getAdaptiveWorker(workers: Worker[]): Worker {
    // Simplified - would use ML to optimize selection
    return workers[0];
  }
}

/**
 * Rate Limiter
 */
class RateLimiter {
  private redis: Redis;
  private logger: Logger;

  constructor(redis: Redis, logger: Logger) {
    this.redis = redis;
    this.logger = logger;
  }

  async checkLimit(
    tenantId: string,
  ): Promise<{ allowed: boolean; reason?: string }> {
    const key = `rate_limit:${tenantId}`;
    const limit = 100; // requests per minute
    const window = 60; // seconds

    const current = await this.redis.incr(key);

    if (current === 1) {
      await this.redis.expire(key, window);
    }

    if (current > limit) {
      return {
        allowed: false,
        reason: `Rate limit exceeded: ${current}/${limit} requests per minute`,
      };
    }

    return { allowed: true };
  }
}

/**
 * Metrics Collection
 */
class MetricsCollector {
  private logger: Logger;
  private metrics = {
    submitted: 0,
    completed: 0,
    failed: 0,
    totalWaitTime: 0,
    totalProcessingTime: 0,
    startTime: Date.now(),
  };

  constructor(logger: Logger) {
    this.logger = logger;
  }

  start(): void {
    // Start metrics collection
    setInterval(() => {
      this.logMetrics();
    }, 60000); // Every minute
  }

  stop(): void {
    // Cleanup if needed
  }

  recordRequestSubmitted(tenantId: string, startTime: number): void {
    this.metrics.submitted++;
  }

  recordRequestCompleted(
    tenantId: string,
    startTime: number,
    duration: number,
  ): void {
    this.metrics.completed++;
    this.metrics.totalWaitTime += Date.now() - startTime;
    this.metrics.totalProcessingTime += duration;
  }

  recordRequestFailed(tenantId: string, startTime: number): void {
    this.metrics.failed++;
    this.metrics.totalWaitTime += Date.now() - startTime;
  }

  getCompletedCount(): number {
    return this.metrics.completed;
  }

  getFailedCount(): number {
    return this.metrics.failed;
  }

  getAverageWaitTime(): number {
    const total = this.metrics.completed + this.metrics.failed;
    return total > 0 ? this.metrics.totalWaitTime / total : 0;
  }

  getAverageProcessingTime(): number {
    return this.metrics.completed > 0
      ? this.metrics.totalProcessingTime / this.metrics.completed
      : 0;
  }

  getThroughput(): number {
    const elapsed = (Date.now() - this.metrics.startTime) / 1000;
    return elapsed > 0 ? this.metrics.completed / elapsed : 0;
  }

  private logMetrics(): void {
    this.logger.info(
      {
        metrics: {
          submitted: this.metrics.submitted,
          completed: this.metrics.completed,
          failed: this.metrics.failed,
          averageWaitTime: this.getAverageWaitTime(),
          averageProcessingTime: this.getAverageProcessingTime(),
          throughput: this.getThroughput(),
        },
      },
      'Concurrent handler metrics',
    );
  }
}

/**
 * Worker thread implementation
 */
if (!isMainThread && parentPort) {
  const { workerId } = workerData;

  parentPort.on('message', async ({ type, requestId, context }) => {
    if (type === 'execute') {
      const startTime = Date.now();
      const startMemory = process.memoryUsage().heapUsed;

      try {
        // Get processor from Redis
        const redis = new Redis(process.env.REDIS_URL);
        const processorData = await redis.get(`processor:${requestId}`);

        if (!processorData) {
          throw new Error('Processor not found');
        }

        const { processorCode } = JSON.parse(processorData);

        // Execute processor function
        const processor = eval(`(${processorCode})`);
        const result = await processor(context);

        const endTime = Date.now();
        const endMemory = process.memoryUsage().heapUsed;

        parentPort!.postMessage({
          requestId,
          success: true,
          data: result,
          duration: endTime - startTime,
          resources: {
            memoryUsed: endMemory - startMemory,
            cpuTime: process.cpuUsage().user,
          },
        });

        await redis.disconnect();
      } catch (error) {
        const endTime = Date.now();

        parentPort!.postMessage({
          requestId,
          success: false,
          error: error.message,
          duration: endTime - startTime,
          resources: {
            memoryUsed: 0,
            cpuTime: 0,
          },
        });
      }
    }
  });
}

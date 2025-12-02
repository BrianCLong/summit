/**
 * E2E Testing Hooks
 *
 * Provides comprehensive testing utilities for distributed queue systems:
 * - Job lifecycle interception for test assertions
 * - Latency simulation for stress testing
 * - Error injection for resilience testing
 * - Mock response injection for deterministic tests
 * - Metrics collection and assertion helpers
 *
 * Trade-offs:
 * - Interceptors add overhead (disabled in production)
 * - Mock responses may not cover edge cases (use sparingly)
 * - Error injection should be used carefully in staging
 */

import { EventEmitter } from 'events';
import { v4 as uuid } from 'uuid';
import {
  TestingHookConfig,
  TestInterceptor,
  TestContext,
  TestEvent,
  TestAssertion,
  TestMetrics,
  LatencyConfig,
  ErrorInjectionConfig,
  DistributedJob,
} from '../distributed/types.js';
import { DistributedQueue } from '../distributed/DistributedQueue.js';
import { Logger } from '../utils/logger.js';

interface TestSuite {
  id: string;
  name: string;
  tests: TestCase[];
  context: TestContext;
  status: 'pending' | 'running' | 'passed' | 'failed';
  startedAt?: Date;
  completedAt?: Date;
}

interface TestCase {
  id: string;
  name: string;
  fn: (hooks: E2ETestingHooks) => Promise<void>;
  status: 'pending' | 'running' | 'passed' | 'failed' | 'skipped';
  error?: Error;
  duration?: number;
}

interface HookEvents {
  'test:started': (testCase: TestCase) => void;
  'test:passed': (testCase: TestCase) => void;
  'test:failed': (testCase: TestCase, error: Error) => void;
  'suite:started': (suite: TestSuite) => void;
  'suite:completed': (suite: TestSuite) => void;
  'job:intercepted': (phase: string, job: DistributedJob) => void;
  'latency:injected': (jobId: string, delay: number) => void;
  'error:injected': (jobId: string, error: Error) => void;
}

export class E2ETestingHooks extends EventEmitter {
  private config: TestingHookConfig;
  private queue: DistributedQueue | null = null;
  private suites: Map<string, TestSuite> = new Map();
  private interceptors: Map<string, TestInterceptor> = new Map();
  private mockResponses: Map<string, unknown> = new Map();
  private capturedJobs: DistributedJob[] = [];
  private capturedEvents: TestEvent[] = [];
  private isEnabled = false;
  private logger: Logger;

  constructor(config: Partial<TestingHookConfig> = {}) {
    super();
    this.logger = new Logger('E2ETestingHooks');

    this.config = {
      enabled: config.enabled ?? false,
      interceptors: config.interceptors ?? [],
      mockResponses: config.mockResponses ?? new Map(),
      latencySimulation: config.latencySimulation,
      errorInjection: config.errorInjection,
    };

    // Register default interceptors
    for (const interceptor of this.config.interceptors) {
      this.interceptors.set(interceptor.name, interceptor);
    }
  }

  /**
   * Attach to a distributed queue
   */
  attach(queue: DistributedQueue): void {
    this.queue = queue;

    // Listen to queue events
    queue.on('job:added', job => this.handleJobEvent('added', job));
    queue.on('job:active', job => this.handleJobEvent('active', job));
    queue.on('job:completed', (job, result) => this.handleJobEvent('completed', job, result));
    queue.on('job:failed', (job, error) => this.handleJobEvent('failed', job, error));

    this.logger.info('Testing hooks attached to queue');
  }

  /**
   * Enable testing hooks
   */
  enable(): void {
    this.isEnabled = true;
    this.logger.info('Testing hooks enabled');
  }

  /**
   * Disable testing hooks
   */
  disable(): void {
    this.isEnabled = false;
    this.logger.info('Testing hooks disabled');
  }

  /**
   * Create a test suite
   */
  createSuite(name: string): TestSuite {
    const suite: TestSuite = {
      id: uuid(),
      name,
      tests: [],
      context: this.createTestContext(),
      status: 'pending',
    };

    this.suites.set(suite.id, suite);
    return suite;
  }

  /**
   * Add a test to a suite
   */
  addTest(
    suiteId: string,
    name: string,
    fn: (hooks: E2ETestingHooks) => Promise<void>,
  ): TestCase {
    const suite = this.suites.get(suiteId);
    if (!suite) {
      throw new Error(`Suite ${suiteId} not found`);
    }

    const testCase: TestCase = {
      id: uuid(),
      name,
      fn,
      status: 'pending',
    };

    suite.tests.push(testCase);
    return testCase;
  }

  /**
   * Run a test suite
   */
  async runSuite(suiteId: string): Promise<TestSuite> {
    const suite = this.suites.get(suiteId);
    if (!suite) {
      throw new Error(`Suite ${suiteId} not found`);
    }

    suite.status = 'running';
    suite.startedAt = new Date();
    this.emit('suite:started', suite);

    let allPassed = true;

    for (const test of suite.tests) {
      test.status = 'running';
      const startTime = Date.now();
      this.emit('test:started', test);

      try {
        await test.fn(this);
        test.status = 'passed';
        test.duration = Date.now() - startTime;
        this.emit('test:passed', test);
      } catch (error) {
        test.status = 'failed';
        test.error = error instanceof Error ? error : new Error(String(error));
        test.duration = Date.now() - startTime;
        allPassed = false;
        this.emit('test:failed', test, test.error);
      }

      // Record in context
      suite.context.assertions.push({
        name: test.name,
        passed: test.status === 'passed',
        expected: 'pass',
        actual: test.status,
        message: test.error?.message,
      });
    }

    suite.status = allPassed ? 'passed' : 'failed';
    suite.completedAt = new Date();
    this.emit('suite:completed', suite);

    return suite;
  }

  /**
   * Register an interceptor
   */
  registerInterceptor(interceptor: TestInterceptor): void {
    this.interceptors.set(interceptor.name, interceptor);
    this.logger.debug('Interceptor registered', { name: interceptor.name });
  }

  /**
   * Remove an interceptor
   */
  removeInterceptor(name: string): void {
    this.interceptors.delete(name);
  }

  /**
   * Set mock response for a job
   */
  setMockResponse(jobId: string, response: unknown): void {
    this.mockResponses.set(jobId, response);
  }

  /**
   * Clear mock response
   */
  clearMockResponse(jobId: string): void {
    this.mockResponses.delete(jobId);
  }

  /**
   * Get mock response if exists
   */
  getMockResponse(jobId: string): unknown | undefined {
    return this.mockResponses.get(jobId);
  }

  /**
   * Configure latency simulation
   */
  setLatencySimulation(config: LatencyConfig | undefined): void {
    this.config.latencySimulation = config;
  }

  /**
   * Configure error injection
   */
  setErrorInjection(config: ErrorInjectionConfig | undefined): void {
    this.config.errorInjection = config;
  }

  /**
   * Simulate latency
   */
  async simulateLatency(jobId: string): Promise<number> {
    if (!this.isEnabled || !this.config.latencySimulation) return 0;

    const { min, max, distribution } = this.config.latencySimulation;
    let delay: number;

    switch (distribution) {
      case 'uniform':
        delay = min + Math.random() * (max - min);
        break;
      case 'normal':
        // Box-Muller transform
        const u1 = Math.random();
        const u2 = Math.random();
        const z = Math.sqrt(-2 * Math.log(u1)) * Math.cos(2 * Math.PI * u2);
        delay = ((min + max) / 2) + z * ((max - min) / 6);
        delay = Math.max(min, Math.min(max, delay));
        break;
      case 'exponential':
        const lambda = 1 / ((max - min) / 2);
        delay = min + (-Math.log(Math.random()) / lambda);
        delay = Math.min(max, delay);
        break;
      default:
        delay = (min + max) / 2;
    }

    delay = Math.round(delay);

    this.emit('latency:injected', jobId, delay);
    this.captureEvent('latency:injected', { jobId, delay });

    await new Promise(resolve => setTimeout(resolve, delay));
    return delay;
  }

  /**
   * Check if should inject error
   */
  shouldInjectError(job: DistributedJob): Error | null {
    if (!this.isEnabled || !this.config.errorInjection) return null;

    const { rate, types, targets } = this.config.errorInjection;

    // Check if job is targeted
    if (targets && !targets.includes(job.name)) return null;

    // Random check based on rate
    if (Math.random() > rate) return null;

    // Select random error type
    const errorType = types[Math.floor(Math.random() * types.length)];
    const error = new Error(`Injected error: ${errorType}`);
    (error as any).type = errorType;

    this.emit('error:injected', job.id, error);
    this.captureEvent('error:injected', { jobId: job.id, errorType });

    return error;
  }

  /**
   * Capture a job for assertions
   */
  captureJob(job: DistributedJob): void {
    this.capturedJobs.push(job);
  }

  /**
   * Get captured jobs
   */
  getCapturedJobs(filter?: {
    name?: string;
    status?: string;
    partition?: string;
  }): DistributedJob[] {
    let jobs = [...this.capturedJobs];

    if (filter) {
      if (filter.name) {
        jobs = jobs.filter(j => j.name === filter.name);
      }
      if (filter.status) {
        jobs = jobs.filter(j => j.status === filter.status);
      }
      if (filter.partition) {
        jobs = jobs.filter(j => j.partition === filter.partition);
      }
    }

    return jobs;
  }

  /**
   * Clear captured jobs
   */
  clearCapturedJobs(): void {
    this.capturedJobs = [];
  }

  /**
   * Capture a test event
   */
  captureEvent(type: string, data: Record<string, unknown>): void {
    this.capturedEvents.push({
      timestamp: new Date(),
      type,
      data,
    });
  }

  /**
   * Get captured events
   */
  getCapturedEvents(type?: string): TestEvent[] {
    if (type) {
      return this.capturedEvents.filter(e => e.type === type);
    }
    return [...this.capturedEvents];
  }

  /**
   * Clear captured events
   */
  clearCapturedEvents(): void {
    this.capturedEvents = [];
  }

  /**
   * Wait for a job to reach a specific status
   */
  async waitForJobStatus(
    jobId: string,
    status: string,
    timeout = 30000,
  ): Promise<DistributedJob> {
    const startTime = Date.now();

    while (Date.now() - startTime < timeout) {
      const job = this.capturedJobs.find(j => j.id === jobId);
      if (job && job.status === status) {
        return job;
      }
      await new Promise(resolve => setTimeout(resolve, 100));
    }

    throw new Error(`Timeout waiting for job ${jobId} to reach status ${status}`);
  }

  /**
   * Wait for N jobs to be captured
   */
  async waitForJobs(count: number, timeout = 30000): Promise<DistributedJob[]> {
    const startTime = Date.now();

    while (Date.now() - startTime < timeout) {
      if (this.capturedJobs.length >= count) {
        return this.capturedJobs.slice(0, count);
      }
      await new Promise(resolve => setTimeout(resolve, 100));
    }

    throw new Error(`Timeout waiting for ${count} jobs (captured: ${this.capturedJobs.length})`);
  }

  /**
   * Assert job was processed
   */
  assertJobProcessed(jobId: string): TestAssertion {
    const job = this.capturedJobs.find(j => j.id === jobId);
    const passed = job !== undefined && (job.status === 'completed' || job.status === 'failed');

    return {
      name: `Job ${jobId} was processed`,
      passed,
      expected: 'completed or failed',
      actual: job?.status ?? 'not found',
    };
  }

  /**
   * Assert job completed successfully
   */
  assertJobCompleted(jobId: string): TestAssertion {
    const job = this.capturedJobs.find(j => j.id === jobId);
    const passed = job !== undefined && job.status === 'completed';

    return {
      name: `Job ${jobId} completed successfully`,
      passed,
      expected: 'completed',
      actual: job?.status ?? 'not found',
    };
  }

  /**
   * Assert job failed
   */
  assertJobFailed(jobId: string, expectedError?: string): TestAssertion {
    const job = this.capturedJobs.find(j => j.id === jobId);
    let passed = job !== undefined && job.status === 'failed';

    if (passed && expectedError && job?.failedReason) {
      passed = job.failedReason.includes(expectedError);
    }

    return {
      name: `Job ${jobId} failed${expectedError ? ` with "${expectedError}"` : ''}`,
      passed,
      expected: `failed${expectedError ? ` (${expectedError})` : ''}`,
      actual: job ? `${job.status}${job.failedReason ? ` (${job.failedReason})` : ''}` : 'not found',
    };
  }

  /**
   * Assert job count
   */
  assertJobCount(
    expected: number,
    filter?: { name?: string; status?: string },
  ): TestAssertion {
    const jobs = this.getCapturedJobs(filter);
    const passed = jobs.length === expected;

    return {
      name: `Job count equals ${expected}`,
      passed,
      expected,
      actual: jobs.length,
    };
  }

  /**
   * Assert event occurred
   */
  assertEventOccurred(eventType: string): TestAssertion {
    const events = this.getCapturedEvents(eventType);
    const passed = events.length > 0;

    return {
      name: `Event "${eventType}" occurred`,
      passed,
      expected: 'at least 1 event',
      actual: `${events.length} events`,
    };
  }

  /**
   * Get test metrics
   */
  getMetrics(): TestMetrics {
    const completedJobs = this.capturedJobs.filter(j => j.status === 'completed');
    const failedJobs = this.capturedJobs.filter(j => j.status === 'failed');

    const latencies = completedJobs
      .filter(j => j.processedAt && j.completedAt)
      .map(j => j.completedAt!.getTime() - j.processedAt!.getTime());

    const avgLatency = latencies.length > 0
      ? latencies.reduce((a, b) => a + b, 0) / latencies.length
      : 0;

    const failoverEvents = this.getCapturedEvents('failover:completed');

    return {
      jobsProcessed: completedJobs.length + failedJobs.length,
      avgLatency,
      errorRate: this.capturedJobs.length > 0
        ? (failedJobs.length / this.capturedJobs.length) * 100
        : 0,
      throughput: this.calculateThroughput(),
      failoverCount: failoverEvents.length,
    };
  }

  /**
   * Reset all test state
   */
  reset(): void {
    this.capturedJobs = [];
    this.capturedEvents = [];
    this.mockResponses.clear();
    this.suites.clear();
    this.logger.info('Test state reset');
  }

  // Private methods

  private createTestContext(): TestContext {
    return {
      testId: uuid(),
      startTime: new Date(),
      events: [],
      assertions: [],
      metrics: {
        jobsProcessed: 0,
        avgLatency: 0,
        errorRate: 0,
        throughput: 0,
        failoverCount: 0,
      },
    };
  }

  private handleJobEvent(phase: string, job: DistributedJob, extra?: unknown): void {
    if (!this.isEnabled) return;

    // Update captured job
    const existingIndex = this.capturedJobs.findIndex(j => j.id === job.id);
    if (existingIndex >= 0) {
      this.capturedJobs[existingIndex] = job;
    } else {
      this.capturedJobs.push(job);
    }

    // Capture event
    this.captureEvent(`job:${phase}`, { jobId: job.id, job, extra });

    // Run interceptors
    const context = this.createTestContext();
    for (const interceptor of this.interceptors.values()) {
      if (interceptor.phase === 'before' && phase === 'active') {
        if (interceptor.matcher(job)) {
          interceptor.handler(job, context);
        }
      } else if (interceptor.phase === 'after' && phase === 'completed') {
        if (interceptor.matcher(job)) {
          interceptor.handler(job, context);
        }
      } else if (interceptor.phase === 'error' && phase === 'failed') {
        if (interceptor.matcher(job)) {
          interceptor.handler(job, context);
        }
      }
    }

    this.emit('job:intercepted', phase, job);
  }

  private calculateThroughput(): number {
    const completedJobs = this.capturedJobs.filter(j => j.status === 'completed');
    if (completedJobs.length < 2) return 0;

    const timestamps = completedJobs
      .filter(j => j.completedAt)
      .map(j => j.completedAt!.getTime())
      .sort((a, b) => a - b);

    if (timestamps.length < 2) return 0;

    const durationMinutes = (timestamps[timestamps.length - 1] - timestamps[0]) / 60000;
    if (durationMinutes === 0) return 0;

    return completedJobs.length / durationMinutes;
  }
}

/**
 * Create testing hooks with default configuration
 */
export function createTestingHooks(
  config?: Partial<TestingHookConfig>,
): E2ETestingHooks {
  return new E2ETestingHooks(config);
}

/**
 * Helper to create a test interceptor
 */
export function createInterceptor(
  name: string,
  phase: TestInterceptor['phase'],
  matcher: TestInterceptor['matcher'],
  handler: TestInterceptor['handler'],
): TestInterceptor {
  return { name, phase, matcher, handler };
}

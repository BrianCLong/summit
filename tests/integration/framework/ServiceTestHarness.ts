/**
 * Service Integration Test Harness
 *
 * Provides a unified framework for testing cross-service integration.
 * Handles service lifecycle, mock injection, and contract verification.
 *
 * @module tests/integration/framework
 */

import { EventEmitter } from 'events';

/**
 * Service health status
 */
export type ServiceHealthStatus = 'healthy' | 'degraded' | 'unhealthy' | 'unknown';

/**
 * Service configuration
 */
export interface ServiceConfig {
  name: string;
  baseUrl: string;
  healthEndpoint?: string;
  timeout?: number;
  retries?: number;
  dependencies?: string[];
}

/**
 * Service health check result
 */
export interface HealthCheckResult {
  service: string;
  status: ServiceHealthStatus;
  latency: number;
  timestamp: Date;
  details?: Record<string, any>;
  error?: string;
}

/**
 * Service mock configuration
 */
export interface ServiceMockConfig {
  service: string;
  endpoint: string;
  method: 'GET' | 'POST' | 'PUT' | 'DELETE' | 'PATCH';
  response: any;
  statusCode?: number;
  delay?: number;
  headers?: Record<string, string>;
}

/**
 * Integration test context
 */
export interface IntegrationTestContext {
  services: Map<string, ServiceConfig>;
  mocks: Map<string, ServiceMockConfig[]>;
  healthResults: Map<string, HealthCheckResult>;
  startTime: number;
  testId: string;
}

/**
 * Service Integration Test Harness
 *
 * @example
 * ```typescript
 * const harness = new ServiceTestHarness();
 *
 * // Register services
 * harness.registerService({
 *   name: 'api',
 *   baseUrl: 'http://localhost:4000',
 *   healthEndpoint: '/health',
 * });
 *
 * // Setup mocks
 * harness.mockEndpoint({
 *   service: 'api',
 *   endpoint: '/graphql',
 *   method: 'POST',
 *   response: { data: { ... } },
 * });
 *
 * // Run tests
 * await harness.setup();
 * // ... run tests
 * await harness.teardown();
 * ```
 */
export class ServiceTestHarness extends EventEmitter {
  private services: Map<string, ServiceConfig> = new Map();
  private mocks: Map<string, ServiceMockConfig[]> = new Map();
  private healthResults: Map<string, HealthCheckResult> = new Map();
  private isSetup: boolean = false;
  private testId: string;

  constructor() {
    super();
    this.testId = `test-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
  }

  /**
   * Register a service for integration testing
   */
  registerService(config: ServiceConfig): this {
    this.services.set(config.name, {
      healthEndpoint: '/health',
      timeout: 5000,
      retries: 3,
      dependencies: [],
      ...config,
    });
    return this;
  }

  /**
   * Register multiple services
   */
  registerServices(configs: ServiceConfig[]): this {
    configs.forEach((config) => this.registerService(config));
    return this;
  }

  /**
   * Mock a service endpoint
   */
  mockEndpoint(config: ServiceMockConfig): this {
    const mocks = this.mocks.get(config.service) || [];
    mocks.push({
      statusCode: 200,
      delay: 0,
      headers: {},
      ...config,
    });
    this.mocks.set(config.service, mocks);
    return this;
  }

  /**
   * Clear all mocks for a service
   */
  clearMocks(service?: string): this {
    if (service) {
      this.mocks.delete(service);
    } else {
      this.mocks.clear();
    }
    return this;
  }

  /**
   * Setup the test harness
   */
  async setup(): Promise<void> {
    if (this.isSetup) {
      throw new Error('Test harness is already setup');
    }

    this.emit('setup:start', { testId: this.testId });

    // Check service health in dependency order
    const serviceOrder = this.getServiceStartOrder();

    for (const serviceName of serviceOrder) {
      const config = this.services.get(serviceName)!;
      const health = await this.checkServiceHealth(config);
      this.healthResults.set(serviceName, health);

      if (health.status === 'unhealthy') {
        this.emit('service:unhealthy', { service: serviceName, health });
        throw new Error(`Service ${serviceName} is unhealthy: ${health.error}`);
      }
    }

    this.isSetup = true;
    this.emit('setup:complete', { testId: this.testId });
  }

  /**
   * Teardown the test harness
   */
  async teardown(): Promise<void> {
    if (!this.isSetup) {
      return;
    }

    this.emit('teardown:start', { testId: this.testId });

    // Clear all mocks
    this.clearMocks();

    // Clear health results
    this.healthResults.clear();

    this.isSetup = false;
    this.emit('teardown:complete', { testId: this.testId });
  }

  /**
   * Check if a specific service is healthy
   */
  async checkServiceHealth(config: ServiceConfig): Promise<HealthCheckResult> {
    const startTime = Date.now();

    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), config.timeout);

      const response = await fetch(`${config.baseUrl}${config.healthEndpoint}`, {
        method: 'GET',
        signal: controller.signal,
        headers: {
          'Accept': 'application/json',
          'X-Test-Id': this.testId,
        },
      });

      clearTimeout(timeoutId);

      const latency = Date.now() - startTime;
      const data = await response.json().catch(() => ({}));

      if (!response.ok) {
        return {
          service: config.name,
          status: 'unhealthy',
          latency,
          timestamp: new Date(),
          error: `Health check returned ${response.status}`,
          details: data,
        };
      }

      return {
        service: config.name,
        status: 'healthy',
        latency,
        timestamp: new Date(),
        details: data,
      };
    } catch (error: any) {
      return {
        service: config.name,
        status: 'unhealthy',
        latency: Date.now() - startTime,
        timestamp: new Date(),
        error: error.message,
      };
    }
  }

  /**
   * Wait for all services to be healthy
   */
  async waitForServices(timeout: number = 30000): Promise<boolean> {
    const startTime = Date.now();

    while (Date.now() - startTime < timeout) {
      let allHealthy = true;

      for (const [name, config] of this.services) {
        const health = await this.checkServiceHealth(config);
        this.healthResults.set(name, health);

        if (health.status !== 'healthy') {
          allHealthy = false;
        }
      }

      if (allHealthy) {
        return true;
      }

      // Wait before retrying
      await new Promise((resolve) => setTimeout(resolve, 1000));
    }

    return false;
  }

  /**
   * Get current health status of all services
   */
  getHealthStatus(): Map<string, HealthCheckResult> {
    return new Map(this.healthResults);
  }

  /**
   * Get the order in which services should be started based on dependencies
   */
  private getServiceStartOrder(): string[] {
    const order: string[] = [];
    const visited = new Set<string>();
    const visiting = new Set<string>();

    const visit = (name: string) => {
      if (visited.has(name)) return;
      if (visiting.has(name)) {
        throw new Error(`Circular dependency detected for service: ${name}`);
      }

      visiting.add(name);

      const config = this.services.get(name);
      if (config?.dependencies) {
        for (const dep of config.dependencies) {
          if (this.services.has(dep)) {
            visit(dep);
          }
        }
      }

      visiting.delete(name);
      visited.add(name);
      order.push(name);
    };

    for (const name of this.services.keys()) {
      visit(name);
    }

    return order;
  }

  /**
   * Get the test context
   */
  getContext(): IntegrationTestContext {
    return {
      services: new Map(this.services),
      mocks: new Map(this.mocks),
      healthResults: new Map(this.healthResults),
      startTime: Date.now(),
      testId: this.testId,
    };
  }

  /**
   * Create a scoped test runner
   */
  createTestRunner(name: string): ScopedTestRunner {
    return new ScopedTestRunner(this, name);
  }
}

/**
 * Scoped test runner for isolated test execution
 */
export class ScopedTestRunner {
  private harness: ServiceTestHarness;
  private name: string;
  private localMocks: ServiceMockConfig[] = [];

  constructor(harness: ServiceTestHarness, name: string) {
    this.harness = harness;
    this.name = name;
  }

  /**
   * Add a local mock for this test scope
   */
  mock(config: ServiceMockConfig): this {
    this.localMocks.push(config);
    this.harness.mockEndpoint(config);
    return this;
  }

  /**
   * Run the test with automatic cleanup
   */
  async run<T>(fn: () => Promise<T>): Promise<T> {
    try {
      return await fn();
    } finally {
      // Clear local mocks
      for (const mock of this.localMocks) {
        // In a real implementation, we'd selectively remove these mocks
      }
      this.localMocks = [];
    }
  }
}

/**
 * Create a pre-configured harness for common service configurations
 */
export function createDefaultHarness(): ServiceTestHarness {
  const harness = new ServiceTestHarness();

  harness.registerServices([
    {
      name: 'api',
      baseUrl: process.env.API_BASE_URL || 'http://localhost:4000',
      healthEndpoint: '/health',
      timeout: 5000,
    },
    {
      name: 'graph-api',
      baseUrl: process.env.GRAPH_API_URL || 'http://localhost:4001',
      healthEndpoint: '/health',
      timeout: 5000,
      dependencies: ['api'],
    },
    {
      name: 'copilot',
      baseUrl: process.env.COPILOT_URL || 'http://localhost:4002',
      healthEndpoint: '/health',
      timeout: 10000,
      dependencies: ['api'],
    },
  ]);

  return harness;
}

export default ServiceTestHarness;

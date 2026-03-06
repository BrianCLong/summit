/**
 * Error Scenario Testing Framework
 *
 * Framework for systematically testing error handling and failure scenarios.
 * Covers network failures, timeouts, validation errors, and service degradation.
 *
 * @module tests/error-scenarios
 */

import { EventEmitter } from 'events';

/**
 * Error scenario types
 */
export type ErrorScenarioType =
  | 'network_failure'
  | 'timeout'
  | 'connection_refused'
  | 'dns_failure'
  | 'ssl_error'
  | 'rate_limit'
  | 'service_unavailable'
  | 'internal_error'
  | 'validation_error'
  | 'authentication_error'
  | 'authorization_error'
  | 'resource_not_found'
  | 'conflict'
  | 'data_corruption'
  | 'partial_failure'
  | 'cascade_failure';

/**
 * Error scenario definition
 */
export interface ErrorScenario {
  type: ErrorScenarioType;
  name: string;
  description: string;
  setup: () => Promise<void>;
  trigger: () => Promise<void>;
  verify: (result: any) => Promise<boolean>;
  cleanup: () => Promise<void>;
  expectedBehavior: string;
  severity: 'low' | 'medium' | 'high' | 'critical';
  tags: string[];
}

/**
 * Error scenario test result
 */
export interface ErrorScenarioResult {
  scenario: string;
  type: ErrorScenarioType;
  passed: boolean;
  error?: Error;
  duration: number;
  timestamp: Date;
  details: Record<string, any>;
}

/**
 * Error injection configuration
 */
export interface ErrorInjectionConfig {
  type: ErrorScenarioType;
  probability?: number; // 0-1, for intermittent failures
  delay?: number; // ms before error occurs
  duration?: number; // ms to maintain error state
  customError?: Error;
}

/**
 * Error Scenario Test Runner
 *
 * Executes error scenarios and validates system behavior under failure conditions.
 *
 * @example
 * ```typescript
 * const runner = new ErrorScenarioRunner();
 *
 * runner.registerScenario({
 *   type: 'network_failure',
 *   name: 'Database Connection Lost',
 *   description: 'Tests behavior when database connection is lost',
 *   setup: async () => { ... },
 *   trigger: async () => { ... },
 *   verify: async (result) => result.handled === true,
 *   cleanup: async () => { ... },
 *   expectedBehavior: 'Should return cached data or graceful error',
 *   severity: 'high',
 *   tags: ['database', 'resilience'],
 * });
 *
 * const results = await runner.runAll();
 * ```
 */
export class ErrorScenarioRunner extends EventEmitter {
  private scenarios: Map<string, ErrorScenario> = new Map();
  private results: ErrorScenarioResult[] = [];
  private isRunning: boolean = false;

  /**
   * Register an error scenario
   */
  registerScenario(scenario: ErrorScenario): this {
    this.scenarios.set(scenario.name, scenario);
    return this;
  }

  /**
   * Register multiple scenarios
   */
  registerScenarios(scenarios: ErrorScenario[]): this {
    scenarios.forEach((s) => this.registerScenario(s));
    return this;
  }

  /**
   * Run a specific scenario
   */
  async runScenario(name: string): Promise<ErrorScenarioResult> {
    const scenario = this.scenarios.get(name);
    if (!scenario) {
      throw new Error(`Scenario not found: ${name}`);
    }

    const startTime = Date.now();
    this.emit('scenario:start', { name, type: scenario.type });

    try {
      // Setup
      await scenario.setup();
      this.emit('scenario:setup', { name });

      // Trigger error condition
      let triggerResult: any;
      try {
        await scenario.trigger();
      } catch (error) {
        triggerResult = error;
      }

      // Verify expected behavior
      const passed = await scenario.verify(triggerResult);

      // Cleanup
      await scenario.cleanup();
      this.emit('scenario:cleanup', { name });

      const result: ErrorScenarioResult = {
        scenario: name,
        type: scenario.type,
        passed,
        duration: Date.now() - startTime,
        timestamp: new Date(),
        details: { triggerResult },
      };

      this.results.push(result);
      this.emit('scenario:complete', result);

      return result;
    } catch (error: any) {
      // Ensure cleanup runs even on failure
      try {
        await scenario.cleanup();
      } catch (cleanupError) {
        console.error('Cleanup failed:', cleanupError);
      }

      const result: ErrorScenarioResult = {
        scenario: name,
        type: scenario.type,
        passed: false,
        error,
        duration: Date.now() - startTime,
        timestamp: new Date(),
        details: { errorMessage: error.message },
      };

      this.results.push(result);
      this.emit('scenario:error', result);

      return result;
    }
  }

  /**
   * Run all registered scenarios
   */
  async runAll(): Promise<ErrorScenarioResult[]> {
    if (this.isRunning) {
      throw new Error('Runner is already executing scenarios');
    }

    this.isRunning = true;
    this.results = [];
    this.emit('run:start', { count: this.scenarios.size });

    const results: ErrorScenarioResult[] = [];

    for (const [name] of this.scenarios) {
      const result = await this.runScenario(name);
      results.push(result);
    }

    this.isRunning = false;
    this.emit('run:complete', { results });

    return results;
  }

  /**
   * Run scenarios by type
   */
  async runByType(type: ErrorScenarioType): Promise<ErrorScenarioResult[]> {
    const matchingScenarios = Array.from(this.scenarios.entries())
      .filter(([_, s]) => s.type === type)
      .map(([name]) => name);

    const results: ErrorScenarioResult[] = [];
    for (const name of matchingScenarios) {
      results.push(await this.runScenario(name));
    }

    return results;
  }

  /**
   * Run scenarios by tag
   */
  async runByTag(tag: string): Promise<ErrorScenarioResult[]> {
    const matchingScenarios = Array.from(this.scenarios.entries())
      .filter(([_, s]) => s.tags.includes(tag))
      .map(([name]) => name);

    const results: ErrorScenarioResult[] = [];
    for (const name of matchingScenarios) {
      results.push(await this.runScenario(name));
    }

    return results;
  }

  /**
   * Get all results
   */
  getResults(): ErrorScenarioResult[] {
    return [...this.results];
  }

  /**
   * Get summary of results
   */
  getSummary(): {
    total: number;
    passed: number;
    failed: number;
    passRate: number;
    byType: Record<ErrorScenarioType, { passed: number; failed: number }>;
  } {
    const total = this.results.length;
    const passed = this.results.filter((r) => r.passed).length;
    const failed = total - passed;

    const byType: Record<string, { passed: number; failed: number }> = {};
    for (const result of this.results) {
      if (!byType[result.type]) {
        byType[result.type] = { passed: 0, failed: 0 };
      }
      if (result.passed) {
        byType[result.type].passed++;
      } else {
        byType[result.type].failed++;
      }
    }

    return {
      total,
      passed,
      failed,
      passRate: total > 0 ? passed / total : 0,
      byType: byType as Record<ErrorScenarioType, { passed: number; failed: number }>,
    };
  }

  /**
   * Clear all scenarios and results
   */
  clear(): void {
    this.scenarios.clear();
    this.results = [];
  }
}

/**
 * Error Injector for simulating failures
 */
export class ErrorInjector {
  private injections: Map<string, ErrorInjectionConfig> = new Map();
  private activeInjections: Set<string> = new Set();

  /**
   * Configure error injection for a target
   */
  configure(target: string, config: ErrorInjectionConfig): this {
    this.injections.set(target, config);
    return this;
  }

  /**
   * Enable error injection for a target
   */
  enable(target: string): void {
    if (!this.injections.has(target)) {
      throw new Error(`No injection configured for target: ${target}`);
    }
    this.activeInjections.add(target);
  }

  /**
   * Disable error injection for a target
   */
  disable(target: string): void {
    this.activeInjections.delete(target);
  }

  /**
   * Disable all error injections
   */
  disableAll(): void {
    this.activeInjections.clear();
  }

  /**
   * Check if target should fail
   */
  shouldFail(target: string): boolean {
    if (!this.activeInjections.has(target)) {
      return false;
    }

    const config = this.injections.get(target)!;
    if (config.probability !== undefined) {
      return Math.random() < config.probability;
    }

    return true;
  }

  /**
   * Get error for target
   */
  getError(target: string): Error {
    const config = this.injections.get(target);
    if (!config) {
      return new Error(`Error injection: ${target}`);
    }

    if (config.customError) {
      return config.customError;
    }

    return this.createErrorByType(config.type, target);
  }

  /**
   * Create error by type
   */
  private createErrorByType(type: ErrorScenarioType, target: string): Error {
    const errors: Record<ErrorScenarioType, () => Error> = {
      network_failure: () => new Error(`Network failure: ${target}`),
      timeout: () => {
        const error = new Error(`Timeout: ${target}`);
        error.name = 'TimeoutError';
        return error;
      },
      connection_refused: () => {
        const error = new Error(`Connection refused: ${target}`);
        (error as any).code = 'ECONNREFUSED';
        return error;
      },
      dns_failure: () => {
        const error = new Error(`DNS lookup failed: ${target}`);
        (error as any).code = 'ENOTFOUND';
        return error;
      },
      ssl_error: () => {
        const error = new Error(`SSL certificate error: ${target}`);
        (error as any).code = 'CERT_HAS_EXPIRED';
        return error;
      },
      rate_limit: () => {
        const error = new Error(`Rate limit exceeded: ${target}`);
        (error as any).statusCode = 429;
        return error;
      },
      service_unavailable: () => {
        const error = new Error(`Service unavailable: ${target}`);
        (error as any).statusCode = 503;
        return error;
      },
      internal_error: () => {
        const error = new Error(`Internal server error: ${target}`);
        (error as any).statusCode = 500;
        return error;
      },
      validation_error: () => {
        const error = new Error(`Validation failed: ${target}`);
        (error as any).statusCode = 400;
        return error;
      },
      authentication_error: () => {
        const error = new Error(`Authentication required: ${target}`);
        (error as any).statusCode = 401;
        return error;
      },
      authorization_error: () => {
        const error = new Error(`Permission denied: ${target}`);
        (error as any).statusCode = 403;
        return error;
      },
      resource_not_found: () => {
        const error = new Error(`Resource not found: ${target}`);
        (error as any).statusCode = 404;
        return error;
      },
      conflict: () => {
        const error = new Error(`Conflict: ${target}`);
        (error as any).statusCode = 409;
        return error;
      },
      data_corruption: () => new Error(`Data corruption detected: ${target}`),
      partial_failure: () => new Error(`Partial failure: ${target}`),
      cascade_failure: () => new Error(`Cascade failure triggered: ${target}`),
    };

    return errors[type]();
  }

  /**
   * Wrap a function with error injection
   */
  wrap<T extends (...args: any[]) => Promise<any>>(
    target: string,
    fn: T
  ): T {
    const injector = this;

    return (async (...args: Parameters<T>): Promise<ReturnType<T>> => {
      if (injector.shouldFail(target)) {
        const config = injector.injections.get(target);

        // Apply delay if configured
        if (config?.delay) {
          await new Promise((resolve) => setTimeout(resolve, config.delay));
        }

        throw injector.getError(target);
      }

      return fn(...args);
    }) as T;
  }
}

/**
 * Predefined error scenarios for common failure patterns
 */
export const CommonErrorScenarios = {
  /**
   * Create a database connection failure scenario
   */
  databaseConnectionFailure(
    triggerFn: () => Promise<any>,
    verifyFn: (result: any) => Promise<boolean>
  ): ErrorScenario {
    return {
      type: 'connection_refused',
      name: 'Database Connection Failure',
      description: 'Tests behavior when database connection fails',
      setup: async () => {},
      trigger: triggerFn,
      verify: verifyFn,
      cleanup: async () => {},
      expectedBehavior: 'Should return error and not crash',
      severity: 'critical',
      tags: ['database', 'connection', 'resilience'],
    };
  },

  /**
   * Create a timeout scenario
   */
  requestTimeout(
    triggerFn: () => Promise<any>,
    verifyFn: (result: any) => Promise<boolean>,
    timeoutMs: number = 5000
  ): ErrorScenario {
    return {
      type: 'timeout',
      name: 'Request Timeout',
      description: `Tests behavior when request times out after ${timeoutMs}ms`,
      setup: async () => {},
      trigger: triggerFn,
      verify: verifyFn,
      cleanup: async () => {},
      expectedBehavior: 'Should timeout gracefully with appropriate error',
      severity: 'high',
      tags: ['timeout', 'network', 'resilience'],
    };
  },

  /**
   * Create a rate limit scenario
   */
  rateLimitExceeded(
    triggerFn: () => Promise<any>,
    verifyFn: (result: any) => Promise<boolean>
  ): ErrorScenario {
    return {
      type: 'rate_limit',
      name: 'Rate Limit Exceeded',
      description: 'Tests behavior when rate limit is exceeded',
      setup: async () => {},
      trigger: triggerFn,
      verify: verifyFn,
      cleanup: async () => {},
      expectedBehavior: 'Should return 429 with retry-after header',
      severity: 'medium',
      tags: ['rate-limit', 'api', 'throttling'],
    };
  },

  /**
   * Create an authentication failure scenario
   */
  authenticationFailure(
    triggerFn: () => Promise<any>,
    verifyFn: (result: any) => Promise<boolean>
  ): ErrorScenario {
    return {
      type: 'authentication_error',
      name: 'Authentication Failure',
      description: 'Tests behavior when authentication fails',
      setup: async () => {},
      trigger: triggerFn,
      verify: verifyFn,
      cleanup: async () => {},
      expectedBehavior: 'Should return 401 and redirect to login',
      severity: 'high',
      tags: ['auth', 'security'],
    };
  },

  /**
   * Create a validation error scenario
   */
  validationError(
    triggerFn: () => Promise<any>,
    verifyFn: (result: any) => Promise<boolean>
  ): ErrorScenario {
    return {
      type: 'validation_error',
      name: 'Validation Error',
      description: 'Tests behavior when input validation fails',
      setup: async () => {},
      trigger: triggerFn,
      verify: verifyFn,
      cleanup: async () => {},
      expectedBehavior: 'Should return 400 with validation details',
      severity: 'medium',
      tags: ['validation', 'input', 'api'],
    };
  },

  /**
   * Create a service unavailable scenario
   */
  serviceUnavailable(
    serviceName: string,
    triggerFn: () => Promise<any>,
    verifyFn: (result: any) => Promise<boolean>
  ): ErrorScenario {
    return {
      type: 'service_unavailable',
      name: `${serviceName} Service Unavailable`,
      description: `Tests behavior when ${serviceName} service is unavailable`,
      setup: async () => {},
      trigger: triggerFn,
      verify: verifyFn,
      cleanup: async () => {},
      expectedBehavior: 'Should degrade gracefully or use fallback',
      severity: 'high',
      tags: ['service', 'availability', 'resilience', serviceName.toLowerCase()],
    };
  },

  /**
   * Create a partial failure scenario
   */
  partialFailure(
    triggerFn: () => Promise<any>,
    verifyFn: (result: any) => Promise<boolean>
  ): ErrorScenario {
    return {
      type: 'partial_failure',
      name: 'Partial Failure',
      description: 'Tests behavior when operation partially fails',
      setup: async () => {},
      trigger: triggerFn,
      verify: verifyFn,
      cleanup: async () => {},
      expectedBehavior: 'Should return partial results with error details',
      severity: 'medium',
      tags: ['partial', 'batch', 'resilience'],
    };
  },
};

/**
 * Create a pre-configured error scenario runner
 */
export function createErrorScenarioRunner(): ErrorScenarioRunner {
  return new ErrorScenarioRunner();
}

/**
 * Create an error injector
 */
export function createErrorInjector(): ErrorInjector {
  return new ErrorInjector();
}

export default {
  ErrorScenarioRunner,
  ErrorInjector,
  CommonErrorScenarios,
  createErrorScenarioRunner,
  createErrorInjector,
};

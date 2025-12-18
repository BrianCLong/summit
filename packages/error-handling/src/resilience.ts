/**
 * Resilience Patterns Integration
 * Integrates circuit breaker, retry, timeout, and graceful degradation
 */

import pino from 'pino';
import {
  CircuitBreaker,
  CircuitBreakerConfig,
  RetryHandler,
  RetryPolicy,
  TimeoutHandler,
} from '@intelgraph/orchestration';
import {
  AppError,
  TimeoutError,
  CircuitBreakerError,
  ExternalServiceError,
  DatabaseError,
  toAppError,
} from './errors.js';

const logger = pino({ name: 'Resilience' });

/**
 * Circuit breakers registry
 */
const circuitBreakers = new Map<string, CircuitBreaker>();

/**
 * Get or create circuit breaker for a service
 */
export function getCircuitBreaker(
  serviceName: string,
  config?: Partial<CircuitBreakerConfig>,
): CircuitBreaker {
  if (circuitBreakers.has(serviceName)) {
    return circuitBreakers.get(serviceName)!;
  }

  const defaultConfig: CircuitBreakerConfig = {
    failureThreshold: 5,
    successThreshold: 2,
    timeout: 30000, // 30 seconds
    monitoringPeriod: 60000, // 1 minute
  };

  const breaker = new CircuitBreaker(serviceName, {
    ...defaultConfig,
    ...config,
  });

  // Setup event listeners for logging
  breaker.on('state.changed', ({ name, state }) => {
    logger.info({ service: name, state }, `Circuit breaker state changed: ${state}`);
  });

  breaker.on('circuit.opened', ({ name, failures }) => {
    logger.warn({ service: name, failures }, 'Circuit breaker opened');
  });

  breaker.on('circuit.closed', ({ name }) => {
    logger.info({ service: name }, 'Circuit breaker closed');
  });

  circuitBreakers.set(serviceName, breaker);
  return breaker;
}

/**
 * Execute function with circuit breaker protection
 */
export async function executeWithCircuitBreaker<T>(
  serviceName: string,
  fn: () => Promise<T>,
  config?: Partial<CircuitBreakerConfig>,
): Promise<T> {
  const breaker = getCircuitBreaker(serviceName, config);

  try {
    return await breaker.execute(fn);
  } catch (error: any) {
    if (error.message?.includes('Circuit breaker') && error.message?.includes('is OPEN')) {
      throw new CircuitBreakerError(serviceName, {
        state: breaker.getState(),
        metrics: breaker.getMetrics(),
      });
    }
    throw error;
  }
}

/**
 * Default retry policies for different scenarios
 */
export const RetryPolicies = {
  /**
   * Default retry policy - exponential backoff
   */
  default: {
    maxRetries: 3,
    initialDelay: 1000,
    maxDelay: 10000,
    backoffMultiplier: 2,
  } as RetryPolicy,

  /**
   * Database retry policy - shorter delays
   */
  database: {
    maxRetries: 3,
    initialDelay: 500,
    maxDelay: 5000,
    backoffMultiplier: 2,
    retryableErrors: [
      'DATABASE_CONNECTION_FAILED',
      'DATABASE_TIMEOUT',
      'POSTGRES_ERROR',
      'NEO4J_ERROR',
    ],
  } as RetryPolicy,

  /**
   * External service retry policy
   */
  externalService: {
    maxRetries: 4,
    initialDelay: 2000,
    maxDelay: 30000,
    backoffMultiplier: 2,
    retryableErrors: [
      'EXTERNAL_SERVICE_ERROR',
      'OPERATION_TIMEOUT',
      'GATEWAY_TIMEOUT',
      'SERVICE_UNAVAILABLE',
    ],
  } as RetryPolicy,

  /**
   * Quick retry policy - for fast operations
   */
  quick: {
    maxRetries: 2,
    initialDelay: 100,
    maxDelay: 1000,
    backoffMultiplier: 2,
  } as RetryPolicy,

  /**
   * No retry policy
   */
  none: {
    maxRetries: 0,
    initialDelay: 0,
    maxDelay: 0,
    backoffMultiplier: 1,
  } as RetryPolicy,
};

/**
 * Execute function with retry logic
 */
export async function executeWithRetry<T>(
  fn: () => Promise<T>,
  policy: RetryPolicy = RetryPolicies.default,
  context?: { operation: string; service?: string },
): Promise<T> {
  try {
    return await RetryHandler.executeWithRetry(fn, policy);
  } catch (error: any) {
    logger.error(
      {
        error: error instanceof AppError ? error.toJSON() : error,
        policy,
        context,
      },
      'Retry attempts exhausted',
    );
    throw toAppError(error);
  }
}

/**
 * Execute function with timeout
 */
export async function executeWithTimeout<T>(
  fn: () => Promise<T>,
  timeoutMs: number,
  operation: string,
): Promise<T> {
  try {
    return await TimeoutHandler.executeWithTimeout(fn, timeoutMs);
  } catch (error: any) {
    if (error.message?.includes('timeout')) {
      throw new TimeoutError(operation, timeoutMs);
    }
    throw toAppError(error);
  }
}

/**
 * Execute with full resilience (circuit breaker + retry + timeout)
 */
export async function executeWithResilience<T>(
  options: {
    serviceName: string;
    operation: string;
    fn: () => Promise<T>;
    retryPolicy?: RetryPolicy;
    timeoutMs?: number;
    circuitBreakerConfig?: Partial<CircuitBreakerConfig>;
  },
): Promise<T> {
  const {
    serviceName,
    operation,
    fn,
    retryPolicy = RetryPolicies.default,
    timeoutMs = 30000,
    circuitBreakerConfig,
  } = options;

  const resilientFn = async () => {
    // Wrap with timeout
    const fnWithTimeout = () =>
      executeWithTimeout(fn, timeoutMs, `${serviceName}.${operation}`);

    // Wrap with retry
    const fnWithRetry = () =>
      executeWithRetry(fnWithTimeout, retryPolicy, {
        operation,
        service: serviceName,
      });

    // Execute with circuit breaker
    return executeWithCircuitBreaker(
      serviceName,
      fnWithRetry,
      circuitBreakerConfig,
    );
  };

  try {
    return await resilientFn();
  } catch (error: any) {
    logger.error(
      {
        service: serviceName,
        operation,
        error: error instanceof AppError ? error.toJSON() : error,
      },
      'Resilient execution failed',
    );
    throw error;
  }
}

/**
 * Graceful degradation wrapper
 * Returns fallback value if operation fails
 */
export async function withGracefulDegradation<T>(
  fn: () => Promise<T>,
  fallback: T,
  options?: {
    serviceName?: string;
    operation?: string;
    logError?: boolean;
  },
): Promise<T> {
  try {
    return await fn();
  } catch (error: any) {
    if (options?.logError !== false) {
      logger.warn(
        {
          service: options?.serviceName,
          operation: options?.operation,
          error: error instanceof AppError ? error.toJSON() : error,
          fallback,
        },
        'Operation failed, using fallback value',
      );
    }
    return fallback;
  }
}

/**
 * Graceful degradation for optional features
 * Logs error but doesn't throw
 */
export async function executeOptional<T>(
  fn: () => Promise<T>,
  options?: {
    serviceName?: string;
    operation?: string;
  },
): Promise<T | null> {
  return withGracefulDegradation(fn, null, {
    ...options,
    logError: true,
  });
}

/**
 * Health check helper with circuit breaker integration
 */
export interface HealthStatus {
  healthy: boolean;
  details: {
    circuitBreakers: Record<
      string,
      {
        state: string;
        metrics: any;
      }
    >;
  };
}

export function getHealthStatus(): HealthStatus {
  const circuitBreakerStatus: Record<string, any> = {};

  circuitBreakers.forEach((breaker, name) => {
    circuitBreakerStatus[name] = {
      state: breaker.getState(),
      metrics: breaker.getMetrics(),
    };
  });

  const allClosed = Array.from(circuitBreakers.values()).every(
    (breaker) => breaker.getState() === 'closed',
  );

  return {
    healthy: allClosed,
    details: {
      circuitBreakers: circuitBreakerStatus,
    },
  };
}

/**
 * Reset all circuit breakers (useful for testing)
 */
export function resetAllCircuitBreakers(): void {
  circuitBreakers.forEach((breaker) => breaker.reset());
  logger.info('All circuit breakers reset');
}

/**
 * Get circuit breaker metrics
 */
export function getCircuitBreakerMetrics() {
  const metrics: Record<string, any> = {};

  circuitBreakers.forEach((breaker, name) => {
    metrics[name] = breaker.getMetrics();
  });

  return metrics;
}

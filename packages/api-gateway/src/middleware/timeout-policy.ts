/**
 * Timeout Policy Middleware
 *
 * Manages request timeouts with configurable policies
 */

import { createLogger } from '../utils/logger.js';

const logger = createLogger('timeout-policy');

export interface TimeoutConfig {
  default: number;
  perRoute?: Map<string, number>;
  connect?: number;
  read?: number;
  write?: number;
}

export class TimeoutPolicy {
  private config: TimeoutConfig;

  constructor(config: TimeoutConfig) {
    this.config = {
      default: 30000,
      connect: 5000,
      read: 30000,
      write: 30000,
      ...config,
    };
  }

  getTimeout(route?: string): number {
    if (route && this.config.perRoute?.has(route)) {
      return this.config.perRoute.get(route)!;
    }
    return this.config.default;
  }

  async executeWithTimeout<T>(
    operation: () => Promise<T>,
    timeoutMs?: number,
    context?: Record<string, any>
  ): Promise<T> {
    const timeout = timeoutMs || this.config.default;

    return Promise.race([
      operation(),
      this.createTimeoutPromise<T>(timeout, context),
    ]);
  }

  private createTimeoutPromise<T>(ms: number, context?: Record<string, any>): Promise<T> {
    return new Promise((_, reject) => {
      setTimeout(() => {
        logger.error('Request timeout', { timeout: ms, context });
        reject(new TimeoutError(`Request timeout after ${ms}ms`, ms));
      }, ms);
    });
  }

  setRouteTimeout(route: string, timeout: number): void {
    if (!this.config.perRoute) {
      this.config.perRoute = new Map();
    }
    this.config.perRoute.set(route, timeout);
  }

  getConfig(): TimeoutConfig {
    return { ...this.config };
  }
}

export class TimeoutError extends Error {
  constructor(message: string, public readonly timeout: number) {
    super(message);
    this.name = 'TimeoutError';
  }
}

/**
 * API Gateway - Main Gateway Class
 */

import { EventEmitter } from 'events';
import { Router, Route } from './routing/router.js';
import { LoadBalancer, LoadBalancingStrategy } from './routing/load-balancer.js';
import { CircuitBreaker } from './routing/circuit-breaker.js';
import { createLogger } from './utils/logger.js';
import type { IncomingMessage, ServerResponse } from 'http';

const logger = createLogger('gateway');

export interface GatewayConfig {
  port?: number;
  host?: string;
  routes: Route[];
  loadBalancing?: {
    strategy: LoadBalancingStrategy;
    healthCheckInterval?: number;
  };
  circuitBreaker?: {
    threshold: number;
    timeout: number;
    resetTimeout: number;
  };
  retryPolicy?: {
    maxRetries: number;
    retryDelay: number;
    exponentialBackoff: boolean;
  };
  timeout?: number;
}

export class APIGateway extends EventEmitter {
  private router: Router;
  private loadBalancer: LoadBalancer;
  private circuitBreaker: CircuitBreaker;
  private config: GatewayConfig;

  constructor(config: GatewayConfig) {
    super();
    this.config = config;
    this.router = new Router(config.routes);

    this.loadBalancer = new LoadBalancer(
      config.loadBalancing?.strategy || 'round-robin',
      config.loadBalancing?.healthCheckInterval
    );

    this.circuitBreaker = new CircuitBreaker({
      threshold: config.circuitBreaker?.threshold || 5,
      timeout: config.circuitBreaker?.timeout || 60000,
      resetTimeout: config.circuitBreaker?.resetTimeout || 30000,
    });

    logger.info('API Gateway initialized', {
      routes: config.routes.length,
      strategy: config.loadBalancing?.strategy || 'round-robin',
    });
  }

  async handleRequest(req: IncomingMessage, res: ServerResponse): Promise<void> {
    const startTime = Date.now();
    const requestId = this.generateRequestId();

    try {
      // Route matching
      const route = this.router.match(req.url || '/', req.method || 'GET');

      if (!route) {
        this.sendError(res, 404, 'Route not found');
        return;
      }

      // Select backend using load balancer
      const backend = await this.loadBalancer.selectBackend(route.backends);

      if (!backend) {
        this.sendError(res, 503, 'No available backends');
        return;
      }

      // Check circuit breaker
      if (!this.circuitBreaker.canRequest(backend.url)) {
        this.sendError(res, 503, 'Service temporarily unavailable');
        return;
      }

      // Forward request with retry logic
      await this.forwardRequest(req, res, backend.url, route);

      const duration = Date.now() - startTime;
      this.circuitBreaker.recordSuccess(backend.url);

      logger.info('Request completed', {
        requestId,
        method: req.method,
        url: req.url,
        backend: backend.url,
        duration,
      });

      this.emit('request:success', { requestId, duration, backend });

    } catch (error) {
      const duration = Date.now() - startTime;
      logger.error('Request failed', {
        requestId,
        error: error instanceof Error ? error.message : String(error),
        duration,
      });

      this.emit('request:error', { requestId, error, duration });

      if (!res.headersSent) {
        this.sendError(res, 500, 'Internal server error');
      }
    }
  }

  private async forwardRequest(
    req: IncomingMessage,
    res: ServerResponse,
    backendUrl: string,
    route: Route
  ): Promise<void> {
    const maxRetries = this.config.retryPolicy?.maxRetries || 3;
    let lastError: Error | null = null;

    for (let attempt = 0; attempt <= maxRetries; attempt++) {
      try {
        await this.executeRequest(req, res, backendUrl, route);
        return;
      } catch (error) {
        lastError = error instanceof Error ? error : new Error(String(error));

        if (attempt < maxRetries) {
          const delay = this.calculateRetryDelay(attempt);
          await this.sleep(delay);
          logger.warn('Retrying request', { attempt: attempt + 1, delay });
        }
      }
    }

    this.circuitBreaker.recordFailure(backendUrl);
    throw lastError || new Error('Request failed');
  }

  private async executeRequest(
    req: IncomingMessage,
    res: ServerResponse,
    backendUrl: string,
    route: Route
  ): Promise<void> {
    return new Promise((resolve, reject) => {
      // This is a simplified implementation
      // In production, use http-proxy or similar library
      const timeout = setTimeout(() => {
        reject(new Error('Request timeout'));
      }, this.config.timeout || 30000);

      // Proxy logic would go here
      // For now, we'll simulate a successful response
      clearTimeout(timeout);
      resolve();
    });
  }

  private calculateRetryDelay(attempt: number): number {
    const baseDelay = this.config.retryPolicy?.retryDelay || 1000;

    if (this.config.retryPolicy?.exponentialBackoff) {
      return baseDelay * Math.pow(2, attempt);
    }

    return baseDelay;
  }

  private sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  private sendError(res: ServerResponse, statusCode: number, message: string): void {
    res.writeHead(statusCode, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ error: message, statusCode }));
  }

  private generateRequestId(): string {
    return `req_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  getMetrics() {
    return {
      routes: this.router.getRoutes().length,
      circuitBreakerStatus: this.circuitBreaker.getStatus(),
      loadBalancerStats: this.loadBalancer.getStats(),
    };
  }
}

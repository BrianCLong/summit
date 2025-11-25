
import AdaptiveRouter from './adaptive-router';
import MetricsCollector from './metrics-collector';

import { Backend } from './types';

/**
 * @class LoadBalancer
 * @description A comprehensive load balancer that integrates metrics collection, predictive analysis, and adaptive routing.
 */
class LoadBalancer {
  private static instance: LoadBalancer;
  private backends: Backend[] = [];
  private router = AdaptiveRouter.getInstance();
  private metrics = MetricsCollector.getInstance();
  private healthCheckInterval: NodeJS.Timeout | null = null;
  private metricsUpdateInterval: NodeJS.Timeout | null = null;
  private stickySessions = new Map<string, string>();

  private constructor() {}

  /**
   * Singleton instance accessor.
   * @returns {LoadBalancer} The singleton instance.
   */
  public static getInstance(): LoadBalancer {
    if (!LoadBalancer.instance) {
      LoadBalancer.instance = new LoadBalancer();
    }
    return LoadBalancer.instance;
  }

  /**
   * Initializes the load balancer with a set of backends and starts health checks.
   * @param {Backend[]} initialBackends - The initial list of backends.
   */
  public initialize(initialBackends: Backend[]): void {
    this.backends = initialBackends;
    this.router.updateBackends(this.backends);
    this.startHealthChecks();
    this.startMetricsUpdates();
  }

  /**
   * Selects the next backend to handle a request, based on the chosen routing strategy.
   * @param {string} strategy - The routing strategy to use.
   * @param {string} [sessionId] - An optional session ID for sticky sessions.
   * @returns {Backend | null} The selected backend.
   */
  public getNextBackend(strategy: 'weightedRoundRobin' | 'leastConnections' | 'lowestLatency', sessionId?: string): Backend | null {
    if (sessionId && this.stickySessions.has(sessionId)) {
      const backendId = this.stickySessions.get(sessionId)!;
      const backend = this.backends.find(b => b.id === backendId && b.status === 'UP');
      if (backend) {
        return backend;
      }
    }

    const backend = this.router[strategy]();
    if (backend && sessionId) {
      this.stickySessions.set(sessionId, backend.id);
    }
    return backend;
  }

  /**
   * Starts periodic health checks for all backends.
   */
  private startHealthChecks(): void {
    if (this.healthCheckInterval) {
      clearInterval(this.healthCheckInterval);
    }
    this.healthCheckInterval = setInterval(() => {
      this.backends.forEach(backend => {
        // In a real implementation, this would be an actual health check (e.g., a TCP ping or an HTTP request).
        const isHealthy = Math.random() > 0.1; // 90% chance of being healthy.
        backend.status = isHealthy ? 'UP' : 'DOWN';
        this.metrics.updateHealthCheckStatus(backend.id, backend.status);
      });
      this.router.updateBackends(this.backends);
    }, 10000); // Check every 10 seconds.
  }

  /**
   * Stops all periodic tasks.
   */
  public shutdown(): void {
    if (this.healthCheckInterval) {
      clearInterval(this.healthCheckInterval);
    }
    if (this.metricsUpdateInterval) {
      clearInterval(this.metricsUpdateInterval);
    }
  }

  /**
   * Starts periodic updates of backend metrics.
   */
  private startMetricsUpdates(): void {
    if (this.metricsUpdateInterval) {
      clearInterval(this.metricsUpdateInterval);
    }
    this.metricsUpdateInterval = setInterval(() => {
      this.updateBackendMetrics();
    }, 5000); // Update every 5 seconds.
  }

  /**
   * Updates backend properties with the latest metrics.
   */
  private updateBackendMetrics(): void {
    const metrics = this.metrics.getMetrics() as any;
    this.backends.forEach(backend => {
      const backendLatencies = metrics.latencies[backend.id];
      if (backendLatencies && backendLatencies.length > 0) {
        const avgLatency = backendLatencies.reduce((a: number, b: number) => a + b, 0) / backendLatencies.length;
        backend.latency = avgLatency;
      }
      // In a real implementation, we would also update connections from a reliable source.
    });
    this.router.updateBackends(this.backends);
  }

  /**
   * Adds a new backend to the pool.
   * @param {Backend} backend - The backend to add.
   */
  public addBackend(backend: Backend): void {
    this.backends.push(backend);
    this.router.updateBackends(this.backends);
  }

  /**
   * Gracefully removes a backend from the pool.
   * @param {string} backendId - The ID of the backend to remove.
   */
  public removeBackend(backendId: string): void {
    this.backends = this.backends.filter(b => b.id !== backendId);
    this.router.updateBackends(this.backends);
  }

  /**
   * Placeholder for connection pooling.
   * @param {string} backendId - The ID of the backend.
   * @returns {any} A connection from the pool.
   */
  public getConnection(backendId: string): any {
    // In a real implementation, this would manage a pool of connections.
    return { status: 'connected' };
  }

  /**
   * Placeholder for request queuing during overload.
   * @param {any} request - The request to queue.
   */
  public queueRequest(request: any): void {
    // In a real implementation, this would add the request to a queue.
  }
}

export default LoadBalancer.getInstance();

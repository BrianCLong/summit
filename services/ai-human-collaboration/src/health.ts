/**
 * Health Check and Service Lifecycle Management
 * Provides readiness/liveness probes and graceful shutdown
 */

import { CollaborationPersistence } from './persistence.js';

/**
 * Health status for the service
 */
export interface HealthStatus {
  status: 'healthy' | 'degraded' | 'unhealthy';
  timestamp: string;
  version: string;
  uptime: number;
  checks: {
    name: string;
    status: 'pass' | 'warn' | 'fail';
    message?: string;
    latencyMs?: number;
  }[];
}

/**
 * Readiness status
 */
export interface ReadinessStatus {
  ready: boolean;
  reason?: string;
}

/**
 * Liveness status
 */
export interface LivenessStatus {
  alive: boolean;
  reason?: string;
}

/**
 * Service lifecycle state
 */
export type ServiceState = 'starting' | 'ready' | 'degraded' | 'stopping' | 'stopped';

/**
 * Health check manager for the collaboration service
 */
export class HealthCheckManager {
  private startTime: number;
  private version: string;
  private state: ServiceState = 'starting';
  private persistence?: CollaborationPersistence;
  private shutdownCallbacks: Array<() => Promise<void>> = [];

  constructor(version = '1.0.0') {
    this.startTime = Date.now();
    this.version = version;
  }

  /**
   * Set persistence layer for health checks
   */
  setPersistence(persistence: CollaborationPersistence): void {
    this.persistence = persistence;
  }

  /**
   * Mark service as ready
   */
  markReady(): void {
    this.state = 'ready';
  }

  /**
   * Mark service as degraded
   */
  markDegraded(): void {
    this.state = 'degraded';
  }

  /**
   * Register shutdown callback
   */
  onShutdown(callback: () => Promise<void>): void {
    this.shutdownCallbacks.push(callback);
  }

  /**
   * Get comprehensive health status
   */
  async getHealth(): Promise<HealthStatus> {
    const checks: HealthStatus['checks'] = [];

    // Check persistence layer
    if (this.persistence) {
      try {
        const result = await this.persistence.healthCheck();
        checks.push({
          name: 'persistence',
          status: result.healthy ? 'pass' : 'fail',
          latencyMs: result.latencyMs,
        });
      } catch (error) {
        checks.push({
          name: 'persistence',
          status: 'fail',
          message: error instanceof Error ? error.message : 'Unknown error',
        });
      }
    } else {
      checks.push({
        name: 'persistence',
        status: 'warn',
        message: 'No persistence layer configured (using in-memory)',
      });
    }

    // Check service state
    checks.push({
      name: 'service_state',
      status: this.state === 'ready' ? 'pass' : this.state === 'degraded' ? 'warn' : 'fail',
      message: `State: ${this.state}`,
    });

    // Check memory usage
    const memoryUsage = process.memoryUsage();
    const heapUsedMB = Math.round(memoryUsage.heapUsed / 1024 / 1024);
    const heapTotalMB = Math.round(memoryUsage.heapTotal / 1024 / 1024);
    const heapPercent = (memoryUsage.heapUsed / memoryUsage.heapTotal) * 100;

    checks.push({
      name: 'memory',
      status: heapPercent < 80 ? 'pass' : heapPercent < 95 ? 'warn' : 'fail',
      message: `${heapUsedMB}MB / ${heapTotalMB}MB (${heapPercent.toFixed(1)}%)`,
    });

    // Determine overall status
    const hasFailure = checks.some((c) => c.status === 'fail');
    const hasWarning = checks.some((c) => c.status === 'warn');

    return {
      status: hasFailure ? 'unhealthy' : hasWarning ? 'degraded' : 'healthy',
      timestamp: new Date().toISOString(),
      version: this.version,
      uptime: Date.now() - this.startTime,
      checks,
    };
  }

  /**
   * Check if service is ready to accept traffic
   */
  async getReadiness(): Promise<ReadinessStatus> {
    if (this.state === 'starting') {
      return { ready: false, reason: 'Service is starting' };
    }

    if (this.state === 'stopping' || this.state === 'stopped') {
      return { ready: false, reason: 'Service is shutting down' };
    }

    // Check persistence if configured
    if (this.persistence) {
      try {
        const result = await this.persistence.healthCheck();
        if (!result.healthy) {
          return { ready: false, reason: 'Persistence layer unhealthy' };
        }
      } catch (error) {
        return {
          ready: false,
          reason: `Persistence check failed: ${error instanceof Error ? error.message : 'Unknown'}`,
        };
      }
    }

    return { ready: true };
  }

  /**
   * Check if service is alive
   */
  getLiveness(): LivenessStatus {
    if (this.state === 'stopped') {
      return { alive: false, reason: 'Service stopped' };
    }

    return { alive: true };
  }

  /**
   * Get current service state
   */
  getState(): ServiceState {
    return this.state;
  }

  /**
   * Get uptime in milliseconds
   */
  getUptime(): number {
    return Date.now() - this.startTime;
  }

  /**
   * Graceful shutdown
   */
  async shutdown(): Promise<void> {
    this.state = 'stopping';

    // Run shutdown callbacks in reverse order
    for (const callback of this.shutdownCallbacks.reverse()) {
      try {
        await callback();
      } catch (error) {
        console.error('Shutdown callback error:', error);
      }
    }

    // Close persistence
    if (this.persistence) {
      try {
        await this.persistence.close();
      } catch (error) {
        console.error('Persistence close error:', error);
      }
    }

    this.state = 'stopped';
  }
}

/**
 * Express/Fastify compatible health endpoint handlers
 */
export function createHealthEndpoints(manager: HealthCheckManager) {
  return {
    /**
     * GET /health - Full health status
     */
    health: async (): Promise<{ status: number; body: HealthStatus }> => {
      const health = await manager.getHealth();
      return {
        status: health.status === 'healthy' ? 200 : health.status === 'degraded' ? 200 : 503,
        body: health,
      };
    },

    /**
     * GET /health/ready - Readiness probe
     */
    ready: async (): Promise<{ status: number; body: ReadinessStatus }> => {
      const readiness = await manager.getReadiness();
      return {
        status: readiness.ready ? 200 : 503,
        body: readiness,
      };
    },

    /**
     * GET /health/live - Liveness probe
     */
    live: (): { status: number; body: LivenessStatus } => {
      const liveness = manager.getLiveness();
      return {
        status: liveness.alive ? 200 : 503,
        body: liveness,
      };
    },
  };
}

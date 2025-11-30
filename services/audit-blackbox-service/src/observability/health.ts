/**
 * Health Check System
 *
 * Comprehensive health checks for the Audit Black Box Service.
 * Implements Kubernetes liveness, readiness, and startup probes.
 *
 * Features:
 * - Component-level health status
 * - Dependency health (PostgreSQL, Redis, HSM)
 * - Degraded state detection
 * - Detailed diagnostics endpoint
 */

import { EventEmitter } from 'events';

/**
 * Health status levels
 */
export type HealthStatus = 'healthy' | 'degraded' | 'unhealthy';

/**
 * Component health check result
 */
export interface ComponentHealth {
  name: string;
  status: HealthStatus;
  latencyMs?: number;
  message?: string;
  lastChecked: Date;
  details?: Record<string, unknown>;
}

/**
 * Overall system health
 */
export interface SystemHealth {
  status: HealthStatus;
  timestamp: Date;
  uptime: number;
  version: string;
  components: ComponentHealth[];
  checks: {
    live: boolean;
    ready: boolean;
    startup: boolean;
  };
}

/**
 * Health check function type
 */
export type HealthCheckFn = () => Promise<ComponentHealth>;

/**
 * Health checker configuration
 */
export interface HealthCheckerConfig {
  version: string;
  checkIntervalMs: number;
  unhealthyThreshold: number;
  degradedThreshold: number;
  startupGracePeriodMs: number;
}

/**
 * Default configuration
 */
const DEFAULT_CONFIG: HealthCheckerConfig = {
  version: process.env.SERVICE_VERSION || '1.0.0',
  checkIntervalMs: 30000, // 30 seconds
  unhealthyThreshold: 3,
  degradedThreshold: 1,
  startupGracePeriodMs: 60000, // 1 minute
};

/**
 * Health Checker
 */
export class HealthChecker extends EventEmitter {
  private config: HealthCheckerConfig;
  private startTime: Date;
  private healthChecks: Map<string, HealthCheckFn> = new Map();
  private lastResults: Map<string, ComponentHealth> = new Map();
  private failureCounts: Map<string, number> = new Map();
  private checkTimer?: NodeJS.Timeout;
  private startupComplete: boolean = false;

  constructor(config: Partial<HealthCheckerConfig> = {}) {
    super();
    this.config = { ...DEFAULT_CONFIG, ...config };
    this.startTime = new Date();
  }

  /**
   * Register a health check
   */
  registerCheck(name: string, check: HealthCheckFn): void {
    this.healthChecks.set(name, check);
    this.failureCounts.set(name, 0);
  }

  /**
   * Unregister a health check
   */
  unregisterCheck(name: string): void {
    this.healthChecks.delete(name);
    this.lastResults.delete(name);
    this.failureCounts.delete(name);
  }

  /**
   * Start periodic health checks
   */
  start(): void {
    this.checkTimer = setInterval(async () => {
      await this.runAllChecks();
    }, this.config.checkIntervalMs);

    // Run initial check
    this.runAllChecks().catch(console.error);

    // Set startup complete after grace period
    setTimeout(() => {
      this.startupComplete = true;
      this.emit('startupComplete');
    }, this.config.startupGracePeriodMs);
  }

  /**
   * Stop health checks
   */
  stop(): void {
    if (this.checkTimer) {
      clearInterval(this.checkTimer);
      this.checkTimer = undefined;
    }
  }

  /**
   * Run all registered health checks
   */
  async runAllChecks(): Promise<SystemHealth> {
    const results: ComponentHealth[] = [];

    for (const [name, check] of this.healthChecks) {
      try {
        const start = Date.now();
        const result = await check();
        result.latencyMs = Date.now() - start;
        result.lastChecked = new Date();

        // Update failure count
        if (result.status === 'unhealthy') {
          const count = (this.failureCounts.get(name) || 0) + 1;
          this.failureCounts.set(name, count);
        } else {
          this.failureCounts.set(name, 0);
        }

        this.lastResults.set(name, result);
        results.push(result);
      } catch (error) {
        const failureResult: ComponentHealth = {
          name,
          status: 'unhealthy',
          message: error instanceof Error ? error.message : 'Check failed',
          lastChecked: new Date(),
        };
        this.lastResults.set(name, failureResult);
        results.push(failureResult);

        const count = (this.failureCounts.get(name) || 0) + 1;
        this.failureCounts.set(name, count);
      }
    }

    const health = this.calculateOverallHealth(results);
    this.emit('healthChecked', health);

    return health;
  }

  /**
   * Get current health status
   */
  async getHealth(): Promise<SystemHealth> {
    // Use cached results if recent
    const results = Array.from(this.lastResults.values());

    if (results.length === 0 || this.isStale(results)) {
      return this.runAllChecks();
    }

    return this.calculateOverallHealth(results);
  }

  /**
   * Kubernetes liveness probe
   * Returns true if the service is running and not deadlocked
   */
  async isLive(): Promise<boolean> {
    // Basic liveness - service is running
    return true;
  }

  /**
   * Kubernetes readiness probe
   * Returns true if the service can accept traffic
   */
  async isReady(): Promise<boolean> {
    const health = await this.getHealth();
    return health.status !== 'unhealthy';
  }

  /**
   * Kubernetes startup probe
   * Returns true once initial startup is complete
   */
  async isStartupComplete(): Promise<boolean> {
    if (!this.startupComplete) {
      return false;
    }

    // Check that at least one health check has passed
    const results = Array.from(this.lastResults.values());
    return results.some((r) => r.status !== 'unhealthy');
  }

  /**
   * Get detailed diagnostics
   */
  async getDiagnostics(): Promise<{
    health: SystemHealth;
    metrics: {
      checkCount: number;
      failureRates: Record<string, number>;
      averageLatencies: Record<string, number>;
    };
    environment: {
      nodeVersion: string;
      platform: string;
      memory: NodeJS.MemoryUsage;
      cpuUsage: NodeJS.CpuUsage;
    };
  }> {
    const health = await this.getHealth();

    const failureRates: Record<string, number> = {};
    const averageLatencies: Record<string, number> = {};

    for (const [name, count] of this.failureCounts) {
      failureRates[name] = count;
    }

    for (const [name, result] of this.lastResults) {
      if (result.latencyMs) {
        averageLatencies[name] = result.latencyMs;
      }
    }

    return {
      health,
      metrics: {
        checkCount: this.healthChecks.size,
        failureRates,
        averageLatencies,
      },
      environment: {
        nodeVersion: process.version,
        platform: process.platform,
        memory: process.memoryUsage(),
        cpuUsage: process.cpuUsage(),
      },
    };
  }

  /**
   * Calculate overall health status
   */
  private calculateOverallHealth(components: ComponentHealth[]): SystemHealth {
    const unhealthyCount = components.filter((c) => c.status === 'unhealthy').length;
    const degradedCount = components.filter((c) => c.status === 'degraded').length;

    let status: HealthStatus = 'healthy';

    if (unhealthyCount > 0) {
      // Check if any critical components are unhealthy
      const criticalUnhealthy = components.some(
        (c) =>
          c.status === 'unhealthy' &&
          ['database', 'redis', 'hashchain'].includes(c.name),
      );
      status = criticalUnhealthy ? 'unhealthy' : 'degraded';
    } else if (degradedCount > 0) {
      status = 'degraded';
    }

    return {
      status,
      timestamp: new Date(),
      uptime: Date.now() - this.startTime.getTime(),
      version: this.config.version,
      components,
      checks: {
        live: true,
        ready: status !== 'unhealthy',
        startup: this.startupComplete,
      },
    };
  }

  /**
   * Check if results are stale
   */
  private isStale(results: ComponentHealth[]): boolean {
    const now = Date.now();
    const threshold = this.config.checkIntervalMs * 2;

    return results.some((r) => now - r.lastChecked.getTime() > threshold);
  }
}

/**
 * Create standard health checks for the audit service
 */
export function createStandardHealthChecks(dependencies: {
  db?: {
    query: (sql: string) => Promise<unknown>;
  };
  redis?: {
    ping: () => Promise<string>;
  };
  hashChain?: {
    verifyLatest: () => Promise<boolean>;
  };
}): Map<string, HealthCheckFn> {
  const checks = new Map<string, HealthCheckFn>();

  // Database health check
  if (dependencies.db) {
    checks.set('database', async () => {
      try {
        const start = Date.now();
        await dependencies.db!.query('SELECT 1');
        return {
          name: 'database',
          status: 'healthy' as HealthStatus,
          latencyMs: Date.now() - start,
          lastChecked: new Date(),
        };
      } catch (error) {
        return {
          name: 'database',
          status: 'unhealthy' as HealthStatus,
          message: error instanceof Error ? error.message : 'Database check failed',
          lastChecked: new Date(),
        };
      }
    });
  }

  // Redis health check
  if (dependencies.redis) {
    checks.set('redis', async () => {
      try {
        const start = Date.now();
        const result = await dependencies.redis!.ping();
        return {
          name: 'redis',
          status: result === 'PONG' ? ('healthy' as HealthStatus) : ('degraded' as HealthStatus),
          latencyMs: Date.now() - start,
          lastChecked: new Date(),
        };
      } catch (error) {
        return {
          name: 'redis',
          status: 'unhealthy' as HealthStatus,
          message: error instanceof Error ? error.message : 'Redis check failed',
          lastChecked: new Date(),
        };
      }
    });
  }

  // Hash chain integrity check
  if (dependencies.hashChain) {
    checks.set('hashchain', async () => {
      try {
        const start = Date.now();
        const valid = await dependencies.hashChain!.verifyLatest();
        return {
          name: 'hashchain',
          status: valid ? ('healthy' as HealthStatus) : ('unhealthy' as HealthStatus),
          latencyMs: Date.now() - start,
          message: valid ? undefined : 'Hash chain integrity check failed',
          lastChecked: new Date(),
        };
      } catch (error) {
        return {
          name: 'hashchain',
          status: 'unhealthy' as HealthStatus,
          message: error instanceof Error ? error.message : 'Hash chain check failed',
          lastChecked: new Date(),
        };
      }
    });
  }

  // Memory usage check
  checks.set('memory', async () => {
    const usage = process.memoryUsage();
    const heapUsedPercent = (usage.heapUsed / usage.heapTotal) * 100;

    let status: HealthStatus = 'healthy';
    if (heapUsedPercent > 90) {
      status = 'unhealthy';
    } else if (heapUsedPercent > 75) {
      status = 'degraded';
    }

    return {
      name: 'memory',
      status,
      lastChecked: new Date(),
      details: {
        heapUsedMB: Math.round(usage.heapUsed / 1024 / 1024),
        heapTotalMB: Math.round(usage.heapTotal / 1024 / 1024),
        heapUsedPercent: Math.round(heapUsedPercent),
        externalMB: Math.round(usage.external / 1024 / 1024),
        rssMB: Math.round(usage.rss / 1024 / 1024),
      },
    };
  });

  // Event loop health check
  checks.set('eventloop', async () => {
    return new Promise((resolve) => {
      const start = Date.now();
      setImmediate(() => {
        const latency = Date.now() - start;
        let status: HealthStatus = 'healthy';

        if (latency > 100) {
          status = 'unhealthy';
        } else if (latency > 50) {
          status = 'degraded';
        }

        resolve({
          name: 'eventloop',
          status,
          latencyMs: latency,
          lastChecked: new Date(),
        });
      });
    });
  });

  return checks;
}

/**
 * Create HTTP health check handlers for Express
 */
export function createHealthHandlers(checker: HealthChecker): {
  live: (req: unknown, res: { status: (code: number) => { json: (data: unknown) => void } }) => Promise<void>;
  ready: (req: unknown, res: { status: (code: number) => { json: (data: unknown) => void } }) => Promise<void>;
  startup: (req: unknown, res: { status: (code: number) => { json: (data: unknown) => void } }) => Promise<void>;
  health: (req: unknown, res: { status: (code: number) => { json: (data: unknown) => void } }) => Promise<void>;
  diagnostics: (req: unknown, res: { status: (code: number) => { json: (data: unknown) => void } }) => Promise<void>;
} {
  return {
    live: async (_req, res) => {
      const isLive = await checker.isLive();
      res.status(isLive ? 200 : 503).json({ live: isLive });
    },

    ready: async (_req, res) => {
      const isReady = await checker.isReady();
      res.status(isReady ? 200 : 503).json({ ready: isReady });
    },

    startup: async (_req, res) => {
      const isStarted = await checker.isStartupComplete();
      res.status(isStarted ? 200 : 503).json({ startup: isStarted });
    },

    health: async (_req, res) => {
      const health = await checker.getHealth();
      const statusCode = health.status === 'healthy' ? 200 : health.status === 'degraded' ? 200 : 503;
      res.status(statusCode).json(health);
    },

    diagnostics: async (_req, res) => {
      const diagnostics = await checker.getDiagnostics();
      res.status(200).json(diagnostics);
    },
  };
}

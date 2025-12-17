/**
 * CompanyOS Observability SDK - Health Check Module
 *
 * Provides standardized health check endpoints and dependency monitoring
 * following Kubernetes probe conventions.
 */

import type { HealthStatus, HealthCheck, HealthReport, ServiceConfig } from '../types/index.js';

// =============================================================================
// HEALTH CHECK REGISTRY
// =============================================================================

type HealthCheckFn = () => Promise<HealthCheck>;

const healthChecks = new Map<string, HealthCheckFn>();
let serviceConfig: ServiceConfig | null = null;
let startTime: number = Date.now();

/**
 * Initialize health check system
 */
export function initializeHealth(config: ServiceConfig): void {
  serviceConfig = config;
  startTime = Date.now();
}

/**
 * Register a health check
 */
export function registerHealthCheck(name: string, check: HealthCheckFn): void {
  healthChecks.set(name, check);
}

/**
 * Unregister a health check
 */
export function unregisterHealthCheck(name: string): void {
  healthChecks.delete(name);
}

// =============================================================================
// HEALTH CHECK EXECUTION
// =============================================================================

/**
 * Run all health checks and return a report
 */
export async function runHealthChecks(): Promise<HealthReport> {
  const checks: HealthCheck[] = [];
  let overallStatus: HealthStatus = 'healthy';

  for (const [name, checkFn] of healthChecks) {
    try {
      const start = Date.now();
      const result = await Promise.race([
        checkFn(),
        new Promise<HealthCheck>((_, reject) =>
          setTimeout(() => reject(new Error('Health check timeout')), 5000)
        ),
      ]);
      result.latency_ms = Date.now() - start;
      result.lastCheck = new Date().toISOString();
      checks.push(result);

      if (result.status === 'unhealthy') {
        overallStatus = 'unhealthy';
      } else if (result.status === 'degraded' && overallStatus !== 'unhealthy') {
        overallStatus = 'degraded';
      }
    } catch (error) {
      checks.push({
        name,
        status: 'unhealthy',
        message: error instanceof Error ? error.message : 'Unknown error',
        lastCheck: new Date().toISOString(),
      });
      overallStatus = 'unhealthy';
    }
  }

  return {
    status: overallStatus,
    service: serviceConfig?.name || 'unknown',
    version: serviceConfig?.version || 'unknown',
    uptime_seconds: Math.floor((Date.now() - startTime) / 1000),
    checks,
    timestamp: new Date().toISOString(),
  };
}

/**
 * Simple liveness check (is the process running?)
 */
export function livenessCheck(): { status: 'ok' } {
  return { status: 'ok' };
}

/**
 * Readiness check (is the service ready to accept traffic?)
 */
export async function readinessCheck(): Promise<HealthReport> {
  return runHealthChecks();
}

// =============================================================================
// COMMON HEALTH CHECK FACTORIES
// =============================================================================

/**
 * Create a PostgreSQL health check
 */
export function createPostgresHealthCheck(
  pool: { query: (sql: string) => Promise<unknown> },
  name: string = 'postgres'
): HealthCheckFn {
  return async (): Promise<HealthCheck> => {
    try {
      await pool.query('SELECT 1');
      return { name, status: 'healthy' };
    } catch (error) {
      return {
        name,
        status: 'unhealthy',
        message: error instanceof Error ? error.message : 'Connection failed',
      };
    }
  };
}

/**
 * Create a Redis health check
 */
export function createRedisHealthCheck(
  client: { ping: () => Promise<string> },
  name: string = 'redis'
): HealthCheckFn {
  return async (): Promise<HealthCheck> => {
    try {
      const result = await client.ping();
      if (result === 'PONG') {
        return { name, status: 'healthy' };
      }
      return { name, status: 'degraded', message: `Unexpected response: ${result}` };
    } catch (error) {
      return {
        name,
        status: 'unhealthy',
        message: error instanceof Error ? error.message : 'Connection failed',
      };
    }
  };
}

/**
 * Create a Neo4j health check
 */
export function createNeo4jHealthCheck(
  driver: { verifyConnectivity: () => Promise<unknown> },
  name: string = 'neo4j'
): HealthCheckFn {
  return async (): Promise<HealthCheck> => {
    try {
      await driver.verifyConnectivity();
      return { name, status: 'healthy' };
    } catch (error) {
      return {
        name,
        status: 'unhealthy',
        message: error instanceof Error ? error.message : 'Connection failed',
      };
    }
  };
}

/**
 * Create an HTTP dependency health check
 */
export function createHttpHealthCheck(
  url: string,
  name: string,
  options: { timeout?: number; expectedStatus?: number } = {}
): HealthCheckFn {
  const { timeout = 3000, expectedStatus = 200 } = options;

  return async (): Promise<HealthCheck> => {
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), timeout);

      const response = await fetch(url, {
        method: 'GET',
        signal: controller.signal,
      });

      clearTimeout(timeoutId);

      if (response.status === expectedStatus) {
        return { name, status: 'healthy' };
      }

      return {
        name,
        status: 'degraded',
        message: `Unexpected status: ${response.status}`,
      };
    } catch (error) {
      return {
        name,
        status: 'unhealthy',
        message: error instanceof Error ? error.message : 'Request failed',
      };
    }
  };
}

/**
 * Create a memory health check
 */
export function createMemoryHealthCheck(
  thresholdPercent: number = 90,
  name: string = 'memory'
): HealthCheckFn {
  return async (): Promise<HealthCheck> => {
    const used = process.memoryUsage();
    const heapUsedPercent = (used.heapUsed / used.heapTotal) * 100;

    if (heapUsedPercent > thresholdPercent) {
      return {
        name,
        status: 'degraded',
        message: `Heap usage at ${heapUsedPercent.toFixed(1)}% (threshold: ${thresholdPercent}%)`,
      };
    }

    return { name, status: 'healthy' };
  };
}

/**
 * Create a disk space health check
 */
export function createDiskHealthCheck(
  path: string = '/',
  thresholdPercent: number = 90,
  name: string = 'disk'
): HealthCheckFn {
  return async (): Promise<HealthCheck> => {
    try {
      // This would need a proper disk check implementation
      // For now, return healthy as a placeholder
      return { name, status: 'healthy' };
    } catch (error) {
      return {
        name,
        status: 'unhealthy',
        message: error instanceof Error ? error.message : 'Disk check failed',
      };
    }
  };
}

// =============================================================================
// EXPRESS ROUTE HANDLERS
// =============================================================================

export interface HealthRouteHandlers {
  liveness: (req: unknown, res: { status: (code: number) => { json: (body: unknown) => void } }) => void;
  readiness: (req: unknown, res: { status: (code: number) => { json: (body: unknown) => void } }) => Promise<void>;
  detailed: (req: unknown, res: { status: (code: number) => { json: (body: unknown) => void } }) => Promise<void>;
}

/**
 * Create Express route handlers for health endpoints
 */
export function createHealthRoutes(): HealthRouteHandlers {
  return {
    liveness: (_req, res) => {
      res.status(200).json(livenessCheck());
    },

    readiness: async (_req, res) => {
      const report = await readinessCheck();
      const statusCode = report.status === 'healthy' ? 200 : report.status === 'degraded' ? 200 : 503;
      res.status(statusCode).json(report);
    },

    detailed: async (_req, res) => {
      const report = await runHealthChecks();
      const statusCode = report.status === 'healthy' ? 200 : report.status === 'degraded' ? 200 : 503;
      res.status(statusCode).json(report);
    },
  };
}

// =============================================================================
// EXPORTS
// =============================================================================

export type { HealthStatus, HealthCheck, HealthReport };

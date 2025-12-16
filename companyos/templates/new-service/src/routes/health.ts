/**
 * Health Check Routes
 * Standard health endpoints for Kubernetes probes
 */

import { Router, Request, Response } from 'express';
import { config } from '../config.js';

export const healthRoutes = Router();

interface HealthStatus {
  status: 'healthy' | 'degraded' | 'unhealthy';
  timestamp: string;
  service: string;
  version: string;
  checks?: Record<string, HealthCheck>;
}

interface HealthCheck {
  status: 'pass' | 'fail';
  latency?: number;
  message?: string;
}

/**
 * Basic health check - always returns 200 if server is running
 */
healthRoutes.get('/', (req: Request, res: Response) => {
  const status: HealthStatus = {
    status: 'healthy',
    timestamp: new Date().toISOString(),
    service: config.serviceName,
    version: process.env.npm_package_version || '0.0.0',
  };

  res.json(status);
});

/**
 * Readiness probe - checks if service can accept traffic
 */
healthRoutes.get('/ready', async (req: Request, res: Response) => {
  const checks: Record<string, HealthCheck> = {};
  let allHealthy = true;

  // Check OPA connectivity
  try {
    const start = Date.now();
    const response = await fetch(`${config.opaUrl}/health`, {
      signal: AbortSignal.timeout(2000),
    });
    checks.opa = {
      status: response.ok ? 'pass' : 'fail',
      latency: Date.now() - start,
    };
    if (!response.ok) allHealthy = false;
  } catch (error) {
    checks.opa = {
      status: 'fail',
      message: error instanceof Error ? error.message : 'Unknown error',
    };
    allHealthy = false;
  }

  const status: HealthStatus = {
    status: allHealthy ? 'healthy' : 'degraded',
    timestamp: new Date().toISOString(),
    service: config.serviceName,
    version: process.env.npm_package_version || '0.0.0',
    checks,
  };

  res.status(allHealthy ? 200 : 503).json(status);
});

/**
 * Liveness probe - checks if service should be restarted
 */
healthRoutes.get('/live', (req: Request, res: Response) => {
  // Basic liveness - just confirm the event loop is working
  res.json({
    status: 'healthy',
    timestamp: new Date().toISOString(),
  });
});

/**
 * Detailed health - for debugging
 */
healthRoutes.get('/detailed', async (req: Request, res: Response) => {
  const checks: Record<string, HealthCheck> = {};

  // Memory usage
  const memUsage = process.memoryUsage();
  checks.memory = {
    status: memUsage.heapUsed < memUsage.heapTotal * 0.9 ? 'pass' : 'fail',
    message: `Heap: ${Math.round(memUsage.heapUsed / 1024 / 1024)}MB / ${Math.round(memUsage.heapTotal / 1024 / 1024)}MB`,
  };

  // Uptime
  checks.uptime = {
    status: 'pass',
    message: `${Math.round(process.uptime())} seconds`,
  };

  // OPA
  try {
    const start = Date.now();
    const response = await fetch(`${config.opaUrl}/health`, {
      signal: AbortSignal.timeout(2000),
    });
    checks.opa = {
      status: response.ok ? 'pass' : 'fail',
      latency: Date.now() - start,
    };
  } catch (error) {
    checks.opa = {
      status: 'fail',
      message: error instanceof Error ? error.message : 'Unknown error',
    };
  }

  const allHealthy = Object.values(checks).every((c) => c.status === 'pass');

  res.json({
    status: allHealthy ? 'healthy' : 'degraded',
    timestamp: new Date().toISOString(),
    service: config.serviceName,
    version: process.env.npm_package_version || '0.0.0',
    environment: config.nodeEnv,
    checks,
  });
});

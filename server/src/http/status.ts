// Operational Status Matrix Endpoint
// Provides comprehensive system health and status information

import express from 'express';
import os from 'os';
import { createBudgetController } from '../conductor/admission/budget-control';
import { getConductorHealth } from '../conductor/metrics';
import Redis from 'ioredis';

export const statusRouter = express.Router();

interface ServiceStatus {
  name: string;
  status: 'healthy' | 'degraded' | 'unhealthy' | 'unknown';
  response_time_ms?: number;
  details?: any;
  last_check?: string;
}

interface SystemStatus {
  timestamp: string;
  host: string;
  uptime_seconds: number;
  versions: {
    server: string;
    policy: string;
    node: string;
  };
  system: {
    cpu_usage: number;
    memory_usage: number;
    disk_usage?: number;
  };
  services: ServiceStatus[];
  conductor: {
    enabled: boolean;
    budget: any;
    health: any;
  };
  overall_status: 'healthy' | 'degraded' | 'unhealthy';
}

// Ping helper function
async function ping(target: string): Promise<{
  status: 'healthy' | 'unhealthy';
  response_time_ms: number;
  details?: any;
}> {
  const startTime = Date.now();

  try {
    if (target.startsWith('http')) {
      // HTTP health check
      const response = await fetch(target, {
        method: 'GET',
        signal: AbortSignal.timeout(5000),
      });

      const responseTime = Date.now() - startTime;

      if (response.ok) {
        let details: any = {};
        try {
          const contentType = response.headers.get('content-type');
          if (contentType && contentType.includes('application/json')) {
            details = await response.json();
          }
        } catch {
          // Ignore JSON parsing errors
        }

        return {
          status: 'healthy',
          response_time_ms: responseTime,
          details,
        };
      } else {
        return {
          status: 'unhealthy',
          response_time_ms: responseTime,
          details: {
            status_code: response.status,
            status_text: response.statusText,
          },
        };
      }
    } else {
      // Database connection check
      const responseTime = Date.now() - startTime;
      return {
        status: 'healthy',
        response_time_ms: responseTime,
        details: { type: 'database_connection' },
      };
    }
  } catch (error) {
    const responseTime = Date.now() - startTime;
    return {
      status: 'unhealthy',
      response_time_ms: responseTime,
      details: { error: error.message },
    };
  }
}

// Get system resource usage
function getSystemUsage() {
  const totalMemory = os.totalmem();
  const freeMemory = os.freemem();
  const memoryUsage = ((totalMemory - freeMemory) / totalMemory) * 100;

  // Get CPU usage (simplified)
  const cpus = os.cpus();
  let totalIdle = 0;
  let totalTick = 0;

  for (const cpu of cpus) {
    for (const type in cpu.times) {
      totalTick += cpu.times[type];
    }
    totalIdle += cpu.times.idle;
  }

  const cpuUsage = 100 - (100 * totalIdle) / totalTick;

  return {
    cpu_usage: Math.round(cpuUsage * 100) / 100,
    memory_usage: Math.round(memoryUsage * 100) / 100,
  };
}

// Get budget status
async function getBudgetStatus() {
  try {
    const redis = new Redis(process.env.REDIS_URL || 'redis://localhost:6379');
    const budgetController = createBudgetController(redis);
    const status = await budgetController.getBudgetStatus();
    redis.disconnect();
    return status;
  } catch (error) {
    return {
      error: error.message,
      status: 'unknown',
    };
  }
}

// Main status endpoint
statusRouter.get('/status', async (_req, res) => {
  const startTime = Date.now();

  try {
    // Get system information
    const uptime = process.uptime();
    const systemUsage = getSystemUsage();

    // Check all services concurrently
    const serviceChecks = await Promise.allSettled([
      ping('http://neo4j:7474').then((result) => ({
        name: 'neo4j',
        ...result,
      })),
      ping('http://postgres:5432').then((result) => ({
        name: 'postgres',
        ...result,
      })),
      ping('http://redis:6379').then((result) => ({
        name: 'redis',
        ...result,
      })),
      ping('http://mcp-graphops:8081/health').then((result) => ({
        name: 'mcp_graphops',
        ...result,
      })),
      ping('http://mcp-files:8082/health').then((result) => ({
        name: 'mcp_files',
        ...result,
      })),
      ping('http://opa:8181/health').then((result) => ({
        name: 'opa',
        ...result,
      })),
    ]);

    // Process service results
    const services: ServiceStatus[] = serviceChecks.map((result, index) => {
      const serviceNames = [
        'neo4j',
        'postgres',
        'redis',
        'mcp_graphops',
        'mcp_files',
        'opa',
      ];
      const serviceName = serviceNames[index];

      if (result.status === 'fulfilled') {
        return {
          name: serviceName,
          status: result.value.status,
          response_time_ms: result.value.response_time_ms,
          details: result.value.details,
          last_check: new Date().toISOString(),
        };
      } else {
        return {
          name: serviceName,
          status: 'unhealthy',
          details: { error: result.reason?.message || 'Unknown error' },
          last_check: new Date().toISOString(),
        };
      }
    });

    // Get conductor-specific status
    const conductorEnabled = process.env.CONDUCTOR_ENABLED === 'true';
    let conductorHealth: any = { status: 'disabled' };
    let budgetStatus: any = { status: 'disabled' };

    if (conductorEnabled) {
      try {
        conductorHealth = await getConductorHealth();
        budgetStatus = await getBudgetStatus();
      } catch (error) {
        conductorHealth = { status: 'error', error: error.message };
        budgetStatus = { status: 'error', error: error.message };
      }
    }

    // Determine overall status
    const unhealthyServices = services.filter((s) => s.status === 'unhealthy');
    const degradedServices = services.filter((s) => s.status === 'degraded');

    let overallStatus: 'healthy' | 'degraded' | 'unhealthy';
    if (unhealthyServices.length > 0) {
      overallStatus = 'unhealthy';
    } else if (
      degradedServices.length > 0 ||
      budgetStatus.status === 'degraded'
    ) {
      overallStatus = 'degraded';
    } else {
      overallStatus = 'healthy';
    }

    // Build response
    const status: SystemStatus = {
      timestamp: new Date().toISOString(),
      host: os.hostname(),
      uptime_seconds: Math.round(uptime),
      versions: {
        server:
          process.env.BUILD_SHA || process.env.npm_package_version || 'unknown',
        policy: process.env.POLICY_SHA || 'unknown',
        node: process.version,
      },
      system: {
        ...systemUsage,
      },
      services,
      conductor: {
        enabled: conductorEnabled,
        budget: budgetStatus,
        health: conductorHealth,
      },
      overall_status: overallStatus,
    };

    // Set appropriate HTTP status code
    const httpStatus =
      overallStatus === 'healthy'
        ? 200
        : overallStatus === 'degraded'
          ? 200
          : 503;

    // Add performance headers
    const responseTime = Date.now() - startTime;
    res.set({
      'X-Response-Time': `${responseTime}ms`,
      'X-Conductor-Status': overallStatus,
      'X-Conductor-Version': status.versions.server,
      'Cache-Control': 'no-cache, no-store, must-revalidate',
    });

    res.status(httpStatus).json(status);
  } catch (error) {
    console.error('Status endpoint error:', error);

    res.status(500).json({
      timestamp: new Date().toISOString(),
      host: os.hostname(),
      overall_status: 'unhealthy',
      error: 'Internal status check error',
      details: error.message,
    });
  }
});

// Minimal health check endpoint
statusRouter.get('/health', (_req, res) => {
  res.status(200).json({
    status: 'ok',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
  });
});

// Kubernetes-style readiness probe
statusRouter.get('/ready', async (_req, res) => {
  try {
    const { getPostgresPool } = await import('../config/database.js');
    const pool = getPostgresPool();
    await pool.query('SELECT 1');
  } catch (e) {
    return res.status(503).json({
      status: 'unready',
      component: 'postgres',
      error: (e as any)?.message || String(e),
    });
  }
  try {
    const { getRedisClient } = await import('../config/database.js');
    const redis = getRedisClient();
    if (redis) {
      await redis.ping();
    }
  } catch (e) {
    return res.status(503).json({
      status: 'unready',
      component: 'redis',
      error: (e as any)?.message || String(e),
    });
  }
  return res
    .status(200)
    .json({ status: 'ready', timestamp: new Date().toISOString() });
});

// Conductor-specific health endpoint
statusRouter.get('/health/conductor', async (_req, res) => {
  try {
    const health = await getConductorHealth();
    const httpStatus =
      health.status === 'healthy'
        ? 200
        : health.status === 'degraded'
          ? 200
          : 503;

    res.status(httpStatus).json({
      status: health.status,
      timestamp: new Date().toISOString(),
      checks: health.checks,
      conductor_enabled: process.env.CONDUCTOR_ENABLED === 'true',
    });
  } catch (error) {
    res.status(503).json({
      status: 'unhealthy',
      timestamp: new Date().toISOString(),
      error: error.message,
      conductor_enabled: process.env.CONDUCTOR_ENABLED === 'true',
    });
  }
});

// Budget status endpoint
statusRouter.get('/status/budget', async (_req, res) => {
  try {
    const budgetStatus = await getBudgetStatus();

    const httpStatus =
      budgetStatus.status === 'healthy'
        ? 200
        : budgetStatus.status === 'warning'
          ? 200
          : budgetStatus.status === 'degraded'
            ? 200
            : 503;

    res.status(httpStatus).json({
      timestamp: new Date().toISOString(),
      ...budgetStatus,
    });
  } catch (error) {
    res.status(500).json({
      timestamp: new Date().toISOString(),
      status: 'error',
      error: error.message,
    });
  }
});

// Service-specific health endpoints
statusRouter.get('/health/:service', async (req, res) => {
  const { service } = req.params;

  const serviceEndpoints: Record<string, string> = {
    neo4j: 'http://neo4j:7474',
    postgres: 'http://postgres:5432',
    redis: 'http://redis:6379',
    'mcp-graphops': 'http://mcp-graphops:8081/health',
    'mcp-files': 'http://mcp-files:8082/health',
    opa: 'http://opa:8181/health',
  };

  const endpoint = serviceEndpoints[service];
  if (!endpoint) {
    return res.status(404).json({
      error: 'Service not found',
      available_services: Object.keys(serviceEndpoints),
    });
  }

  try {
    const result = await ping(endpoint);
    const httpStatus = result.status === 'healthy' ? 200 : 503;

    res.status(httpStatus).json({
      service,
      timestamp: new Date().toISOString(),
      ...result,
    });
  } catch (error) {
    res.status(503).json({
      service,
      timestamp: new Date().toISOString(),
      status: 'unhealthy',
      error: error.message,
    });
  }
});

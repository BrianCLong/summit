/**
 * Health check routes
 */

import { FastifyInstance } from 'fastify';
import { pool } from '../index.js';

export async function healthRoutes(fastify: FastifyInstance): Promise<void> {
  // Basic health check
  fastify.get('/', async () => {
    return {
      status: 'healthy',
      service: 'decision-api',
      timestamp: new Date().toISOString(),
      version: process.env.npm_package_version || '0.1.0',
    };
  });

  // Readiness check (includes dependencies)
  fastify.get('/ready', async (request, reply) => {
    const checks: Record<string, 'healthy' | 'unhealthy'> = {};

    // Check database
    try {
      await pool.query('SELECT 1');
      checks.database = 'healthy';
    } catch {
      checks.database = 'unhealthy';
    }

    const allHealthy = Object.values(checks).every((c) => c === 'healthy');

    if (!allHealthy) {
      reply.status(503);
    }

    return {
      status: allHealthy ? 'ready' : 'not_ready',
      timestamp: new Date().toISOString(),
      checks,
    };
  });

  // Liveness check
  fastify.get('/live', async () => {
    return {
      status: 'alive',
      timestamp: new Date().toISOString(),
    };
  });

  // Detailed health with metrics
  fastify.get('/detailed', async (request, reply) => {
    const checks: Record<string, unknown> = {};

    // Database stats
    try {
      const result = await pool.query(`
        SELECT
          (SELECT count(*) FROM entities) as entity_count,
          (SELECT count(*) FROM claims) as claim_count,
          (SELECT count(*) FROM evidence) as evidence_count,
          (SELECT count(*) FROM decisions) as decision_count
      `);
      checks.database = {
        status: 'healthy',
        stats: result.rows[0],
        pool: {
          total: pool.totalCount,
          idle: pool.idleCount,
          waiting: pool.waitingCount,
        },
      };
    } catch (error) {
      checks.database = {
        status: 'unhealthy',
        error: (error as Error).message,
      };
    }

    // Memory usage
    const memUsage = process.memoryUsage();
    checks.memory = {
      heapUsed: Math.round(memUsage.heapUsed / 1024 / 1024),
      heapTotal: Math.round(memUsage.heapTotal / 1024 / 1024),
      rss: Math.round(memUsage.rss / 1024 / 1024),
      unit: 'MB',
    };

    // Uptime
    checks.uptime = {
      seconds: Math.round(process.uptime()),
      formatted: formatUptime(process.uptime()),
    };

    const allHealthy = Object.values(checks).every(
      (c: any) => c.status !== 'unhealthy',
    );

    if (!allHealthy) {
      reply.status(503);
    }

    return {
      status: allHealthy ? 'healthy' : 'degraded',
      timestamp: new Date().toISOString(),
      environment: process.env.NODE_ENV || 'development',
      checks,
    };
  });
}

function formatUptime(seconds: number): string {
  const days = Math.floor(seconds / 86400);
  const hours = Math.floor((seconds % 86400) / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  const secs = Math.floor(seconds % 60);

  const parts = [];
  if (days > 0) parts.push(`${days}d`);
  if (hours > 0) parts.push(`${hours}h`);
  if (minutes > 0) parts.push(`${minutes}m`);
  parts.push(`${secs}s`);

  return parts.join(' ');
}

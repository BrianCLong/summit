/**
 * Health Check Routes
 *
 * Standard health endpoints for service monitoring.
 */

import { Router, Request, Response } from 'express';
import { ServiceContext } from '../context.js';

interface HealthStatus {
  status: 'healthy' | 'degraded' | 'unhealthy';
  version: string;
  uptime: number;
  timestamp: string;
  checks: {
    neo4j: { status: string; latencyMs?: number };
    postgres: { status: string; latencyMs?: number };
    redis: { status: string; latencyMs?: number };
  };
}

export function createHealthRoutes(ctx: ServiceContext): Router {
  const router = Router();
  const startTime = Date.now();

  router.get('/', async (_req: Request, res: Response) => {
    res.json({ status: 'ok', service: 'humint-service' });
  });

  router.get('/live', async (_req: Request, res: Response) => {
    res.json({ status: 'ok' });
  });

  router.get('/ready', async (_req: Request, res: Response) => {
    const checks: HealthStatus['checks'] = {
      neo4j: { status: 'unknown' },
      postgres: { status: 'unknown' },
      redis: { status: 'unknown' },
    };

    let allHealthy = true;

    // Check Neo4j
    try {
      const start = Date.now();
      const session = ctx.getNeo4jSession();
      await session.run('RETURN 1');
      await session.close();
      checks.neo4j = { status: 'healthy', latencyMs: Date.now() - start };
    } catch {
      checks.neo4j = { status: 'unhealthy' };
      allHealthy = false;
    }

    // Check PostgreSQL
    try {
      const start = Date.now();
      await ctx.postgres.query('SELECT 1');
      checks.postgres = { status: 'healthy', latencyMs: Date.now() - start };
    } catch {
      checks.postgres = { status: 'unhealthy' };
      allHealthy = false;
    }

    // Check Redis
    try {
      const start = Date.now();
      await ctx.redis.ping();
      checks.redis = { status: 'healthy', latencyMs: Date.now() - start };
    } catch {
      checks.redis = { status: 'unhealthy' };
      allHealthy = false;
    }

    const health: HealthStatus = {
      status: allHealthy ? 'healthy' : 'degraded',
      version: process.env.npm_package_version || '1.0.0',
      uptime: Math.floor((Date.now() - startTime) / 1000),
      timestamp: new Date().toISOString(),
      checks,
    };

    res.status(allHealthy ? 200 : 503).json(health);
  });

  router.get('/detailed', async (_req: Request, res: Response) => {
    const session = ctx.getNeo4jSession();

    try {
      // Get Neo4j stats
      const neo4jStats = await session.run(`
        CALL dbms.queryJmx('org.neo4j:*')
        YIELD name, attributes
        WHERE name CONTAINS 'PageCache' OR name CONTAINS 'Transactions'
        RETURN name, attributes
        LIMIT 10
      `);

      // Get PostgreSQL stats
      const pgStats = await ctx.postgres.query(`
        SELECT
          numbackends as active_connections,
          xact_commit as transactions_committed,
          xact_rollback as transactions_rolled_back,
          blks_read as blocks_read,
          blks_hit as blocks_hit
        FROM pg_stat_database
        WHERE datname = current_database()
      `);

      // Get Redis info
      const redisInfo = await ctx.redis.info('stats');

      res.json({
        neo4j: neo4jStats.records.map((r) => ({
          name: r.get('name'),
          attributes: r.get('attributes'),
        })),
        postgres: pgStats.rows[0] || {},
        redis: redisInfo,
      });
    } catch (error) {
      ctx.logger.error({ error }, 'Health check detailed failed');
      res.status(500).json({ error: 'Failed to get detailed health' });
    } finally {
      await session.close();
    }
  });

  return router;
}

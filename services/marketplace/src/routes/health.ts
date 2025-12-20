import { Router } from 'express';
import { db } from '../utils/db.js';
import { cache } from '../utils/cache.js';
import { metrics } from '../utils/metrics.js';

export const healthRoutes = Router();

healthRoutes.get('/', (_req, res) => {
  res.json({
    status: 'ok',
    service: 'marketplace',
    version: process.env.npm_package_version || '1.0.0',
    timestamp: new Date().toISOString(),
  });
});

healthRoutes.get('/ready', async (_req, res) => {
  const checks: Record<string, string> = {};

  try {
    await db.query('SELECT 1');
    checks.database = 'connected';
  } catch {
    checks.database = 'disconnected';
  }

  try {
    await cache.getClient().ping();
    checks.cache = 'connected';
  } catch {
    checks.cache = 'disconnected';
  }

  const allHealthy = Object.values(checks).every((v) => v === 'connected');

  res.status(allHealthy ? 200 : 503).json({
    status: allHealthy ? 'ready' : 'not ready',
    checks,
  });
});

healthRoutes.get('/live', (_req, res) => {
  res.json({ status: 'live' });
});

healthRoutes.get('/metrics', (_req, res) => {
  res.json(metrics.getMetrics());
});

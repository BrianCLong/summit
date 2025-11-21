import { Router } from 'express';
import { db } from '../utils/db.js';

export const healthRoutes = Router();

healthRoutes.get('/', (_req, res) => {
  res.json({ status: 'ok', service: 'marketplace' });
});

healthRoutes.get('/ready', async (_req, res) => {
  try {
    await db.query('SELECT 1');
    res.json({ status: 'ready', database: 'connected' });
  } catch {
    res.status(503).json({ status: 'not ready', database: 'disconnected' });
  }
});

healthRoutes.get('/live', (_req, res) => {
  res.json({ status: 'live' });
});

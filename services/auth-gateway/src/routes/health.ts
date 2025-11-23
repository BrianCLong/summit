/**
 * Health check routes
 */

import { Router } from 'express';

export const healthRouter = Router();

healthRouter.get('/', (req, res) => {
  res.json({ status: 'ok' });
});

healthRouter.get('/ready', (req, res) => {
  // Check if service dependencies are ready
  // For now, always return ready
  res.json({
    status: 'ready',
    checks: {
      oidc: 'ok',
      policyEnforcer: 'ok'
    }
  });
});

healthRouter.get('/live', (req, res) => {
  res.json({ status: 'alive' });
});

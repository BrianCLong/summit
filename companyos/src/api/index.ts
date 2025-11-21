/**
 * CompanyOS API Router
 * Main router for all CompanyOS operational endpoints
 */

import { Router, Request, Response } from 'express';
import { Pool } from 'pg';
import { createIncidentRoutes } from './incidentRoutes.js';
import { createDeploymentRoutes } from './deploymentRoutes.js';
import { createAlertRoutes } from './alertRoutes.js';

export function createCompanyOSRouter(db: Pool): Router {
  const router = Router();

  // Mount route modules
  router.use('/incidents', createIncidentRoutes(db));
  router.use('/deployments', createDeploymentRoutes(db));
  router.use('/alerts', createAlertRoutes(db));

  // Health check endpoint
  router.get('/health', (_req: Request, res: Response): void => {
    res.json({
      status: 'healthy',
      service: 'companyos-api',
      timestamp: new Date().toISOString(),
    });
  });

  // Dashboard summary endpoint
  router.get('/dashboard', async (_req: Request, res: Response): Promise<void> => {
    try {
      // Fetch summary data for dashboard
      const activeIncidents = await db.query(
        'SELECT * FROM maestro.active_incidents_view LIMIT 10'
      );

      const firingAlerts = await db.query(
        'SELECT * FROM maestro.alerts WHERE status = $1 ORDER BY triggered_at DESC LIMIT 10',
        ['firing']
      );

      const recentDeployments = await db.query(
        'SELECT * FROM maestro.deployments ORDER BY started_at DESC LIMIT 10'
      );

      const sloViolations = await db.query(
        'SELECT * FROM maestro.slo_violations WHERE resolved_at IS NULL ORDER BY triggered_at DESC LIMIT 10'
      );

      res.json({
        activeIncidents: activeIncidents.rows,
        firingAlerts: firingAlerts.rows,
        recentDeployments: recentDeployments.rows,
        sloViolations: sloViolations.rows,
        timestamp: new Date().toISOString(),
      });
    } catch (error) {
      console.error('Error fetching dashboard data:', error);
      res.status(500).json({ error: 'Failed to fetch dashboard data' });
    }
  });

  return router;
}

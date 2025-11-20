/**
 * Deployment API Routes
 * REST endpoints for deployment tracking
 */

import { Router } from 'express';
import { Pool } from 'pg';
import { DeploymentService } from '../services/deploymentService';
import {
  CreateDeploymentInput,
  UpdateDeploymentInput,
  DeploymentFilter,
  DeploymentEnvironment,
} from '../models/deployment';

export function createDeploymentRoutes(db: Pool): Router {
  const router = Router();
  const deploymentService = new DeploymentService(db);

  // GET /api/companyos/deployments - List deployments
  router.get('/', async (req, res) => {
    try {
      const filter: DeploymentFilter = {};
      if (req.query.serviceName) filter.serviceName = req.query.serviceName as string;
      if (req.query.environment) filter.environment = req.query.environment as DeploymentEnvironment;
      if (req.query.status) filter.status = req.query.status as any;
      if (req.query.deployedBy) filter.deployedBy = req.query.deployedBy as string;
      if (req.query.fromDate) filter.fromDate = new Date(req.query.fromDate as string);
      if (req.query.toDate) filter.toDate = new Date(req.query.toDate as string);

      const limit = parseInt(req.query.limit as string) || 25;
      const offset = parseInt(req.query.offset as string) || 0;

      const deployments = await deploymentService.listDeployments(filter, limit, offset);
      res.json({ deployments, count: deployments.length });
    } catch (error) {
      console.error('Error listing deployments:', error);
      res.status(500).json({ error: 'Failed to list deployments' });
    }
  });

  // GET /api/companyos/deployments/stats - Get deployment statistics
  router.get('/stats', async (req, res) => {
    try {
      const serviceName = req.query.serviceName as string | undefined;
      const environment = req.query.environment as DeploymentEnvironment | undefined;
      const days = parseInt(req.query.days as string) || 30;

      const stats = await deploymentService.getDeploymentStats(serviceName, environment, days);
      res.json({ stats });
    } catch (error) {
      console.error('Error fetching deployment stats:', error);
      res.status(500).json({ error: 'Failed to fetch deployment stats' });
    }
  });

  // GET /api/companyos/deployments/:id - Get deployment by ID
  router.get('/:id', async (req, res) => {
    try {
      const deployment = await deploymentService.getDeployment(req.params.id);
      if (!deployment) {
        return res.status(404).json({ error: 'Deployment not found' });
      }
      res.json({ deployment });
    } catch (error) {
      console.error('Error fetching deployment:', error);
      res.status(500).json({ error: 'Failed to fetch deployment' });
    }
  });

  // POST /api/companyos/deployments - Create deployment
  router.post('/', async (req, res) => {
    try {
      const input: CreateDeploymentInput = req.body;
      const deployment = await deploymentService.createDeployment(input);
      res.status(201).json({ deployment });
    } catch (error) {
      console.error('Error creating deployment:', error);
      res.status(500).json({ error: 'Failed to create deployment' });
    }
  });

  // PATCH /api/companyos/deployments/:id - Update deployment
  router.patch('/:id', async (req, res) => {
    try {
      const input: UpdateDeploymentInput = req.body;
      const deployment = await deploymentService.updateDeployment(req.params.id, input);
      if (!deployment) {
        return res.status(404).json({ error: 'Deployment not found' });
      }
      res.json({ deployment });
    } catch (error) {
      console.error('Error updating deployment:', error);
      res.status(500).json({ error: 'Failed to update deployment' });
    }
  });

  // POST /api/companyos/deployments/:id/succeeded - Mark deployment as succeeded
  router.post('/:id/succeeded', async (req, res) => {
    try {
      const deployment = await deploymentService.markSucceeded(req.params.id);
      if (!deployment) {
        return res.status(404).json({ error: 'Deployment not found' });
      }
      res.json({ deployment });
    } catch (error) {
      console.error('Error marking deployment as succeeded:', error);
      res.status(500).json({ error: 'Failed to mark deployment as succeeded' });
    }
  });

  // POST /api/companyos/deployments/:id/failed - Mark deployment as failed
  router.post('/:id/failed', async (req, res) => {
    try {
      const { errorMessage } = req.body;
      if (!errorMessage) {
        return res.status(400).json({ error: 'Missing errorMessage' });
      }
      const deployment = await deploymentService.markFailed(req.params.id, errorMessage);
      if (!deployment) {
        return res.status(404).json({ error: 'Deployment not found' });
      }
      res.json({ deployment });
    } catch (error) {
      console.error('Error marking deployment as failed:', error);
      res.status(500).json({ error: 'Failed to mark deployment as failed' });
    }
  });

  // POST /api/companyos/deployments/:id/rollback - Rollback deployment
  router.post('/:id/rollback', async (req, res) => {
    try {
      const rolledBackBy = req.user?.id || req.body.rolledBackBy || 'system';
      const deployment = await deploymentService.createRollback(req.params.id, rolledBackBy);
      if (!deployment) {
        return res.status(404).json({ error: 'Original deployment not found' });
      }
      res.status(201).json({ deployment });
    } catch (error) {
      console.error('Error rolling back deployment:', error);
      res.status(500).json({ error: 'Failed to rollback deployment' });
    }
  });

  return router;
}

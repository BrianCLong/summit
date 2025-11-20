/**
 * Workflow API routes
 */

import { Router, Request, Response } from 'express';

export const workflowRouter = Router();

/**
 * GET /api/v1/workflows
 * List all workflows
 */
workflowRouter.get('/', async (req: Request, res: Response) => {
  res.json({ workflows: [] });
});

/**
 * POST /api/v1/workflows
 * Create a new workflow
 */
workflowRouter.post('/', async (req: Request, res: Response) => {
  res.status(201).json({ id: 'workflow-1', ...req.body });
});

/**
 * POST /api/v1/workflows/:id/execute
 * Execute workflow
 */
workflowRouter.post('/:id/execute', async (req: Request, res: Response) => {
  res.json({ executionId: 'execution-1', status: 'running' });
});

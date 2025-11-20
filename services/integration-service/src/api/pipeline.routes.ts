/**
 * Pipeline API routes
 */

import { Router, Request, Response } from 'express';
import { PipelineController } from '../controllers/PipelineController';

export const pipelineRouter = Router();
const controller = new PipelineController();

/**
 * GET /api/v1/pipelines
 * List all pipelines
 */
pipelineRouter.get('/', async (req: Request, res: Response) => {
  try {
    const pipelines = await controller.listPipelines();
    res.json(pipelines);
  } catch (error) {
    res.status(500).json({ error: (error as Error).message });
  }
});

/**
 * POST /api/v1/pipelines
 * Create a new pipeline
 */
pipelineRouter.post('/', async (req: Request, res: Response) => {
  try {
    const pipeline = await controller.createPipeline(req.body);
    res.status(201).json(pipeline);
  } catch (error) {
    res.status(400).json({ error: (error as Error).message });
  }
});

/**
 * GET /api/v1/pipelines/:id
 * Get pipeline by ID
 */
pipelineRouter.get('/:id', async (req: Request, res: Response) => {
  try {
    const pipeline = await controller.getPipeline(req.params.id);
    if (!pipeline) {
      res.status(404).json({ error: 'Pipeline not found' });
      return;
    }
    res.json(pipeline);
  } catch (error) {
    res.status(500).json({ error: (error as Error).message });
  }
});

/**
 * PUT /api/v1/pipelines/:id
 * Update pipeline
 */
pipelineRouter.put('/:id', async (req: Request, res: Response) => {
  try {
    const pipeline = await controller.updatePipeline(req.params.id, req.body);
    res.json(pipeline);
  } catch (error) {
    res.status(400).json({ error: (error as Error).message });
  }
});

/**
 * DELETE /api/v1/pipelines/:id
 * Delete pipeline
 */
pipelineRouter.delete('/:id', async (req: Request, res: Response) => {
  try {
    await controller.deletePipeline(req.params.id);
    res.status(204).send();
  } catch (error) {
    res.status(500).json({ error: (error as Error).message });
  }
});

/**
 * POST /api/v1/pipelines/:id/execute
 * Execute pipeline
 */
pipelineRouter.post('/:id/execute', async (req: Request, res: Response) => {
  try {
    const result = await controller.executePipeline(req.params.id, req.body);
    res.json(result);
  } catch (error) {
    res.status(400).json({ error: (error as Error).message });
  }
});

/**
 * GET /api/v1/pipelines/:id/executions
 * Get pipeline execution history
 */
pipelineRouter.get('/:id/executions', async (req: Request, res: Response) => {
  try {
    const executions = await controller.getPipelineExecutions(req.params.id);
    res.json(executions);
  } catch (error) {
    res.status(500).json({ error: (error as Error).message });
  }
});

/**
 * GET /api/v1/pipelines/:id/executions/:executionId
 * Get specific execution details
 */
pipelineRouter.get('/:id/executions/:executionId', async (req: Request, res: Response) => {
  try {
    const execution = await controller.getExecution(req.params.id, req.params.executionId);
    if (!execution) {
      res.status(404).json({ error: 'Execution not found' });
      return;
    }
    res.json(execution);
  } catch (error) {
    res.status(500).json({ error: (error as Error).message });
  }
});

/**
 * POST /api/v1/pipelines/:id/validate
 * Validate pipeline configuration
 */
pipelineRouter.post('/:id/validate', async (req: Request, res: Response) => {
  try {
    const result = await controller.validatePipeline(req.params.id);
    res.json(result);
  } catch (error) {
    res.status(400).json({ error: (error as Error).message });
  }
});

import express from 'express';
import { z } from 'zod';
import { runsRepo } from './runs-repo.js';
import { ensureAuthenticated } from '../../middleware/auth.js';
import { requirePermission } from '../../middleware/rbac.js';

const router = express.Router();
router.use(express.json());
router.use(ensureAuthenticated); // Ensure all routes require authentication

const RunCreateSchema = z.object({
  pipeline_id: z.string().uuid(),
  pipeline_name: z.string().min(1).max(128),
  input_params: z.record(z.any()).optional(),
  executor_id: z.string().uuid().optional(),
});

const RunUpdateSchema = z.object({
  status: z.enum(['queued', 'running', 'succeeded', 'failed', 'cancelled']).optional(),
  started_at: z.coerce.date().optional(),
  completed_at: z.coerce.date().optional(),
  duration_ms: z.number().int().min(0).optional(),
  cost: z.number().min(0).optional(),
  output_data: z.record(z.any()).optional(),
  error_message: z.string().optional(),
});

// GET /runs - List all runs with pagination
router.get('/runs', requirePermission('run:read'), async (req, res) => {
  try {
    const limit = Math.min(parseInt(req.query.limit as string) || 50, 100);
    const offset = Math.max(parseInt(req.query.offset as string) || 0, 0);

    const items = await runsRepo.list(limit, offset);

    // Format response to match frontend expectations
    const formattedItems = items.map((run) => ({
      id: run.id,
      pipeline: run.pipeline,
      status: run.status,
      durationMs: run.duration_ms || 0,
      cost: run.cost,
    }));

    res.json({ items: formattedItems });
  } catch (error) {
    console.error('Error fetching runs:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// POST /runs - Create a new run
router.post('/runs', requirePermission('run:create'), async (req, res) => {
  try {
    const validation = RunCreateSchema.safeParse(req.body);
    if (!validation.success) {
      return res.status(400).json({
        error: 'Invalid input',
        details: validation.error.issues,
      });
    }

    const run = await runsRepo.create(validation.data);

    // Format response
    const formattedRun = {
      id: run.id,
      pipeline: run.pipeline,
      status: run.status,
      durationMs: run.duration_ms || 0,
      cost: run.cost,
    };

    res.status(201).json(formattedRun);
  } catch (error) {
    console.error('Error creating run:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// GET /runs/:id - Get a specific run
router.get('/runs/:id', requirePermission('run:read'), async (req, res) => {
  try {
    const run = await runsRepo.get(req.params.id);
    if (!run) {
      return res.status(404).json({ error: 'Run not found' });
    }

    res.json(run);
  } catch (error) {
    console.error('Error fetching run:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// PUT /runs/:id - Update a run
router.put('/runs/:id', requirePermission('run:update'), async (req, res) => {
  try {
    const validation = RunUpdateSchema.safeParse(req.body);
    if (!validation.success) {
      return res.status(400).json({
        error: 'Invalid input',
        details: validation.error.issues,
      });
    }

    // Calculate duration if both start and end times provided
    if (validation.data.started_at && validation.data.completed_at) {
      validation.data.duration_ms =
        validation.data.completed_at.getTime() - validation.data.started_at.getTime();
    }

    const run = await runsRepo.update(req.params.id, validation.data);
    if (!run) {
      return res.status(404).json({ error: 'Run not found' });
    }

    res.json(run);
  } catch (error) {
    console.error('Error updating run:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// DELETE /runs/:id - Delete a run
router.delete('/runs/:id', requirePermission('run:update'), async (req, res) => {
  try {
    const deleted = await runsRepo.delete(req.params.id);
    res.status(deleted ? 204 : 404).send();
  } catch (error) {
    console.error('Error deleting run:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// GET /pipelines/:id/runs - Get runs for a specific pipeline
router.get('/pipelines/:id/runs', requirePermission('run:read'), async (req, res) => {
  try {
    const limit = Math.min(parseInt(req.query.limit as string) || 20, 50);
    const runs = await runsRepo.getByPipeline(req.params.id, limit);

    const formattedRuns = runs.map((run) => ({
      id: run.id,
      pipeline: run.pipeline,
      status: run.status,
      durationMs: run.duration_ms || 0,
      cost: run.cost,
    }));

    res.json({ items: formattedRuns });
  } catch (error) {
    console.error('Error fetching pipeline runs:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

export default router;

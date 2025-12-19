import express from 'express';
import { z } from 'zod';
import { runsRepo } from './runs-repo.js';
import { ensureAuthenticated } from '../../middleware/auth.js';
import { authorize } from '../../middleware/authorization.js';
import {
  BudgetAdmissionController,
  createBudgetController,
} from '../../conductor/admission/budget-control.js'; // Import BudgetAdmissionController
import { RequestContext } from '../../middleware/context-binding.js'; // Import RequestContext
import Redis from 'ioredis'; // Assuming Redis is used for budget control
import { scheduler } from '../scheduler/Scheduler.js';

const router = express.Router();
router.use(express.json());
router.use(ensureAuthenticated); // Ensure all routes require authentication

// Initialize BudgetAdmissionController (assuming Redis client is available)
// In a real application, Redis client would be injected or managed globally
const redisClient = new Redis(); // This should be a proper Redis client instance
const budgetController = createBudgetController(redisClient);

const RunCreateSchema = z.object({
  pipeline_id: z.string().uuid(),
  pipeline_name: z.string().min(1).max(128),
  input_params: z.record(z.any()).optional(),
  executor_id: z.string().uuid().optional(),
});

const RunUpdateSchema = z.object({
  status: z
    .enum(['queued', 'running', 'succeeded', 'failed', 'cancelled'])
    .optional(),
  started_at: z.coerce.date().optional(),
  completed_at: z.coerce.date().optional(),
  duration_ms: z.number().int().min(0).optional(),
  cost: z.number().min(0).optional(),
  output_data: z.record(z.any()).optional(),
  error_message: z.string().optional(),
});

/**
 * @openapi
 * /maestro/runs:
 *   get:
 *     tags:
 *       - Maestro
 *     summary: List runs
 *     description: Retrieve a paginated list of Maestro workflow runs.
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           default: 50
 *         description: Number of items to return (max 100)
 *       - in: query
 *         name: offset
 *         schema:
 *           type: integer
 *           default: 0
 *         description: Offset for pagination
 *     responses:
 *       200:
 *         description: A list of runs
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 items:
 *                   type: array
 *                   items:
 *                     type: object
 *                     properties:
 *                       id:
 *                         type: string
 *                         format: uuid
 *                       pipeline:
 *                         type: string
 *                       status:
 *                         type: string
 *                         enum: [queued, running, succeeded, failed, cancelled]
 *                       durationMs:
 *                         type: integer
 *                       cost:
 *                         type: number
 *       500:
 *         description: Internal server error
 */
router.get('/runs', authorize('run_maestro'), async (req, res) => {
  try {
    const limit = Math.min(parseInt(req.query.limit as string) || 50, 100);
    const offset = Math.max(parseInt(req.query.offset as string) || 0, 0);
    const tenantId = (req.context as RequestContext).tenantId; // Get tenantId from context

    const items = await runsRepo.list(tenantId, limit, offset); // Pass tenantId

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

/**
 * @openapi
 * /maestro/runs:
 *   post:
 *     tags:
 *       - Maestro
 *     summary: Create run
 *     description: Create and start a new workflow run.
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - pipeline_id
 *               - pipeline_name
 *             properties:
 *               pipeline_id:
 *                 type: string
 *                 format: uuid
 *               pipeline_name:
 *                 type: string
 *               input_params:
 *                 type: object
 *               executor_id:
 *                 type: string
 *                 format: uuid
 *     responses:
 *       201:
 *         description: Run created successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 id:
 *                   type: string
 *                   format: uuid
 *                 pipeline:
 *                   type: string
 *                 status:
 *                   type: string
 *       400:
 *         description: Invalid input
 *       402:
 *         description: Budget exceeded
 *       500:
 *         description: Internal server error
 */
router.post('/runs', authorize('run_maestro'), async (req, res) => {
  try {
    const validation = RunCreateSchema.safeParse(req.body);
    if (!validation.success) {
      return res.status(400).json({
        error: 'Invalid input',
        details: validation.error.issues,
      });
    }

    const tenantId = (req.context as RequestContext).tenantId; // Get tenantId from context
    const estimatedCostUsd = 0.01; // Placeholder for estimated cost of a new run

    // Perform budget admission check
    const admissionDecision = await budgetController.admit(
      'LLM_LIGHT',
      estimatedCostUsd,
      {
        // Use a default expert type for admission
        tenantId: tenantId,
        userId: (req as any).user?.id, // Assuming user ID is available
      },
    );

    if (!admissionDecision.admit) {
      return res.status(402).json({
        error: 'Budget Exceeded',
        message: admissionDecision.reason,
        code: 'budget_exceeded',
        budgetRemaining: admissionDecision.budgetRemaining,
        retryAfterMs: admissionDecision.retryAfterMs,
      });
    }

    //
    // TODO: This is a placeholder for the quota service
    //
    // await quotaService.assert({
    //   tenantId,
    //   dimension: 'maestro.runs',
    //   quantity: 1,
    // });

    const run = await runsRepo.create({
      ...validation.data,
      tenant_id: tenantId,
    }); // Pass tenantId

    // Enqueue the run in the scheduler
    await scheduler.enqueueRun(run.id, tenantId);

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

/**
 * @openapi
 * /maestro/runs/{id}:
 *   get:
 *     tags:
 *       - Maestro
 *     summary: Get run details
 *     description: Retrieve details for a specific workflow run.
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *         description: The run ID
 *     responses:
 *       200:
 *         description: Run details
 *       404:
 *         description: Run not found
 *       500:
 *         description: Internal server error
 */
router.get('/runs/:id', authorize('run_maestro'), async (req, res) => {
  try {
    const tenantId = (req.context as RequestContext).tenantId; // Get tenantId from context
    // Use the explicit tenant helper
    const run = await runsRepo.getRunForTenant(req.params.id, tenantId);
    if (!run) {
      return res.status(404).json({ error: 'Run not found' });
    }

    //
    // TODO: This is a placeholder for the usage metering service
    //
    // if (run.status === 'succeeded') {
    //   await usageMeteringService.record({
    //     id: '',
    //     tenantId,
    //     dimension: 'maestro.runs',
    //     quantity: 1,
    //     unit: 'count',
    //     source: 'maestro',
    //     metadata: {
    //       pipeline_id: run.pipeline_id,
    //     },
    //     occurredAt: new Date().toISOString(),
    //     recordedAt: new Date().toISOString(),
    //   });
    // }

    res.json(run);
  } catch (error) {
    console.error('Error fetching run:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

/**
 * @openapi
 * /maestro/runs/{id}:
 *   put:
 *     tags:
 *       - Maestro
 *     summary: Update run
 *     description: Update the status or details of a run.
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *         description: The run ID
 *     requestBody:
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               status:
 *                 type: string
 *                 enum: [queued, running, succeeded, failed, cancelled]
 *               output_data:
 *                 type: object
 *               error_message:
 *                 type: string
 *     responses:
 *       200:
 *         description: Run updated
 *       404:
 *         description: Run not found
 *       500:
 *         description: Internal server error
 */
router.put('/runs/:id', authorize('run_maestro'), async (req, res) => {
  try {
    const validation = RunUpdateSchema.safeParse(req.body);
    if (!validation.success) {
      return res.status(400).json({
        error: 'Invalid input',
        details: validation.error.issues,
      });
    }

    const tenantId = (req.context as RequestContext).tenantId; // Get tenantId from context

    // Calculate duration if both start and end times provided
    if (validation.data.started_at && validation.data.completed_at) {
      validation.data.duration_ms =
        validation.data.completed_at.getTime() -
        validation.data.started_at.getTime();
    }

    const run = await runsRepo.update(req.params.id, validation.data, tenantId); // Pass tenantId
    if (!run) {
      return res.status(404).json({ error: 'Run not found' });
    }

    res.json(run);
  } catch (error) {
    console.error('Error updating run:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

/**
 * @openapi
 * /maestro/runs/{id}:
 *   delete:
 *     tags:
 *       - Maestro
 *     summary: Delete run
 *     description: Delete a specific run.
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *     responses:
 *       204:
 *         description: Run deleted
 *       404:
 *         description: Run not found
 *       500:
 *         description: Internal server error
 */
router.delete('/runs/:id', authorize('run_maestro'), async (req, res) => {
    try {
      const tenantId = (req.context as RequestContext).tenantId; // Get tenantId from context
      const deleted = await runsRepo.delete(req.params.id, tenantId); // Pass tenantId
      res.status(deleted ? 204 : 404).send();
    } catch (error) {
      console.error('Error deleting run:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  },
);

/**
 * @openapi
 * /maestro/pipelines/{id}/runs:
 *   get:
 *     tags:
 *       - Maestro
 *     summary: List pipeline runs
 *     description: Get runs associated with a specific pipeline.
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           default: 20
 *     responses:
 *       200:
 *         description: List of runs
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 items:
 *                   type: array
 *                   items:
 *                     type: object
 *                     properties:
 *                       id:
 *                         type: string
 *                       status:
 *                         type: string
 *       500:
 *         description: Internal server error
 */
router.get('/pipelines/:id/runs', authorize('run_maestro'), async (req, res) => {
    try {
      const limit = Math.min(parseInt(req.query.limit as string) || 20, 50);
      const tenantId = (req.context as RequestContext).tenantId; // Get tenantId from context
      const runs = await runsRepo.getByPipeline(req.params.id, tenantId, limit); // Pass tenantId

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
  },
);

export default router;

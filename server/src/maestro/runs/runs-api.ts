// @ts-nocheck
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
import { maestroAuthzMiddleware } from '../../middleware/maestro-authz.js';
import { recordEndpointResult } from '../../observability/reliability-metrics.js';
import { flagService } from '../../services/FlagService.js';
import { MaestroEvents } from '../../realtime/maestro.js';
import { quotaService } from '../../quota/service.js';
import {
  quotaPolicyRules,
  QuotaPolicyError,
} from '../../policies/quota.js';
import { emitQuotaDenialReceipt } from '../../services/quota/emit-quota-denial-receipt.js';

const router = express.Router();
router.use(express.json());
router.use(ensureAuthenticated); // Ensure all routes require authentication
router.use(maestroAuthzMiddleware({ resource: 'runs' }));

// Initialize BudgetAdmissionController (assuming Redis client is available)
// In a real application, Redis client would be injected or managed globally
const redisClient = new Redis(); // This should be a proper Redis client instance
const budgetController = createBudgetController(redisClient);

const emitRunStatus = async (
  tenantId: string,
  runId: string,
  status: string,
) => {
  try {
    const { getIO } = await import('../../realtime/socket.js');
    const io = typeof getIO === 'function' ? getIO() : null;
    if (io) {
      MaestroEvents.emitStatusChange(io, tenantId, runId, status);
    }
  } catch (error: any) {
    console.warn('Failed to emit maestro status update', error);
  }
};

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

// GET /runs - List all runs with pagination
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
  } catch (error: any) {
    console.error('Error fetching runs:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// POST /runs - Create a new run
router.post('/runs', authorize('run_maestro'), async (req, res) => {
  // Kill Switch Check
  if (flagService.getFlag('DISABLE_MAESTRO_RUNS')) {
      return res.status(503).json({ error: 'Maestro run creation is currently disabled due to maintenance or high load.' });
  }

  const start = process.hrtime();
  const tenantId = (req.context as RequestContext).tenantId; // Get tenantId from context
  try {
    const validation = RunCreateSchema.safeParse(req.body);
    if (!validation.success) {
      recordEndpointResult({
        endpoint: 'maestro_execution',
        statusCode: 400,
        durationSeconds: 0,
        tenantId
      });
      return res.status(400).json({
        error: 'Invalid input',
        details: validation.error.issues,
      });
    }

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

    const activeRuns = await runsRepo.countByStatus(tenantId, [
      'queued',
      'running',
    ]);
    const quotaDecision = quotaService.checkRunConcurrency(
      tenantId,
      activeRuns,
      1,
    );
    if (!quotaDecision.allowed) {
      const receipt = await emitQuotaDenialReceipt({
        tenantId,
        actorId: (req as any).user?.id || 'system',
        ruleKey: 'concurrentRuns',
        decision: quotaDecision,
        resource: 'maestro.run.create',
        metadata: { pipelineId: validation.data.pipeline_id },
      });
      const error = new QuotaPolicyError(
        'Concurrent run quota exceeded',
        quotaPolicyRules.concurrentRuns,
        quotaDecision,
      );
      error.receipt = receipt;

      return res.status(429).json({
        error: 'Quota Exceeded',
        message: error.message,
        code: quotaDecision.reason,
        limit: quotaDecision.limit,
        used: quotaDecision.used,
        remaining: quotaDecision.remaining,
        receipt,
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
    await emitRunStatus(tenantId, run.id, run.status);

    // Format response
    const formattedRun = {
      id: run.id,
      pipeline: run.pipeline,
      status: run.status,
      durationMs: run.duration_ms || 0,
      cost: run.cost,
    };

    const [seconds, nanoseconds] = process.hrtime(start);
    const duration = seconds + nanoseconds / 1e9;

    recordEndpointResult({
      endpoint: 'maestro_execution',
      statusCode: 201,
      durationSeconds: duration,
      tenantId
    });

    res.status(201).json(formattedRun);
  } catch (error: any) {
    const [seconds, nanoseconds] = process.hrtime(start);
    const duration = seconds + nanoseconds / 1e9;

    recordEndpointResult({
      endpoint: 'maestro_execution',
      statusCode: 500,
      durationSeconds: duration,
      tenantId
    });
    console.error('Error creating run:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// GET /runs/:id - Get a specific run
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
  } catch (error: any) {
    console.error('Error fetching run:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// PUT /runs/:id - Update a run
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

    if (validation.data.status) {
      await emitRunStatus(tenantId, run.id, validation.data.status);
    }

    res.json(run);
  } catch (error: any) {
    console.error('Error updating run:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// DELETE /runs/:id - Delete a run
router.delete('/runs/:id', authorize('run_maestro'), async (req, res) => {
    try {
      const tenantId = (req.context as RequestContext).tenantId; // Get tenantId from context
      const deleted = await runsRepo.delete(req.params.id, tenantId); // Pass tenantId
      res.status(deleted ? 204 : 404).send();
    } catch (error: any) {
      console.error('Error deleting run:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  },
);

// GET /pipelines/:id/runs - Get runs for a specific pipeline
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
    } catch (error: any) {
      console.error('Error fetching pipeline runs:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  },
);

export default router;

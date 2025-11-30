import { Router } from 'express';
import { maestro } from '../orchestrator/maestro.js';
import { logger } from '../utils/logger.js';
import { z } from 'zod/v4';

const router = Router();

// Schema for task submission
const taskSchema = z.object({
  kind: z.enum(['plan', 'scaffold', 'implement', 'test', 'review', 'docs']),
  repo: z.string(),
  issue: z.string(),
  budgetUSD: z.number().optional().default(10),
  context: z.record(z.any()).optional().default({}),
});

// POST /tasks - Submit a new agent task
router.post('/tasks', async (req, res) => {
  try {
    const taskData = taskSchema.parse(req.body);

    const task = {
      ...taskData,
      metadata: {
        actor: (req as any).user?.sub || 'anonymous',
        timestamp: new Date().toISOString(),
        sprint_version: 'v1.0.0', // dynamic in real app
      },
    };

    const taskId = await maestro.enqueueTask(task);

    res.status(202).json({
      taskId,
      status: 'queued',
      message: 'Agent task enqueued successfully',
    });
  } catch (error: any) {
    if (error instanceof z.ZodError) {
      res.status(400).json({ error: 'Validation failed', details: error.errors });
    } else {
      logger.error('Failed to enqueue task', { error: error.message });
      res.status(500).json({ error: error.message });
    }
  }
});

// GET /tasks/:id - Get task status
router.get('/tasks/:id', async (req, res) => {
  try {
    const status = await maestro.getTaskStatus(req.params.id);
    if (!status) {
      return res.status(404).json({ error: 'Task not found' });
    }
    res.json(status);
  } catch (error: any) {
    logger.error('Failed to get task status', { taskId: req.params.id, error: error.message });
    res.status(500).json({ error: 'Internal server error' });
  }
});

// GET /metrics - Get agent velocity metrics
router.get('/metrics', async (req, res) => {
  // Mock metrics for now - in production this would query Prometheus/Redis
  const metrics = {
    velocity: {
      daily_tasks_completed: 45,
      avg_task_duration_ms: 125000,
      success_rate: 0.94,
    },
    agents: {
      planner: { active: 2, queued: 0 },
      implementer: { active: 3, queued: 1 },
      reviewer: { active: 1, queued: 0 },
    },
    budget: {
      daily_spend: 15.40,
      limit: 100.00,
    },
    slo: {
      latency_p95: 350,
      error_rate: 0.005,
      status: 'healthy',
    },
  };

  res.json(metrics);
});

export default router;

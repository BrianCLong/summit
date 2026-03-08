"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
// @ts-nocheck
const express_1 = require("express");
const maestro_js_1 = require("../orchestrator/maestro.js");
const logger_js_1 = require("../utils/logger.js");
const zod_1 = require("zod");
const router = (0, express_1.Router)();
// Schema for task submission
const taskSchema = zod_1.z.object({
    kind: zod_1.z.enum(['plan', 'scaffold', 'implement', 'test', 'review', 'docs']),
    repo: zod_1.z.string(),
    issue: zod_1.z.string(),
    budgetUSD: zod_1.z.number().optional().default(10),
    context: zod_1.z.record(zod_1.z.any()).optional().default({}),
});
// POST /tasks - Submit a new agent task
router.post('/tasks', async (req, res) => {
    try {
        const taskData = taskSchema.parse(req.body);
        const task = {
            ...taskData,
            metadata: {
                actor: req.user?.sub || 'anonymous',
                timestamp: new Date().toISOString(),
                sprint_version: 'v1.0.0', // dynamic in real app
            },
        };
        const taskId = await maestro_js_1.maestro.enqueueTask(task);
        res.status(202).json({
            taskId,
            status: 'queued',
            message: 'Agent task enqueued successfully',
        });
    }
    catch (error) {
        if (error instanceof zod_1.z.ZodError) {
            res.status(400).json({ error: 'Validation failed', details: error.errors });
        }
        else {
            logger_js_1.logger.error('Failed to enqueue task', { error: error.message });
            res.status(500).json({ error: error.message });
        }
    }
});
// GET /tasks/:id - Get task status
router.get('/tasks/:id', async (req, res) => {
    try {
        const status = await maestro_js_1.maestro.getTaskStatus(req.params.id);
        if (!status) {
            return res.status(404).json({ error: 'Task not found' });
        }
        res.json(status);
    }
    catch (error) {
        logger_js_1.logger.error('Failed to get task status', { taskId: req.params.id, error: error.message });
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
exports.default = router;

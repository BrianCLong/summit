"use strict";
// @ts-nocheck
// Scheduler API for Cost-Aware Scheduling
// Provides endpoints for scheduling requests, budget management, and queue monitoring
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.schedulerRouter = void 0;
const express_1 = __importDefault(require("express"));
const cost_aware_scheduler_js_1 = require("./cost-aware-scheduler.js");
const prometheus_js_1 = require("../observability/prometheus.js");
exports.schedulerRouter = express_1.default.Router();
/**
 * Schedule a new task
 */
exports.schedulerRouter.post('/schedule', async (req, res) => {
    const startTime = Date.now();
    try {
        const scheduleRequest = req.body;
        // Validation
        if (!scheduleRequest.expertType ||
            !scheduleRequest.tenantId ||
            !scheduleRequest.requestId) {
            return res.status(400).json({
                success: false,
                message: 'expertType, tenantId, and requestId are required',
                processingTime: Date.now() - startTime,
            });
        }
        // Set defaults based on expert type
        const costEstimates = {
            graph_ops: 0.05,
            rag_retrieval: 0.03,
            osint_analysis: 0.08,
            export_generation: 0.01,
            file_management: 0.005,
            general_llm: 0.002,
            code_generation: 0.01,
        };
        const durationEstimates = {
            graph_ops: 45000,
            rag_retrieval: 30000,
            osint_analysis: 60000,
            export_generation: 15000,
            file_management: 10000,
            general_llm: 5000,
            code_generation: 20000,
        };
        const schedulingContext = {
            expertType: scheduleRequest.expertType,
            priority: scheduleRequest.priority || 'normal',
            estimatedCost: scheduleRequest.estimatedCost ||
                costEstimates[scheduleRequest.expertType] ||
                0.01,
            estimatedDuration: scheduleRequest.estimatedDuration ||
                durationEstimates[scheduleRequest.expertType] ||
                30000,
            tenantId: scheduleRequest.tenantId,
            requestId: scheduleRequest.requestId,
            timeout: scheduleRequest.timeout || 300000, // 5 minutes default
            metadata: scheduleRequest.metadata,
        };
        // Make scheduling decision
        const decision = await cost_aware_scheduler_js_1.costAwareScheduler.schedule(schedulingContext);
        const response = {
            success: decision.approved,
            decision,
            requestId: scheduleRequest.requestId,
            processingTime: Date.now() - startTime,
        };
        // Record metrics
        prometheus_js_1.prometheusConductorMetrics.recordOperationalEvent('scheduler_request', decision.approved);
        prometheus_js_1.prometheusConductorMetrics.recordOperationalMetric('scheduler_decision_time', response.processingTime);
        if (decision.approved) {
            prometheus_js_1.prometheusConductorMetrics.recordOperationalMetric('scheduler_estimated_wait_time', decision.estimatedWaitTime);
        }
        res.json(response);
    }
    catch (error) {
        console.error('Scheduling error:', error);
        prometheus_js_1.prometheusConductorMetrics.recordOperationalEvent('scheduler_error', { success: false });
        res.status(500).json({
            success: false,
            message: 'Scheduling failed',
            error: error instanceof Error ? error.message : 'Unknown error',
            processingTime: Date.now() - startTime,
        });
    }
});
/**
 * Get next task from queue (for workers)
 */
exports.schedulerRouter.post('/dequeue/:queueName', async (req, res) => {
    try {
        const { queueName } = req.params;
        const { workerId } = req.body;
        if (!workerId) {
            return res.status(400).json({
                success: false,
                message: 'workerId is required',
            });
        }
        const task = await cost_aware_scheduler_js_1.costAwareScheduler.getNextTask(queueName);
        if (!task) {
            return res.status(204).json({
                success: true,
                task: null,
                message: 'No tasks available',
            });
        }
        prometheus_js_1.prometheusConductorMetrics.recordOperationalEvent('scheduler_task_dequeued', { success: true });
        res.json({
            success: true,
            task,
            workerId,
            dequeuedAt: Date.now(),
        });
    }
    catch (error) {
        console.error('Dequeue error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to dequeue task',
        });
    }
});
/**
 * Mark task as completed
 */
exports.schedulerRouter.post('/complete', async (req, res) => {
    try {
        const { queueName, requestId, actualCost, processingTime, tenantId, result, } = req.body;
        if (!queueName ||
            !requestId ||
            actualCost === undefined ||
            !processingTime ||
            !tenantId) {
            return res.status(400).json({
                success: false,
                message: 'queueName, requestId, actualCost, processingTime, and tenantId are required',
            });
        }
        await cost_aware_scheduler_js_1.costAwareScheduler.completeTask(queueName, requestId, actualCost, processingTime, tenantId);
        res.json({
            success: true,
            message: 'Task completed successfully',
            requestId,
        });
    }
    catch (error) {
        console.error('Task completion error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to mark task as completed',
        });
    }
});
/**
 * Mark task as failed
 */
exports.schedulerRouter.post('/fail', async (req, res) => {
    try {
        const { queueName, requestId, error: taskError } = req.body;
        if (!queueName || !requestId || !taskError) {
            return res.status(400).json({
                success: false,
                message: 'queueName, requestId, and error are required',
            });
        }
        await cost_aware_scheduler_js_1.costAwareScheduler.failTask(queueName, requestId, taskError);
        res.json({
            success: true,
            message: 'Task marked as failed',
            requestId,
        });
    }
    catch (error) {
        console.error('Task failure error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to mark task as failed',
        });
    }
});
/**
 * Get queue metrics and system status
 */
exports.schedulerRouter.get('/metrics', async (req, res) => {
    try {
        const metrics = await cost_aware_scheduler_js_1.costAwareScheduler.getMetrics();
        res.json({
            success: true,
            metrics,
            timestamp: Date.now(),
        });
    }
    catch (error) {
        console.error('Metrics retrieval error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to retrieve metrics',
        });
    }
});
/**
 * Set budget configuration for tenant
 */
exports.schedulerRouter.post('/budget/:tenantId', async (req, res) => {
    try {
        const { tenantId } = req.params;
        const budgetConfig = req.body;
        // Validation
        if (!budgetConfig.monthlyBudgetUSD || budgetConfig.monthlyBudgetUSD <= 0) {
            return res.status(400).json({
                success: false,
                message: 'monthlyBudgetUSD must be a positive number',
            });
        }
        // Set defaults
        const config = {
            tenantId,
            monthlyBudgetUSD: budgetConfig.monthlyBudgetUSD,
            currentSpendUSD: budgetConfig.currentSpendUSD || 0,
            warningThreshold: budgetConfig.warningThreshold || 0.8,
            emergencyThreshold: budgetConfig.emergencyThreshold || 0.95,
            priorityMultipliers: budgetConfig.priorityMultipliers || {
                low: 2.0,
                normal: 1.0,
                high: 0.8,
                urgent: 0.5,
            },
        };
        await cost_aware_scheduler_js_1.costAwareScheduler.setBudget(config);
        res.json({
            success: true,
            message: 'Budget configuration updated',
            tenantId,
            config,
        });
    }
    catch (error) {
        console.error('Budget configuration error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to set budget configuration',
        });
    }
});
/**
 * Get spending report for tenant
 */
exports.schedulerRouter.get('/spending/:tenantId', async (req, res) => {
    try {
        const { tenantId } = req.params;
        const { month } = req.query;
        const report = await cost_aware_scheduler_js_1.costAwareScheduler.getSpendingReport(tenantId, month);
        res.json({
            success: true,
            tenantId,
            month: month || new Date().toISOString().slice(0, 7),
            report,
            timestamp: Date.now(),
        });
    }
    catch (error) {
        console.error('Spending report error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to generate spending report',
        });
    }
});
/**
 * Get queue status for monitoring
 */
exports.schedulerRouter.get('/queues', async (req, res) => {
    try {
        const { expertType, priority } = req.query;
        const metrics = await cost_aware_scheduler_js_1.costAwareScheduler.getMetrics();
        let queues = metrics.queues;
        // Filter by expert type if specified
        if (expertType) {
            queues = queues.filter((q) => q.queueName.includes(expertType));
        }
        // Filter by priority if specified
        if (priority) {
            queues = queues.filter((q) => q.queueName.includes(priority));
        }
        res.json({
            success: true,
            queues,
            summary: {
                totalPendingTasks: queues.reduce((sum, q) => sum + q.pending, 0),
                totalProcessingTasks: queues.reduce((sum, q) => sum + q.processing, 0),
                avgWaitTime: queues.reduce((sum, q) => sum + q.avgWaitTime, 0) / queues.length ||
                    0,
            },
            timestamp: Date.now(),
        });
    }
    catch (error) {
        console.error('Queue status error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to retrieve queue status',
        });
    }
});
/**
 * Health check for scheduler
 */
exports.schedulerRouter.get('/health', async (req, res) => {
    try {
        const metrics = await cost_aware_scheduler_js_1.costAwareScheduler.getMetrics();
        const isHealthy = metrics.totalPendingTasks < 1000; // Alert if too many pending tasks
        res.status(isHealthy ? 200 : 503).json({
            success: true,
            status: isHealthy ? 'healthy' : 'degraded',
            totalPendingTasks: metrics.totalPendingTasks,
            totalProcessingTasks: metrics.totalProcessingTasks,
            avgSystemWaitTime: metrics.avgSystemWaitTime,
            timestamp: Date.now(),
            service: 'scheduler-api',
        });
    }
    catch (error) {
        console.error('Health check error:', error);
        res.status(503).json({
            success: false,
            status: 'unhealthy',
            message: 'Scheduler health check failed',
        });
    }
});
// Request logging middleware
exports.schedulerRouter.use((req, res, next) => {
    const start = Date.now();
    res.on('finish', () => {
        const duration = Date.now() - start;
        console.log(`Scheduler API: ${req.method} ${req.path} - ${res.statusCode} (${duration}ms)`);
        prometheus_js_1.prometheusConductorMetrics.recordOperationalMetric('scheduler_api_request_duration', duration);
        prometheus_js_1.prometheusConductorMetrics.recordOperationalEvent(`scheduler_api_${req.method.toLowerCase()}`, res.statusCode < 400);
    });
    next();
});
exports.default = exports.schedulerRouter;

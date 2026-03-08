"use strict";
// @ts-nocheck
// Evaluation API for Conductor Quality Gates
// Provides endpoints for running evaluations, tracking quality trends, and CI/CD integration
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.evaluationRouter = void 0;
const express_1 = __importDefault(require("express"));
const golden_tasks_js_1 = require("./golden-tasks.js");
// QualityMetrics is calculated dynamically by evaluationEngine.calculateQualityMetrics()
const prometheus_js_1 = require("../observability/prometheus.js");
const ioredis_1 = __importDefault(require("ioredis"));
exports.evaluationRouter = express_1.default.Router();
/**
 * Run evaluation suite
 */
exports.evaluationRouter.post('/evaluate', async (req, res) => {
    const startTime = Date.now();
    const runId = `eval_${Date.now()}_${Math.random().toString(36).substring(7)}`;
    try {
        const request = req.body;
        // Get tasks to evaluate
        const allTasks = golden_tasks_js_1.evaluationEngine.getTasks();
        let tasksToRun = allTasks;
        if (request.taskIds?.length) {
            tasksToRun = allTasks.filter((task) => request.taskIds.includes(task.id));
        }
        if (request.expertTypes?.length) {
            tasksToRun = tasksToRun.filter((task) => request.expertTypes.includes(task.expertType));
        }
        if (request.tenantId) {
            // Filter tasks by tenant if specified
            tasksToRun = tasksToRun.filter((task) => !task.metadata?.tenantId ||
                task.metadata.tenantId === request.tenantId);
        }
        console.log(`Running evaluation ${runId} with ${tasksToRun.length} tasks`);
        // Run evaluation
        const results = await golden_tasks_js_1.evaluationEngine.runEvaluation(tasksToRun, {
            timeout: request.timeout,
            parallel: request.parallel ?? true,
            runId,
        });
        // Calculate quality metrics
        const metrics = golden_tasks_js_1.evaluationEngine.calculateQualityMetrics(results);
        // Check for regressions if baseline specified
        let regressions = [];
        if (request.baseline) {
            const redis = new ioredis_1.default(process.env.REDIS_URL || 'redis://localhost:6379');
            try {
                const baselineData = await redis.get(`evaluation_baseline:${request.baseline}`);
                if (baselineData) {
                    const baseline = JSON.parse(baselineData);
                    regressions = golden_tasks_js_1.evaluationEngine.detectRegressions(results, baseline.results, 0.05);
                }
            }
            catch (error) {
                console.warn('Failed to load baseline for regression detection:', error);
            }
            finally {
                redis.disconnect();
            }
        }
        // Store results for trending
        const redis = new ioredis_1.default(process.env.REDIS_URL || 'redis://localhost:6379');
        try {
            await redis.setex(`evaluation_result:${runId}`, 86400 * 7, // 7 days
            JSON.stringify({ results, metrics, timestamp: Date.now() }));
            // Add to time series for trending
            await redis.zadd('evaluation_timeline', Date.now(), JSON.stringify({ runId, metrics, timestamp: Date.now() }));
            // Keep only last 1000 evaluations
            await redis.zremrangebyrank('evaluation_timeline', 0, -1001);
        }
        catch (error) {
            console.warn('Failed to store evaluation results:', error);
        }
        finally {
            redis.disconnect();
        }
        const response = {
            success: regressions.length === 0,
            runId,
            metrics,
            results,
            processingTime: Date.now() - startTime,
            regressions: regressions.length > 0 ? regressions : undefined,
        };
        // Record metrics
        prometheus_js_1.prometheusConductorMetrics.recordOperationalMetric('evaluation_duration', response.processingTime);
        prometheus_js_1.prometheusConductorMetrics.recordOperationalMetric('evaluation_tasks_run', tasksToRun.length);
        prometheus_js_1.prometheusConductorMetrics.recordOperationalMetric('evaluation_average_score', metrics.averageScore);
        prometheus_js_1.prometheusConductorMetrics.recordOperationalMetric('evaluation_pass_rate', metrics.passRate);
        prometheus_js_1.prometheusConductorMetrics.recordOperationalEvent('evaluation_completed', response.success);
        if (regressions.length > 0) {
            prometheus_js_1.prometheusConductorMetrics.recordOperationalMetric('evaluation_regressions', regressions.length);
            prometheus_js_1.prometheusConductorMetrics.recordOperationalEvent('evaluation_regression_detected', { success: false });
        }
        res.json(response);
    }
    catch (error) {
        console.error('Evaluation error:', error);
        prometheus_js_1.prometheusConductorMetrics.recordOperationalEvent('evaluation_error', { success: false });
        res.status(500).json({
            success: false,
            message: 'Evaluation failed',
            error: error instanceof Error ? error.message : 'Unknown error',
            processingTime: Date.now() - startTime,
        });
    }
});
/**
 * Get available golden tasks
 */
exports.evaluationRouter.get('/tasks', async (req, res) => {
    try {
        const { expertType, tenantId } = req.query;
        let tasks = golden_tasks_js_1.evaluationEngine.getTasks();
        if (expertType) {
            tasks = tasks.filter((task) => task.expertType === expertType);
        }
        if (tenantId) {
            tasks = tasks.filter((task) => !task.metadata?.tenantId || task.metadata.tenantId === tenantId);
        }
        res.json({
            success: true,
            tasks: tasks.map((task) => ({
                id: task.id,
                name: task.name,
                description: task.description,
                expertType: task.expertType,
                category: task.category,
                difficulty: task.difficulty,
                timeout: task.timeout,
                metadata: task.metadata,
            })),
            total: tasks.length,
        });
    }
    catch (error) {
        console.error('Tasks listing error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to list tasks',
        });
    }
});
/**
 * Get evaluation result by run ID
 */
exports.evaluationRouter.get('/results/:runId', async (req, res) => {
    try {
        const { runId } = req.params;
        const redis = new ioredis_1.default(process.env.REDIS_URL || 'redis://localhost:6379');
        const resultData = await redis.get(`evaluation_result:${runId}`);
        redis.disconnect();
        if (!resultData) {
            return res.status(404).json({
                success: false,
                message: 'Evaluation result not found',
            });
        }
        const result = JSON.parse(resultData);
        res.json({
            success: true,
            runId,
            ...result,
        });
    }
    catch (error) {
        console.error('Result retrieval error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to retrieve evaluation result',
        });
    }
});
/**
 * Get quality trend metrics
 */
exports.evaluationRouter.get('/trends', async (req, res) => {
    try {
        const { limit = '50', expertType } = req.query;
        const redis = new ioredis_1.default(process.env.REDIS_URL || 'redis://localhost:6379');
        // Get recent evaluation timeline
        const timeline = await redis.zrevrange('evaluation_timeline', 0, parseInt(limit) - 1, 'WITHSCORES');
        redis.disconnect();
        const trends = [];
        for (let i = 0; i < timeline.length; i += 2) {
            const data = JSON.parse(timeline[i]);
            const timestamp = parseInt(timeline[i + 1]);
            // Filter by expert type if specified
            if (!expertType) {
                trends.push({
                    timestamp,
                    runId: data.runId,
                    metrics: data.metrics,
                });
            }
        }
        res.json({
            success: true,
            trends,
            total: trends.length,
        });
    }
    catch (error) {
        console.error('Trends retrieval error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to retrieve quality trends',
        });
    }
});
/**
 * Set evaluation baseline
 */
exports.evaluationRouter.post('/baseline/:baselineId', async (req, res) => {
    try {
        const { baselineId } = req.params;
        const { runId, description } = req.body;
        if (!runId) {
            return res.status(400).json({
                success: false,
                message: 'runId is required',
            });
        }
        const redis = new ioredis_1.default(process.env.REDIS_URL || 'redis://localhost:6379');
        // Get evaluation result
        const resultData = await redis.get(`evaluation_result:${runId}`);
        if (!resultData) {
            redis.disconnect();
            return res.status(404).json({
                success: false,
                message: 'Evaluation result not found',
            });
        }
        // Store as baseline
        const baseline = {
            ...JSON.parse(resultData),
            baselineId,
            description,
            createdAt: Date.now(),
        };
        await redis.set(`evaluation_baseline:${baselineId}`, JSON.stringify(baseline));
        redis.disconnect();
        res.json({
            success: true,
            message: 'Baseline set successfully',
            baselineId,
            runId,
        });
    }
    catch (error) {
        console.error('Baseline setting error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to set baseline',
        });
    }
});
/**
 * CI/CD quality gate check
 */
exports.evaluationRouter.post('/gate', async (req, res) => {
    try {
        const { minPassRate = 0.8, minAverageScore = 0.7, maxRegressionThreshold = 0.05, baseline = 'latest', taskIds, expertTypes, } = req.body;
        // Run evaluation
        const evalRequest = {
            taskIds,
            expertTypes,
            parallel: true,
            baseline,
        };
        const allTasks = golden_tasks_js_1.evaluationEngine.getTasks();
        let tasksToRun = allTasks;
        if (taskIds?.length) {
            tasksToRun = allTasks.filter((task) => taskIds.includes(task.id));
        }
        if (expertTypes?.length) {
            tasksToRun = tasksToRun.filter((task) => expertTypes.includes(task.expertType));
        }
        const results = await golden_tasks_js_1.evaluationEngine.runEvaluation(tasksToRun, {
            parallel: true,
        });
        const metrics = golden_tasks_js_1.evaluationEngine.calculateQualityMetrics(results);
        // Check quality gates
        const gates = {
            passRate: metrics.passRate >= minPassRate,
            averageScore: metrics.averageScore >= minAverageScore,
            regressions: true, // Default to passing
        };
        // Check for regressions if baseline specified
        let regressions = [];
        if (baseline) {
            const redis = new ioredis_1.default(process.env.REDIS_URL || 'redis://localhost:6379');
            try {
                const baselineData = await redis.get(`evaluation_baseline:${baseline}`);
                if (baselineData) {
                    const baselineResults = JSON.parse(baselineData);
                    regressions = golden_tasks_js_1.evaluationEngine.detectRegressions(results, baselineResults.results, maxRegressionThreshold);
                    gates.regressions = regressions.length === 0;
                }
            }
            catch (error) {
                console.warn('Baseline regression check failed:', error);
            }
            finally {
                redis.disconnect();
            }
        }
        const passed = gates.passRate && gates.averageScore && gates.regressions;
        // Record gate check
        prometheus_js_1.prometheusConductorMetrics.recordOperationalEvent('quality_gate_check', passed);
        res.json({
            success: passed,
            gates,
            metrics,
            regressions: regressions.length > 0 ? regressions : undefined,
            message: passed ? 'Quality gate passed' : 'Quality gate failed',
        });
    }
    catch (error) {
        console.error('Quality gate error:', error);
        prometheus_js_1.prometheusConductorMetrics.recordOperationalEvent('quality_gate_error', { success: false });
        res.status(500).json({
            success: false,
            message: 'Quality gate check failed',
        });
    }
});
/**
 * Health check
 */
exports.evaluationRouter.get('/health', (req, res) => {
    res.json({
        success: true,
        status: 'healthy',
        timestamp: Date.now(),
        service: 'evaluation-api',
        tasksAvailable: golden_tasks_js_1.evaluationEngine.getTasks().length,
    });
});
// Request logging middleware
exports.evaluationRouter.use((req, res, next) => {
    const start = Date.now();
    res.on('finish', () => {
        const duration = Date.now() - start;
        console.log(`Evaluation API: ${req.method} ${req.path} - ${res.statusCode} (${duration}ms)`);
        prometheus_js_1.prometheusConductorMetrics.recordOperationalMetric('evaluation_api_request_duration', duration);
        prometheus_js_1.prometheusConductorMetrics.recordOperationalEvent(`evaluation_api_${req.method.toLowerCase()}`, res.statusCode < 400);
    });
    next();
});
exports.default = exports.evaluationRouter;

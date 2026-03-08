"use strict";
/**
 * Orchestration service - manages pipeline scheduling and execution
 */
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const cors_1 = __importDefault(require("cors"));
const winston_1 = require("winston");
const PipelineScheduler_js_1 = require("./scheduler/PipelineScheduler.js");
const PipelineOrchestrator_js_1 = require("./orchestrator/PipelineOrchestrator.js");
const AirflowIntegration_js_1 = require("./airflow/AirflowIntegration.js");
const logger = (0, winston_1.createLogger)({
    level: 'info',
    format: winston_1.format.combine(winston_1.format.timestamp(), winston_1.format.json()),
    transports: [
        new winston_1.transports.Console(),
        new winston_1.transports.File({ filename: 'orchestration-error.log', level: 'error' }),
        new winston_1.transports.File({ filename: 'orchestration-combined.log' })
    ]
});
const app = (0, express_1.default)();
const port = process.env.PORT || 3010;
app.use((0, cors_1.default)());
app.use(express_1.default.json());
// Initialize services
const scheduler = new PipelineScheduler_js_1.PipelineScheduler(logger);
const orchestrator = new PipelineOrchestrator_js_1.PipelineOrchestrator(logger);
const airflowIntegration = new AirflowIntegration_js_1.AirflowIntegration(logger);
// Health check
app.get('/health', (req, res) => {
    res.json({ status: 'ok', service: 'orchestration' });
});
// Pipeline management endpoints
app.post('/api/pipelines', async (req, res) => {
    try {
        const pipeline = await orchestrator.createPipeline(req.body);
        res.status(201).json(pipeline);
    }
    catch (error) {
        logger.error('Error creating pipeline', { error });
        res.status(500).json({ error: 'Failed to create pipeline' });
    }
});
app.get('/api/pipelines', async (req, res) => {
    try {
        const pipelines = await orchestrator.listPipelines();
        res.json(pipelines);
    }
    catch (error) {
        logger.error('Error listing pipelines', { error });
        res.status(500).json({ error: 'Failed to list pipelines' });
    }
});
app.get('/api/pipelines/:id', async (req, res) => {
    try {
        const pipeline = await orchestrator.getPipeline(req.params.id);
        if (!pipeline) {
            return res.status(404).json({ error: 'Pipeline not found' });
        }
        res.json(pipeline);
    }
    catch (error) {
        logger.error('Error getting pipeline', { error });
        res.status(500).json({ error: 'Failed to get pipeline' });
    }
});
app.post('/api/pipelines/:id/execute', async (req, res) => {
    try {
        const run = await orchestrator.executePipeline(req.params.id);
        res.json(run);
    }
    catch (error) {
        logger.error('Error executing pipeline', { error });
        res.status(500).json({ error: 'Failed to execute pipeline' });
    }
});
app.get('/api/pipelines/:id/runs', async (req, res) => {
    try {
        const runs = await orchestrator.getPipelineRuns(req.params.id);
        res.json(runs);
    }
    catch (error) {
        logger.error('Error getting pipeline runs', { error });
        res.status(500).json({ error: 'Failed to get pipeline runs' });
    }
});
// Schedule management endpoints
app.post('/api/schedules', async (req, res) => {
    try {
        const schedule = await scheduler.createSchedule(req.body);
        res.status(201).json(schedule);
    }
    catch (error) {
        logger.error('Error creating schedule', { error });
        res.status(500).json({ error: 'Failed to create schedule' });
    }
});
app.get('/api/schedules', async (req, res) => {
    try {
        const schedules = await scheduler.listSchedules();
        res.json(schedules);
    }
    catch (error) {
        logger.error('Error listing schedules', { error });
        res.status(500).json({ error: 'Failed to list schedules' });
    }
});
app.delete('/api/schedules/:id', async (req, res) => {
    try {
        await scheduler.deleteSchedule(req.params.id);
        res.status(204).send();
    }
    catch (error) {
        logger.error('Error deleting schedule', { error });
        res.status(500).json({ error: 'Failed to delete schedule' });
    }
});
// Airflow integration endpoints
app.post('/api/airflow/dags/:dagId/trigger', async (req, res) => {
    try {
        const result = await airflowIntegration.triggerDAG(req.params.dagId, req.body);
        res.json(result);
    }
    catch (error) {
        logger.error('Error triggering Airflow DAG', { error });
        res.status(500).json({ error: 'Failed to trigger DAG' });
    }
});
app.get('/api/airflow/dags/:dagId/runs', async (req, res) => {
    try {
        const runs = await airflowIntegration.getDAGRuns(req.params.dagId);
        res.json(runs);
    }
    catch (error) {
        logger.error('Error getting Airflow DAG runs', { error });
        res.status(500).json({ error: 'Failed to get DAG runs' });
    }
});
// Start server
app.listen(port, () => {
    logger.info(`Orchestration service listening on port ${port}`);
    scheduler.start();
});
// Graceful shutdown
process.on('SIGTERM', async () => {
    logger.info('SIGTERM received, shutting down gracefully');
    scheduler.stop();
    process.exit(0);
});

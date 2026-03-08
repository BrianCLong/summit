"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.QueueManagerAPI = void 0;
const express_1 = __importDefault(require("express"));
const logger_js_1 = require("../utils/logger.js");
const prom_client_1 = require("prom-client");
class QueueManagerAPI {
    app;
    queueManager;
    logger;
    port;
    constructor(queueManager, port = 3010) {
        this.app = (0, express_1.default)();
        this.queueManager = queueManager;
        this.logger = new logger_js_1.Logger('QueueManagerAPI');
        this.port = port;
        this.setupMiddleware();
        this.setupRoutes();
    }
    setupMiddleware() {
        this.app.use(express_1.default.json());
        this.app.use(express_1.default.urlencoded({ extended: true }));
        // CORS
        this.app.use((req, res, next) => {
            res.header('Access-Control-Allow-Origin', '*');
            res.header('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept');
            res.header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE');
            next();
        });
        // Request logging
        this.app.use((req, res, next) => {
            this.logger.info(`${req.method} ${req.path}`);
            next();
        });
    }
    setupRoutes() {
        // Health check
        this.app.get('/health', (req, res) => {
            res.json({ status: 'ok', timestamp: new Date().toISOString() });
        });
        // Prometheus metrics
        this.app.get('/metrics', async (req, res) => {
            res.set('Content-Type', prom_client_1.register.contentType);
            res.end(await prom_client_1.register.metrics());
        });
        // Queue management endpoints
        this.app.get('/api/queues', this.getAllQueues.bind(this));
        this.app.get('/api/queues/:name', this.getQueue.bind(this));
        this.app.get('/api/queues/:name/metrics', this.getQueueMetrics.bind(this));
        this.app.post('/api/queues/:name/pause', this.pauseQueue.bind(this));
        this.app.post('/api/queues/:name/resume', this.resumeQueue.bind(this));
        this.app.post('/api/queues/:name/clean', this.cleanQueue.bind(this));
        this.app.delete('/api/queues/:name/obliterate', this.obliterateQueue.bind(this));
        // Job management endpoints
        this.app.post('/api/queues/:name/jobs', this.addJob.bind(this));
        this.app.post('/api/queues/:name/jobs/bulk', this.addBulkJobs.bind(this));
        this.app.get('/api/queues/:name/jobs/:jobId', this.getJob.bind(this));
        this.app.post('/api/queues/:name/jobs/:jobId/retry', this.retryJob.bind(this));
        this.app.delete('/api/queues/:name/jobs/:jobId', this.removeJob.bind(this));
        this.app.get('/api/dead-letter', this.listDeadLetters.bind(this));
        this.app.post('/api/dead-letter/:jobId/requeue', this.requeueDeadLetter.bind(this));
        // Workflow endpoints
        this.app.post('/api/workflows', this.executeWorkflow.bind(this));
        // Dashboard metrics endpoint
        this.app.get('/api/dashboard/metrics', this.getDashboardMetrics.bind(this));
        // Serve static dashboard UI
        this.app.use(express_1.default.static('public'));
    }
    async getAllQueues(req, res) {
        try {
            const metrics = await this.queueManager.getAllMetrics();
            res.json({ queues: metrics });
        }
        catch (error) {
            this.logger.error('Error getting all queues', error);
            res.status(500).json({ error: 'Internal server error' });
        }
    }
    async getQueue(req, res) {
        try {
            const { name } = req.params;
            const metrics = await this.queueManager.getQueueMetrics(name);
            res.json({ queue: name, ...metrics });
        }
        catch (error) {
            this.logger.error(`Error getting queue ${req.params.name}`, error);
            res.status(500).json({ error: 'Internal server error' });
        }
    }
    async getQueueMetrics(req, res) {
        try {
            const { name } = req.params;
            const metrics = await this.queueManager.getQueueMetrics(name);
            res.json(metrics);
        }
        catch (error) {
            this.logger.error(`Error getting queue metrics ${req.params.name}`, error);
            res.status(500).json({ error: 'Internal server error' });
        }
    }
    async pauseQueue(req, res) {
        try {
            const { name } = req.params;
            await this.queueManager.pauseQueue(name);
            res.json({ message: `Queue ${name} paused` });
        }
        catch (error) {
            this.logger.error(`Error pausing queue ${req.params.name}`, error);
            res.status(500).json({ error: 'Internal server error' });
        }
    }
    async resumeQueue(req, res) {
        try {
            const { name } = req.params;
            await this.queueManager.resumeQueue(name);
            res.json({ message: `Queue ${name} resumed` });
        }
        catch (error) {
            this.logger.error(`Error resuming queue ${req.params.name}`, error);
            res.status(500).json({ error: 'Internal server error' });
        }
    }
    async cleanQueue(req, res) {
        try {
            const { name } = req.params;
            const { grace, status } = req.body;
            await this.queueManager.cleanQueue(name, grace, status);
            res.json({ message: `Queue ${name} cleaned` });
        }
        catch (error) {
            this.logger.error(`Error cleaning queue ${req.params.name}`, error);
            res.status(500).json({ error: 'Internal server error' });
        }
    }
    async obliterateQueue(req, res) {
        try {
            const { name } = req.params;
            await this.queueManager.obliterateQueue(name);
            res.json({ message: `Queue ${name} obliterated` });
        }
        catch (error) {
            this.logger.error(`Error obliterating queue ${req.params.name}`, error);
            res.status(500).json({ error: 'Internal server error' });
        }
    }
    async addJob(req, res) {
        try {
            const { name } = req.params;
            const { jobName, data, options } = req.body;
            const job = await this.queueManager.addJob(name, jobName, data, options);
            res.json({ jobId: job.id, message: 'Job added successfully' });
        }
        catch (error) {
            this.logger.error(`Error adding job to queue ${req.params.name}`, error);
            res.status(500).json({ error: 'Internal server error' });
        }
    }
    async addBulkJobs(req, res) {
        try {
            const { name } = req.params;
            const { jobs } = req.body;
            const addedJobs = await this.queueManager.addBulk(name, jobs);
            res.json({
                count: addedJobs.length,
                message: `${addedJobs.length} jobs added successfully`,
            });
        }
        catch (error) {
            this.logger.error(`Error adding bulk jobs to queue ${req.params.name}`, error);
            res.status(500).json({ error: 'Internal server error' });
        }
    }
    async getJob(req, res) {
        try {
            const { name, jobId } = req.params;
            const job = await this.queueManager.getJob(name, jobId);
            if (!job) {
                res.status(404).json({ error: 'Job not found' });
                return;
            }
            res.json({
                id: job.id,
                name: job.name,
                data: job.data,
                opts: job.opts,
                progress: job.progress,
                attemptsMade: job.attemptsMade,
                processedOn: job.processedOn,
                finishedOn: job.finishedOn,
            });
        }
        catch (error) {
            this.logger.error(`Error getting job ${req.params.jobId}`, error);
            res.status(500).json({ error: 'Internal server error' });
        }
    }
    async retryJob(req, res) {
        try {
            const { name, jobId } = req.params;
            await this.queueManager.retryJob(name, jobId);
            res.json({ message: `Job ${jobId} retried` });
        }
        catch (error) {
            this.logger.error(`Error retrying job ${req.params.jobId}`, error);
            res.status(500).json({ error: 'Internal server error' });
        }
    }
    async removeJob(req, res) {
        try {
            const { name, jobId } = req.params;
            await this.queueManager.removeJob(name, jobId);
            res.json({ message: `Job ${jobId} removed` });
        }
        catch (error) {
            this.logger.error(`Error removing job ${req.params.jobId}`, error);
            res.status(500).json({ error: 'Internal server error' });
        }
    }
    async executeWorkflow(req, res) {
        try {
            const workflow = req.body;
            await this.queueManager.executeWorkflow(workflow);
            res.json({ message: `Workflow ${workflow.name} started` });
        }
        catch (error) {
            this.logger.error('Error executing workflow', error);
            res.status(500).json({ error: 'Internal server error' });
        }
    }
    async getDashboardMetrics(req, res) {
        try {
            const metrics = await this.queueManager.getAllMetrics();
            res.json({
                timestamp: new Date().toISOString(),
                queues: metrics,
            });
        }
        catch (error) {
            this.logger.error('Error getting dashboard metrics', error);
            res.status(500).json({ error: 'Internal server error' });
        }
    }
    async listDeadLetters(req, res) {
        try {
            const { query, start, end } = req.query;
            const jobs = await this.queueManager.listDeadLetterJobs(query, start ? parseInt(start, 10) : 0, end ? parseInt(end, 10) : 100);
            res.json({ jobs });
        }
        catch (error) {
            this.logger.error('Error listing dead-letter jobs', error);
            res.status(500).json({ error: 'Internal server error' });
        }
    }
    async requeueDeadLetter(req, res) {
        try {
            const { jobId } = req.params;
            const job = await this.queueManager.requeueFromDeadLetter(jobId);
            res.json({
                message: `Job ${jobId} requeued to ${job.queueName}`,
                jobId: job.id,
                queue: job.queueName,
            });
        }
        catch (error) {
            this.logger.error(`Error requeuing dead-letter job ${req.params.jobId}`, error);
            res.status(500).json({ error: 'Internal server error' });
        }
    }
    start() {
        this.app.listen(this.port, () => {
            this.logger.info(`Queue Manager API listening on port ${this.port}`);
            this.logger.info(`Dashboard: http://localhost:${this.port}`);
            this.logger.info(`Metrics: http://localhost:${this.port}/metrics`);
        });
    }
}
exports.QueueManagerAPI = QueueManagerAPI;

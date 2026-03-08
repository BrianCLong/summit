"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.QueueService = void 0;
const bullmq_1 = require("bullmq");
const PipelineOrchestrator_js_1 = require("./PipelineOrchestrator.js");
const pino_1 = __importDefault(require("pino"));
const logger = pino_1.default({ name: 'IngestionQueue' });
const REDIS_HOST = process.env.REDIS_HOST || 'localhost';
const REDIS_PORT = parseInt(process.env.REDIS_PORT || '6379');
class QueueService {
    queue;
    worker;
    orchestrator;
    constructor() {
        this.orchestrator = new PipelineOrchestrator_js_1.PipelineOrchestrator();
        const connection = {
            host: REDIS_HOST,
            port: REDIS_PORT,
        };
        this.queue = new bullmq_1.Queue('ingestion-pipeline', { connection });
        this.worker = new bullmq_1.Worker('ingestion-pipeline', async (job) => {
            const config = job.data;
            logger.info({ jobId: job.id, pipeline: config.key }, 'Processing ingestion job');
            await job.updateProgress(10); // Started
            try {
                await this.orchestrator.runPipeline(config);
                await job.updateProgress(100); // Completed
                return { status: 'completed', pipeline: config.key };
            }
            catch (e) {
                logger.error({ jobId: job.id, error: e }, 'Job failed');
                throw e;
            }
        }, { connection, concurrency: 5 }); // Process 5 jobs concurrently
        this.worker.on('completed', (job) => {
            logger.info({ jobId: job.id }, 'Job completed');
        });
        this.worker.on('failed', (job, err) => {
            logger.error({ jobId: job?.id, error: err }, 'Job failed');
        });
    }
    async enqueueIngestion(config) {
        const job = await this.queue.add('ingest', config, {
            removeOnComplete: true,
            removeOnFail: false // Keep failed jobs for inspection
        });
        return job.id;
    }
    async getJobStatus(jobId) {
        const job = await this.queue.getJob(jobId);
        if (!job)
            return null;
        return {
            id: job.id,
            state: await job.getState(),
            progress: job.progress,
            result: job.returnvalue,
            failedReason: job.failedReason,
            timestamp: job.timestamp
        };
    }
    async close() {
        await this.queue.close();
        await this.worker.close();
    }
}
exports.QueueService = QueueService;

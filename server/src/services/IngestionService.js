"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.ingestionService = exports.IngestionService = void 0;
const bullmq_1 = require("bullmq");
const database_js_1 = require("../config/database.js");
const logger_js_1 = __importDefault(require("../utils/logger.js"));
const ingestionProcessor_js_1 = require("../jobs/processors/ingestionProcessor.js");
class IngestionService {
    queue = null;
    worker = null;
    queueEvents = null;
    constructor() {
        this.initialize();
    }
    initialize() {
        const connection = (0, database_js_1.getRedisClient)();
        if (!connection) {
            logger_js_1.default.warn('Redis not available, IngestionService disabled');
            return;
        }
        this.queue = new bullmq_1.Queue('evidence-ingestion', { connection });
        this.queueEvents = new bullmq_1.QueueEvents('evidence-ingestion', { connection });
        this.worker = new bullmq_1.Worker('evidence-ingestion', ingestionProcessor_js_1.ingestionProcessor, {
            connection,
            concurrency: 5
        });
        this.worker.on('completed', (job) => {
            logger_js_1.default.info({ jobId: job.id }, 'Ingestion job completed');
        });
        this.worker.on('failed', (job, err) => {
            logger_js_1.default.error({ jobId: job?.id, error: err }, 'Ingestion job failed');
        });
        logger_js_1.default.info('IngestionService initialized');
    }
    async addJob(file) {
        if (!this.queue) {
            // Try to re-init if redis wasn't ready
            this.initialize();
            if (!this.queue)
                throw new Error('Ingestion queue not initialized');
        }
        await this.queue.add('ingest-file', file, {
            attempts: 3,
            backoff: {
                type: 'exponential',
                delay: 1000,
            }
        });
    }
}
exports.IngestionService = IngestionService;
exports.ingestionService = new IngestionService();

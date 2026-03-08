"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.workerManager = exports.WorkerManager = void 0;
// @ts-nocheck
const bullmq_1 = require("bullmq");
const config_js_1 = require("../config.js");
const pino_1 = __importDefault(require("pino"));
const logger = pino_1.default({ name: 'worker-manager' });
const connection = {
    host: config_js_1.cfg.REDIS_HOST,
    port: config_js_1.cfg.REDIS_PORT,
    password: config_js_1.cfg.REDIS_PASSWORD || undefined,
    username: config_js_1.cfg.REDIS_USERNAME,
    tls: config_js_1.cfg.REDIS_TLS ? {} : undefined,
};
class WorkerManager {
    static instance;
    workers = new Map();
    constructor() { }
    static getInstance() {
        if (!WorkerManager.instance) {
            WorkerManager.instance = new WorkerManager();
        }
        return WorkerManager.instance;
    }
    registerWorker(queueName, processor, options = {}) {
        if (this.workers.has(queueName)) {
            logger.warn(`Worker for queue ${queueName} already registered`);
            return;
        }
        const worker = new bullmq_1.Worker(queueName, processor, {
            connection,
            concurrency: options.concurrency || 1,
            ...options,
        });
        worker.on('completed', (job) => {
            logger.info(`Worker ${queueName} completed job ${job.id}`);
        });
        worker.on('failed', (job, err) => {
            logger.error(`Worker ${queueName} failed job ${job?.id}: ${err.message}`);
        });
        this.workers.set(queueName, worker);
    }
    async close() {
        for (const worker of this.workers.values()) {
            await worker.close();
        }
    }
}
exports.WorkerManager = WorkerManager;
exports.workerManager = WorkerManager.getInstance();

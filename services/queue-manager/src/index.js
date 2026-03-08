"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __exportStar = (this && this.__exportStar) || function(m, exports) {
    for (var p in m) if (p !== "default" && !Object.prototype.hasOwnProperty.call(exports, p)) __createBinding(exports, m, p);
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.JobPriority = exports.QueueManagerAPI = exports.QueueManager = void 0;
// @ts-nocheck
const QueueManager_js_1 = require("./core/QueueManager.js");
Object.defineProperty(exports, "QueueManager", { enumerable: true, get: function () { return QueueManager_js_1.QueueManager; } });
const server_js_1 = require("./api/server.js");
Object.defineProperty(exports, "QueueManagerAPI", { enumerable: true, get: function () { return server_js_1.QueueManagerAPI; } });
const logger_js_1 = require("./utils/logger.js");
const index_js_1 = require("./types/index.js");
Object.defineProperty(exports, "JobPriority", { enumerable: true, get: function () { return index_js_1.JobPriority; } });
const logger = new logger_js_1.Logger('Main');
// Example job processors
async function emailProcessor(job) {
    logger.info(`Processing email job ${job.id}`, job.data);
    // Simulate email sending
    await new Promise((resolve) => setTimeout(resolve, 1000));
    return { sent: true, timestamp: new Date() };
}
async function webhookProcessor(job) {
    logger.info(`Processing webhook job ${job.id}`, job.data);
    // Simulate webhook delivery
    await new Promise((resolve) => setTimeout(resolve, 500));
    return { delivered: true, timestamp: new Date() };
}
async function dataProcessor(job) {
    logger.info(`Processing data job ${job.id}`, job.data);
    // Simulate data processing
    await new Promise((resolve) => setTimeout(resolve, 2000));
    return { processed: true, records: job.data.records || 0 };
}
async function aiInferenceProcessor(job) {
    logger.info(`Processing AI inference job ${job.id}`, job.data);
    // Simulate AI inference
    await new Promise((resolve) => setTimeout(resolve, 3000));
    return { prediction: Math.random(), confidence: 0.95 };
}
async function main() {
    logger.info('Starting Queue Manager...');
    // Initialize queue manager
    const queueManager = new QueueManager_js_1.QueueManager();
    // Register queues with rate limits
    queueManager.registerQueue('email-notifications', {
        rateLimit: { max: 100, duration: 60000 },
    });
    queueManager.registerQueue('webhook-delivery', {
        rateLimit: { max: 50, duration: 60000 },
    });
    queueManager.registerQueue('data-processing');
    queueManager.registerQueue('ai-inference', {
        rateLimit: { max: 20, duration: 60000 },
    });
    // Register processors
    queueManager.registerProcessor('email-notifications', emailProcessor);
    queueManager.registerProcessor('webhook-delivery', webhookProcessor);
    queueManager.registerProcessor('data-processing', dataProcessor);
    queueManager.registerProcessor('ai-inference', aiInferenceProcessor);
    // Start workers
    await queueManager.startWorkers();
    // Start API server
    const api = new server_js_1.QueueManagerAPI(queueManager, 3010);
    api.start();
    // Handle graceful shutdown
    process.on('SIGTERM', async () => {
        logger.info('SIGTERM received, shutting down gracefully...');
        await queueManager.shutdown();
        process.exit(0);
    });
    process.on('SIGINT', async () => {
        logger.info('SIGINT received, shutting down gracefully...');
        await queueManager.shutdown();
        process.exit(0);
    });
    logger.info('Queue Manager is ready!');
    logger.info('Dashboard: http://localhost:3010');
    logger.info('API: http://localhost:3010/api');
    logger.info('Metrics: http://localhost:3010/metrics');
}
main().catch((error) => {
    logger.error('Fatal error', error);
    process.exit(1);
});
__exportStar(require("./types/index.js"), exports);
__exportStar(require("./core/errors.js"), exports);
// Export distributed queue components
__exportStar(require("./distributed/index.js"), exports);
__exportStar(require("./notifications/index.js"), exports);
__exportStar(require("./orchestration/index.js"), exports);
__exportStar(require("./e2e/index.js"), exports);

"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.jobManager = void 0;
const queue_factory_js_1 = require("../queue/queue.factory.js");
const job_definitions_js_1 = require("./job.definitions.js");
const ingestion_processor_js_1 = require("./processors/ingestion.processor.js");
const report_processor_js_1 = require("./processors/report.processor.js");
const analytics_processor_js_1 = require("./processors/analytics.processor.js");
const notification_processor_js_1 = require("./processors/notification.processor.js");
const webhook_processor_js_1 = require("./processors/webhook.processor.js");
const intent_processor_js_1 = require("./processors/intent.processor.js");
const logger_js_1 = __importDefault(require("../utils/logger.js"));
class JobManager {
    queues = {};
    workers = {};
    constructor() {
        this.initializeQueues();
        this.initializeWorkers();
    }
    initializeQueues() {
        this.queues[job_definitions_js_1.QueueNames.INGESTION] = queue_factory_js_1.QueueFactory.createQueue(job_definitions_js_1.QueueNames.INGESTION);
        this.queues[job_definitions_js_1.QueueNames.REPORTS] = queue_factory_js_1.QueueFactory.createQueue(job_definitions_js_1.QueueNames.REPORTS);
        this.queues[job_definitions_js_1.QueueNames.ANALYTICS] = queue_factory_js_1.QueueFactory.createQueue(job_definitions_js_1.QueueNames.ANALYTICS);
        this.queues[job_definitions_js_1.QueueNames.NOTIFICATIONS] = queue_factory_js_1.QueueFactory.createQueue(job_definitions_js_1.QueueNames.NOTIFICATIONS);
        this.queues[job_definitions_js_1.QueueNames.WEBHOOKS] = queue_factory_js_1.QueueFactory.createQueue(job_definitions_js_1.QueueNames.WEBHOOKS);
        this.queues[job_definitions_js_1.QueueNames.INTENTS] = queue_factory_js_1.QueueFactory.createQueue(job_definitions_js_1.QueueNames.INTENTS);
    }
    initializeWorkers() {
        // Workers with concurrency and scaling settings
        this.workers[job_definitions_js_1.QueueNames.INGESTION] = queue_factory_js_1.QueueFactory.createWorker(job_definitions_js_1.QueueNames.INGESTION, ingestion_processor_js_1.ingestionProcessor, { concurrency: 5 });
        this.workers[job_definitions_js_1.QueueNames.REPORTS] = queue_factory_js_1.QueueFactory.createWorker(job_definitions_js_1.QueueNames.REPORTS, report_processor_js_1.reportProcessor, { concurrency: 2 });
        this.workers[job_definitions_js_1.QueueNames.ANALYTICS] = queue_factory_js_1.QueueFactory.createWorker(job_definitions_js_1.QueueNames.ANALYTICS, analytics_processor_js_1.analyticsProcessor, { concurrency: 2 });
        this.workers[job_definitions_js_1.QueueNames.NOTIFICATIONS] = queue_factory_js_1.QueueFactory.createWorker(job_definitions_js_1.QueueNames.NOTIFICATIONS, notification_processor_js_1.notificationProcessor, { concurrency: 10 });
        this.workers[job_definitions_js_1.QueueNames.WEBHOOKS] = queue_factory_js_1.QueueFactory.createWorker(job_definitions_js_1.QueueNames.WEBHOOKS, webhook_processor_js_1.webhookProcessor, { concurrency: 5 });
        this.workers[job_definitions_js_1.QueueNames.INTENTS] = queue_factory_js_1.QueueFactory.createWorker(job_definitions_js_1.QueueNames.INTENTS, intent_processor_js_1.intentProcessor, { concurrency: 5 });
        logger_js_1.default.info('Job Workers Initialized');
    }
    getQueue(name) {
        return this.queues[name];
    }
    getAllQueues() {
        return Object.values(this.queues);
    }
    async close() {
        await Promise.all(Object.values(this.queues).map(q => q.close()));
        await Promise.all(Object.values(this.workers).map(w => w.close()));
    }
}
exports.jobManager = new JobManager();

"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.startConsistencyWorker = exports.scheduleConsistencyCheck = void 0;
// @ts-nocheck
const bullmq_1 = require("bullmq");
const config_js_1 = require("../config.js");
const database_js_1 = require("../config/database.js");
const GraphConsistencyService_js_1 = require("../services/consistency/GraphConsistencyService.js");
const ConsistencyStore_js_1 = require("../services/consistency/ConsistencyStore.js");
const logger_js_1 = __importDefault(require("../config/logger.js"));
const consistencyLogger = logger_js_1.default.child({ name: 'consistencyWorker' });
const QUEUE_NAME = 'consistency-check';
// Instantiate the Queue for scheduling
const consistencyQueue = new bullmq_1.Queue(QUEUE_NAME, {
    connection: {
        host: config_js_1.cfg.REDIS_HOST,
        port: config_js_1.cfg.REDIS_PORT,
        password: config_js_1.cfg.REDIS_PASSWORD,
        tls: config_js_1.cfg.REDIS_TLS ? {} : undefined,
    },
});
const scheduleConsistencyCheck = async () => {
    // Schedule the job to run every hour
    await consistencyQueue.add('check', { autoRepair: true }, {
        repeat: {
            pattern: '0 * * * *', // Every hour
        },
        jobId: 'hourly-consistency-check' // Ensures singleton
    });
    consistencyLogger.info('Scheduled hourly consistency check');
};
exports.scheduleConsistencyCheck = scheduleConsistencyCheck;
const startConsistencyWorker = () => {
    const worker = new bullmq_1.Worker(QUEUE_NAME, async (job) => {
        consistencyLogger.info('Starting scheduled consistency check');
        const pg = (0, database_js_1.getPostgresPool)();
        const neo4j = (0, database_js_1.getNeo4jDriver)();
        const service = new GraphConsistencyService_js_1.GraphConsistencyService(pg, neo4j);
        const store = new ConsistencyStore_js_1.ConsistencyStore();
        try {
            const reports = await service.runGlobalCheck();
            // Save reports to Redis for the API to consume
            await store.saveReports(reports);
            // Auto-repair if configured
            if (job.data.autoRepair) {
                let repairedCount = 0;
                for (const report of reports) {
                    if (report.status === 'drifted') {
                        consistencyLogger.info({ investigationId: report.investigationId }, 'Auto-repairing drift');
                        await service.repairInvestigation(report.investigationId, report.tenantId, report);
                        repairedCount++;
                    }
                }
                if (repairedCount > 0) {
                    // Refresh reports after repair
                    const newReports = await service.runGlobalCheck();
                    await store.saveReports(newReports);
                }
            }
            return { checked: reports.length, drifted: reports.filter(r => r.status === 'drifted').length };
        }
        catch (err) {
            consistencyLogger.error(err, 'Consistency check failed');
            throw err;
        }
    }, {
        connection: {
            host: config_js_1.cfg.REDIS_HOST,
            port: config_js_1.cfg.REDIS_PORT,
            password: config_js_1.cfg.REDIS_PASSWORD,
            tls: config_js_1.cfg.REDIS_TLS ? {} : undefined,
        },
    });
    worker.on('completed', (job) => {
        consistencyLogger.info({ jobId: job.id, returnvalue: job.returnvalue }, 'Consistency check completed');
    });
    worker.on('failed', (job, err) => {
        consistencyLogger.error({ jobId: job?.id, err }, 'Consistency check failed');
    });
    return worker;
};
exports.startConsistencyWorker = startConsistencyWorker;

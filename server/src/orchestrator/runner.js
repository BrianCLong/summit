"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.startOrchestratorWorkers = startOrchestratorWorkers;
exports.stopOrchestratorWorkers = stopOrchestratorWorkers;
const os_1 = __importDefault(require("os"));
const PostgresStore_js_1 = require("./PostgresStore.js");
const maestro_worker_js_1 = require("./maestro-worker.js");
const retention_worker_js_1 = require("./retention-worker.js");
const PartitionManager_js_1 = require("./PartitionManager.js");
const logger_js_1 = __importDefault(require("../config/logger.js"));
const postgres_js_1 = require("../db/postgres.js");
let maestroWorker = null;
let retentionWorker = null;
let partitionManager = null;
async function startOrchestratorWorkers() {
    try {
        const pool = (0, postgres_js_1.getPostgresPool)();
        const store = new PostgresStore_js_1.PostgresStore(pool.pool);
        partitionManager = new PartitionManager_js_1.PartitionManager(pool.pool);
        // 1. Ensure Partitions exist
        await partitionManager.ensurePartitions();
        const workerId = `worker-${os_1.default.hostname()}-${process.pid}`;
        // 2. Start Maestro Worker
        maestroWorker = new maestro_worker_js_1.MaestroWorker(store, {
            workerId,
            concurrency: 5,
            pollIntervalMs: 5000,
            leaseDurationMs: 60000,
            heartbeatIntervalMs: 25000,
            batchSize: 5
        });
        maestroWorker.start().catch(err => logger_js_1.default.error({ err }, 'Maestro worker crash'));
        // 3. Start Retention Worker
        retentionWorker = new retention_worker_js_1.OrchestratorRetentionWorker(store);
        retentionWorker.start().catch(err => logger_js_1.default.error({ err }, 'Retention worker crash'));
        logger_js_1.default.info('Orchestrator workers initialized with PartitionManager');
    }
    catch (error) {
        logger_js_1.default.error({ err: error }, 'Failed to start orchestrator workers');
    }
}
async function stopOrchestratorWorkers() {
    if (maestroWorker)
        await maestroWorker.stop();
    if (retentionWorker)
        await retentionWorker.stop();
}

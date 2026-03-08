"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.runPartitionMaintenance = runPartitionMaintenance;
exports.startPartitionWorker = startPartitionWorker;
exports.stopPartitionWorker = stopPartitionWorker;
const partitioning_js_1 = require("../db/partitioning.js");
const logger_js_1 = require("../config/logger.js");
let timer = null;
async function runPartitionMaintenance() {
    logger_js_1.logger.info('Running partition maintenance...');
    try {
        // Default tables for time-series partitioning
        const tables = ['audit_logs', 'metrics', 'risk_signals', 'evidence_bundles'];
        await partitioning_js_1.partitionManager.maintainPartitions(tables);
        // Check for old partitions to detach (e.g. older than 12 months)
        // We use a safe default of 12 months, or env var
        const retentionMonths = Number(process.env.PARTITION_RETENTION_MONTHS || 12);
        await partitioning_js_1.partitionManager.detachOldPartitions(tables, retentionMonths);
        logger_js_1.logger.info('Partition maintenance completed.');
    }
    catch (error) {
        logger_js_1.logger.error({ error }, 'Partition maintenance failed');
    }
}
function startPartitionWorker() {
    if (process.env.ENABLE_PARTITION_WORKER !== 'true') {
        logger_js_1.logger.info('Partition worker disabled via env flag.');
        return;
    }
    // Run once on startup
    runPartitionMaintenance().catch(err => logger_js_1.logger.error({ err }, 'Initial partition maintenance failed'));
    // Schedule periodic run (every 24h)
    const intervalMs = 24 * 60 * 60 * 1000;
    timer = setInterval(() => {
        runPartitionMaintenance().catch(err => logger_js_1.logger.error({ err }, 'Scheduled partition maintenance failed'));
    }, intervalMs);
    logger_js_1.logger.info('Partition worker started.');
}
function stopPartitionWorker() {
    if (timer) {
        clearInterval(timer);
        timer = null;
    }
}

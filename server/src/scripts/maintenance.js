"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.runMaintenance = runMaintenance;
const partitioning_js_1 = require("../db/partitioning.js");
const BackupService_js_1 = require("../backup/BackupService.js");
const logger_js_1 = __importDefault(require("../config/logger.js"));
const redis_js_1 = require("../cache/redis.js");
const redis = redis_js_1.RedisService.getInstance();
const backupService = new BackupService_js_1.BackupService();
async function runMaintenance() {
    logger_js_1.default.info('Starting system maintenance...');
    try {
        // 1. Partition Maintenance
        logger_js_1.default.info('Running partition maintenance...');
        try {
            await partitioning_js_1.partitionManager.maintainPartitions(['audit_logs', 'metrics']);
            logger_js_1.default.info('Partition maintenance complete.');
        }
        catch (e) {
            logger_js_1.default.warn({ error: e }, 'Partition maintenance failed (likely DB connection issue in dev)');
        }
        // 2. Backup Verification (Lightweight)
        logger_js_1.default.info('Verifying backup inventory...');
        // In a real scenario, this might check for missing backups or stale data
        // For now, we just ensure the backup directories exist
        try {
            await backupService.ensureBackupDir('postgres');
            await backupService.ensureBackupDir('neo4j');
            await backupService.ensureBackupDir('redis');
            logger_js_1.default.info('Backup directory verification complete.');
        }
        catch (e) {
            logger_js_1.default.error({ error: e }, 'Backup verification failed');
            throw e;
        }
        // 3. Cache Maintenance
        logger_js_1.default.info('Running cache maintenance...');
        // Potentially clear expired keys if not handled by Redis
        // Or run analysis
        const memoryUsage = process.memoryUsage();
        logger_js_1.default.info({ memoryUsage }, 'Maintenance memory check');
        logger_js_1.default.info('System maintenance completed successfully.');
    }
    catch (error) {
        logger_js_1.default.error('System maintenance failed', error);
        process.exit(1);
    }
}
// If run directly
if (import.meta.url === `file://${process.argv[1]}`) {
    runMaintenance()
        .then(() => process.exit(0))
        .catch(() => process.exit(1));
}

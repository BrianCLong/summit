"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.partitionMaintenanceService = exports.PartitionMaintenanceService = void 0;
const cron_1 = require("cron");
const postgres_js_1 = require("../db/postgres.js");
const logger_js_1 = require("../config/logger.js");
const PartitionManager_js_1 = require("../orchestrator/PartitionManager.js");
const logger = logger_js_1.logger.child({ service: 'PartitionMaintenanceService' });
const TABLES_CONFIG = {
    'provenance_ledger_v2': {}, // Default suffix _yYYYYmMM
    'audit_logs': {}, // Default suffix
    'orchestrator_events_p': { stripSuffix: '_p', suffixFormat: '_YYYY_MM' },
    'orchestrator_outbox_p': { stripSuffix: '_p', suffixFormat: '_YYYY_MM' }
};
class PartitionMaintenanceService {
    job;
    constructor() {
        // Run daily at 2 AM
        this.job = new cron_1.CronJob('0 2 * * *', () => {
            this.maintainPartitions().catch((err) => {
                logger.error({ err }, 'Partition maintenance job failed');
            });
        });
    }
    start() {
        this.job.start();
        logger.info('PartitionMaintenanceService started');
        // Run once on startup to ensure coverage
        this.maintainPartitions().catch((err) => {
            logger.error({ err }, 'Initial partition maintenance failed');
        });
    }
    stop() {
        this.job.stop();
    }
    async maintainPartitions() {
        logger.info('Starting partition maintenance');
        const managedPool = (0, postgres_js_1.getPostgresPool)();
        // Use the underlying write pool for DDL operations
        const partitionManager = new PartitionManager_js_1.PartitionManager(managedPool.pool);
        // Outbox Events (using DB function - keeping legacy support)
        try {
            await managedPool.write('SELECT ensure_outbox_partition($1, $2)', [2, 6]);
            logger.info({ tableName: 'outbox_events' }, 'Partition maintenance successful (DB function)');
        }
        catch (error) {
            logger.error({ tableName: 'outbox_events', error }, 'Failed to maintain partitions for table (DB function)');
        }
        // Generic Partition Management
        const now = new Date();
        const nextMonth = new Date(now.getFullYear(), now.getMonth() + 1, 1);
        const monthAfterNext = new Date(now.getFullYear(), now.getMonth() + 2, 1);
        for (const [tableName, options] of Object.entries(TABLES_CONFIG)) {
            try {
                // Ensure next month
                await partitionManager.ensureMonthlyPartition(tableName, nextMonth, options);
                // Ensure month after next (buffer)
                await partitionManager.ensureMonthlyPartition(tableName, monthAfterNext, options);
                logger.info({ tableName }, 'Partition maintenance successful');
            }
            catch (error) {
                logger.error({ tableName, error }, 'Failed to maintain partitions for table');
            }
        }
    }
}
exports.PartitionMaintenanceService = PartitionMaintenanceService;
exports.partitionMaintenanceService = new PartitionMaintenanceService();

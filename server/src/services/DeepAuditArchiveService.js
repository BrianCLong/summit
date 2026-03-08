"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.deepAuditArchiveService = exports.DeepAuditArchiveService = void 0;
const logger_js_1 = require("../config/logger.js");
const ColdStorageService_js_1 = require("./ColdStorageService.js");
const postgres_js_1 = require("../db/postgres.js");
/**
 * Service for managing deep cold-archive of audit logs (Cost Optimization Task #100).
 * Moves historical audit logs to lowest-cost storage tier.
 */
class DeepAuditArchiveService {
    static instance;
    AUDIT_TABLE = 'audit_logs';
    DEEP_ARCHIVE_RETENTION_MONTHS = 12;
    constructor() { }
    static getInstance() {
        if (!DeepAuditArchiveService.instance) {
            DeepAuditArchiveService.instance = new DeepAuditArchiveService();
        }
        return DeepAuditArchiveService.instance;
    }
    /**
     * Identifies and archives audit partitions older than 12 months.
     */
    async runDeepArchive() {
        logger_js_1.logger.info('DeepAuditArchive: Starting deep archive job');
        const pool = (0, postgres_js_1.getPostgresPool)();
        const cutoff = new Date();
        cutoff.setMonth(cutoff.getMonth() - this.DEEP_ARCHIVE_RETENTION_MONTHS);
        try {
            // Find audit log partitions
            const result = await pool.query('SELECT inhrelid::regclass::text AS partition_name FROM pg_inherits WHERE inhparent = $1::regclass', [this.AUDIT_TABLE]);
            for (const row of result.rows || []) {
                const partitionName = row.partition_name;
                const match = partitionName.match(/_y(\d{4})m(\d{2})$/);
                if (!match)
                    continue;
                const year = Number(match[1]);
                const month = Number(match[2]);
                const partitionDate = new Date(year, month - 1, 1);
                if (partitionDate <= cutoff) {
                    logger_js_1.logger.info({ partitionName }, 'DeepAuditArchive: Archiving partition to DEEP_ARCHIVE');
                    // 1. Detach partition
                    await pool.query(`ALTER TABLE ${this.AUDIT_TABLE} DETACH PARTITION ${partitionName}`);
                    // 2. Archive to S3 Glacier Deep Archive
                    await ColdStorageService_js_1.coldStorageService.archivePartition(this.AUDIT_TABLE, partitionName, true, 'DEEP_ARCHIVE');
                    // 3. Drop partition
                    await pool.query(`DROP TABLE IF EXISTS ${partitionName}`);
                    logger_js_1.logger.info({ partitionName }, 'DeepAuditArchive: Successfully moved to cold storage and dropped from DB');
                }
            }
        }
        catch (err) {
            logger_js_1.logger.error({ err }, 'DeepAuditArchive: Job failed');
            throw err;
        }
    }
}
exports.DeepAuditArchiveService = DeepAuditArchiveService;
exports.deepAuditArchiveService = DeepAuditArchiveService.getInstance();

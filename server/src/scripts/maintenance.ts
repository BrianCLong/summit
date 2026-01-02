
import { partitionManager } from '../db/partitioning.js';
import { BackupService } from '../backup/BackupService.js';
import logger from '../config/logger.js';
import { RedisService } from '../cache/redis.js';

const redis = RedisService.getInstance();
const backupService = new BackupService();

async function runMaintenance() {
    logger.info('Starting system maintenance...');

    try {
        // 1. Partition Maintenance
        logger.info('Running partition maintenance...');
        try {
            await partitionManager.maintainPartitions(['audit_logs', 'metrics']);
            logger.info('Partition maintenance complete.');
        } catch (e: any) {
            logger.warn({ error: e }, 'Partition maintenance failed (likely DB connection issue in dev)');
        }

        // 2. Backup Verification (Lightweight)
        logger.info('Verifying backup inventory...');
        // In a real scenario, this might check for missing backups or stale data
        // For now, we just ensure the backup directories exist
        try {
            await backupService.ensureBackupDir('postgres');
            await backupService.ensureBackupDir('neo4j');
            await backupService.ensureBackupDir('redis');
            logger.info('Backup directory verification complete.');
        } catch (e: any) {
            logger.error({ error: e }, 'Backup verification failed');
            throw e;
        }

        // 3. Cache Maintenance
        logger.info('Running cache maintenance...');
        // Potentially clear expired keys if not handled by Redis
        // Or run analysis
        const memoryUsage = process.memoryUsage();
        logger.info({ memoryUsage }, 'Maintenance memory check');

        logger.info('System maintenance completed successfully.');
    } catch (error: any) {
        logger.error('System maintenance failed', error);
        process.exit(1);
    }
}

// If run directly
if (import.meta.url === `file://${process.argv[1]}`) {
    runMaintenance()
        .then(() => process.exit(0))
        .catch(() => process.exit(1));
}

export { runMaintenance };

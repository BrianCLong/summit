import { partitionManager } from '../db/partitioning.js';
import { logger } from '../config/logger.js';

let timer: NodeJS.Timeout | null = null;

export async function runPartitionMaintenance() {
  logger.info('Running partition maintenance...');
  try {
    // Default tables for time-series partitioning
    const tables = ['audit_logs', 'metrics', 'risk_signals', 'evidence_bundles'];
    await partitionManager.maintainPartitions(tables);

    // Check for old partitions to detach (e.g. older than 12 months)
    // We use a safe default of 12 months, or env var
    const retentionMonths = Number(process.env.PARTITION_RETENTION_MONTHS || 12);
    await partitionManager.detachOldPartitions(tables, retentionMonths);

    logger.info('Partition maintenance completed.');
  } catch (error) {
    logger.error({ error }, 'Partition maintenance failed');
  }
}

export function startPartitionWorker() {
  if (process.env.ENABLE_PARTITION_WORKER !== 'true') {
      logger.info('Partition worker disabled via env flag.');
      return;
  }

  // Run once on startup
  runPartitionMaintenance().catch(err => logger.error({ err }, 'Initial partition maintenance failed'));

  // Schedule periodic run (every 24h)
  const intervalMs = 24 * 60 * 60 * 1000;
  timer = setInterval(() => {
    runPartitionMaintenance().catch(err => logger.error({ err }, 'Scheduled partition maintenance failed'));
  }, intervalMs);

  logger.info('Partition worker started.');
}

export function stopPartitionWorker() {
  if (timer) {
    clearInterval(timer);
    timer = null;
  }
}

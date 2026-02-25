
import { partitionManager } from '../src/db/partitioning.js';
import logger from '../src/utils/logger.js';

async function run() {
  logger.info('Starting partition maintenance...');
  try {
    // Determine tables to maintain from args or default
    const args = process.argv.slice(2);
    const tables = args.length > 0 ? args : undefined;

    await partitionManager.maintainPartitions(tables);
    logger.info('Partition maintenance completed successfully.');
    process.exit(0);
  } catch (error) {
    logger.error('Partition maintenance failed', error);
    process.exit(1);
  }
}

run();

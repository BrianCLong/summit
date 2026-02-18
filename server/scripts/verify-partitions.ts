
import { partitionManager } from '../src/db/partitioning.js';
import { getPostgresPool } from '../src/db/postgres.js';
import { logger } from '../src/config/logger.js';

async function main() {
  logger.info('Verifying partitions...');

  try {
    // Ensure partitions exist using our new logic
    await partitionManager.maintainPartitions();

    const pool = getPostgresPool();
    const client = await pool.connect();

    try {
      // Check orchestrator_events_p partitions
      const result = await client.query(`
        SELECT inhrelid::regclass::text AS partition_name
        FROM pg_inherits
        WHERE inhparent = 'orchestrator_events_p'::regclass
      `);

      const partitions = result.rows.map(r => r.partition_name);
      logger.info({ partitions }, 'Found partitions for orchestrator_events_p');

      if (partitions.length > 0) {
          logger.info('SUCCESS: Partitions verified for orchestrator_events_p.');
      } else {
          logger.warn('WARNING: No partitions found for orchestrator_events_p. Table might not exist yet or no partitions created.');
      }

      // Check provenance_ledger_v2 partitions
      const res2 = await client.query(`
        SELECT inhrelid::regclass::text AS partition_name
        FROM pg_inherits
        WHERE inhparent = 'provenance_ledger_v2'::regclass
      `);
      const partitions2 = res2.rows.map(r => r.partition_name);
      logger.info({ partitions: partitions2 }, 'Found partitions for provenance_ledger_v2');

    } finally {
      client.release();
    }

  } catch (e) {
    logger.error({ error: e }, 'Verification failed');
    process.exit(1);
  } finally {
    // We need to close the pool to exit
    // Accessing managedPool is via exported function or just process.exit
    process.exit(0);
  }
}

main();

import { partitionManager } from '../db/partitioning.js';
import { getPostgresPool, closePostgresPool } from '../db/postgres.js';
import pino from 'pino';

const logger = (pino as any)({ name: 'setup-partitions' });

async function setupPartitions() {
  logger.info('Starting partition setup...');

  const pool = getPostgresPool();
  const client = await pool.connect();

  try {
     // 1. Ensure event_log exists as partitioned table
     logger.info('Checking event_log table...');
     const res = await client.query("SELECT to_regclass('event_log')");

     if (!res.rows[0].to_regclass) {
         logger.info('Creating event_log table with partitioning...');
         await client.query('BEGIN');
         await client.query(`
            CREATE TABLE IF NOT EXISTS event_log (
                id UUID,
                tenant_id UUID NOT NULL,
                type VARCHAR(255) NOT NULL,
                occurred_at TIMESTAMP WITH TIME ZONE NOT NULL,
                actor_id VARCHAR(255),
                payload JSONB NOT NULL,
                schema_version VARCHAR(50),
                receipt_ref VARCHAR(255),
                created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
                PRIMARY KEY (occurred_at, id)
            ) PARTITION BY RANGE (occurred_at);
         `);
         await client.query(`CREATE INDEX IF NOT EXISTS idx_event_log_tenant_date ON event_log(tenant_id, occurred_at)`);
         await client.query('COMMIT');
         logger.info('event_log table created.');
     } else {
         // Check if it is partitioned
         const partRes = await client.query("SELECT relkind FROM pg_class WHERE oid = 'event_log'::regclass");
         if (partRes.rows[0].relkind !== 'p') {
             logger.warn('event_log table exists but is NOT partitioned. Manual migration required if you want to switch to partitioning.');
         } else {
             logger.info('event_log is already partitioned.');
         }
     }

     // 2. Check audit_logs (if it's intended to be partitioned)
     // Assuming audit_logs should also be partitioned if we are running this.
     // But init.sql didn't create it. If it doesn't exist, we might want to create it too,
     // but the schema might be complex. For now, we'll let maintainPartitions handle it
     // (it will log warning if parent table missing).

  } catch (err: any) {
      await client.query('ROLLBACK');
      logger.error(err, 'Failed to setup parent tables');
  } finally {
      client.release();
  }

  // 3. Maintain partitions
  try {
      logger.info('Maintaining partitions for event_log and audit_logs...');
      await partitionManager.maintainPartitions(['event_log', 'audit_logs']);
      logger.info('Partition maintenance completed.');
  } catch (err) {
      logger.error(err, 'Partition maintenance failed');
  }

  await closePostgresPool();
}

setupPartitions().catch(async (err) => {
    logger.error(err, 'Fatal error in setup-partitions');
    await closePostgresPool();
    process.exit(1);
});

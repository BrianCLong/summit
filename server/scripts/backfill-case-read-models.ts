#!/usr/bin/env ts-node
// Backfill read models for case dashboard metrics (READ_MODELS_V1)

import { getPostgresPool } from '../src/db/postgres.js';
import logger from '../src/config/logger.js';

async function main() {
  const pool = getPostgresPool();
  const log = logger.child({ name: 'backfill-case-read-models' });

  try {
    const started = Date.now();
    const { rows } = await pool.query<{
      backfill_case_dashboard_read_models: number;
    }>(`SELECT maestro.backfill_case_dashboard_read_models()`);

    const processed = rows?.[0]?.backfill_case_dashboard_read_models ?? 0;
    const durationMs = Date.now() - started;

    log.info(
      { processed, durationMs },
      'Read model backfill completed for case dashboard',
    );
  } catch (error) {
    log.error({ error }, 'Failed to backfill case dashboard read models');
    process.exitCode = 1;
  } finally {
    await pool.end();
  }
}

main();

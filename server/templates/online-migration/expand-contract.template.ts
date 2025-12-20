/**
 * Expand/Contract migration template using the online migration toolkit.
 *
 * Steps:
 * 1) Expand: add the new column/table with OnlineMigrationToolkit.ensureColumn/ensureTable.
 * 2) Dual-write: wrap writes with DualWriter so both old and new representations stay in sync.
 * 3) Backfill: copy existing data in chunks with BackfillRunner (supports pause/resume).
 * 4) Parity: run ParityChecker to validate sampled rows.
 * 5) Contract: flip reads to the new column/table, then remove the legacy path in a later release.
 */

import type { Pool } from 'pg';
import {
  BackfillRunner,
  DualWriter,
  OnlineMigrationToolkit,
  ParityChecker,
} from '../../src/db/online-migrations/index.js';

const MIGRATION_KEY = 'replace_me_migration_key';

interface Payload {
  id: string;
  legacyValue: string;
  newValue?: string;
}

export function buildDualWriter(pool: Pool): DualWriter<Payload> {
  const toolkit = new OnlineMigrationToolkit(pool);
  return toolkit.createDualWriter<Payload>({
    migrationKey: MIGRATION_KEY,
    operation: 'example_write',
    writePrimary: async (client, payload) => {
      await client.query(`UPDATE legacy_table SET legacy_col = $1 WHERE id = $2`, [
        payload.legacyValue,
        payload.id,
      ]);
    },
    writeShadow: async (client, payload) => {
      await client.query(`UPDATE legacy_table SET new_col = $1 WHERE id = $2`, [
        payload.newValue ?? payload.legacyValue,
        payload.id,
      ]);
    },
  });
}

export async function runMigration(pool: Pool) {
  const toolkit = new OnlineMigrationToolkit(pool);
  await toolkit.ensureStateTables();

  // Expand
  await toolkit.markPhase(MIGRATION_KEY, 'expand');
  await toolkit.ensureColumn('legacy_table', 'new_col', 'TEXT');

  // Backfill
  const backfill = new BackfillRunner<{ id: string; legacy_col: string }, number>(pool);
  await backfill.runJob({
    migrationKey: MIGRATION_KEY,
    jobName: 'example_backfill',
    chunkSize: 500,
    throttleMs: 5,
    fetchBatch: async (client, cursor, limit) => {
      const offset = Number(cursor ?? 0);
      const res = await client.query(
        `SELECT id, legacy_col FROM legacy_table ORDER BY id LIMIT $1 OFFSET $2`,
        [limit, offset],
      );
      return { rows: res.rows, totalRows: undefined, nextCursor: offset + res.rows.length };
    },
    processRow: (client, row) =>
      client.query(`UPDATE legacy_table SET new_col = $1 WHERE id = $2`, [
        row.legacy_col,
        row.id,
      ]),
  });

  // Validate parity on a sample set
  const parity = new ParityChecker(pool);
  await parity.checkColumnParity({
    migrationKey: MIGRATION_KEY,
    table: 'legacy_table',
    keyColumn: 'id',
    oldColumn: 'legacy_col',
    newColumn: 'new_col',
    sampleSize: 25,
  });

  await toolkit.markPhase(MIGRATION_KEY, 'contract-ready');
}

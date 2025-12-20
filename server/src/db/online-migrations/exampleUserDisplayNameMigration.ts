import type { Pool } from 'pg';
import { BackfillRunner } from './backfillRunner.js';
import { DualWriter } from './dualWrite.js';
import { ParityChecker } from './parityChecker.js';
import { OnlineMigrationToolkit } from './toolkit.js';

export const USERS_DISPLAY_NAME_MIGRATION_KEY = 'users-display-name-canonical';

export interface DisplayNamePayload {
  userId: string;
  displayName: string;
  canonical?: string;
}

export function buildDisplayNameDualWriter(pool: Pool): DualWriter<DisplayNamePayload> {
  const toolkit = new OnlineMigrationToolkit(pool);
  return toolkit.createDualWriter<DisplayNamePayload>({
    migrationKey: USERS_DISPLAY_NAME_MIGRATION_KEY,
    operation: 'user_display_name',
    writePrimary: async (client, payload) => {
      await client.query(`UPDATE users SET display_name = $1 WHERE id = $2`, [
        payload.displayName,
        payload.userId,
      ]);
    },
    writeShadow: async (client, payload) => {
      await client.query(
        `UPDATE users SET display_name_canonical = $1 WHERE id = $2`,
        [payload.canonical ?? payload.displayName, payload.userId],
      );
    },
  });
}

async function runBackfill(pool: Pool) {
  const runner = new BackfillRunner<{ id: string; display_name: string }, number>(pool);
  return runner.runJob({
    migrationKey: USERS_DISPLAY_NAME_MIGRATION_KEY,
    jobName: 'copy_display_name',
    chunkSize: 250,
    throttleMs: 10,
    fetchBatch: async (client, cursor, limit) => {
      const offset = cursor ? Number(cursor) : 0;
      const [batch, total] = await Promise.all([
        client.query(
          `SELECT id, display_name FROM users ORDER BY created_at, id LIMIT $1 OFFSET $2`,
          [limit, offset],
        ),
        offset === 0
          ? client.query(`SELECT count(*)::int AS count FROM users`)
          : Promise.resolve(null),
      ]);

      const totalRows =
        total && total.rowCount > 0 ? Number(total.rows[0].count ?? 0) : undefined;

      return {
        rows: batch.rows,
        totalRows,
        nextCursor: offset + batch.rows.length,
      };
    },
    processRow: async (client, row) => {
      await client.query(`UPDATE users SET display_name_canonical = $1 WHERE id = $2`, [
        row.display_name,
        row.id,
      ]);
    },
  });
}

async function checkParity(pool: Pool) {
  const parity = new ParityChecker(pool);
  return parity.checkColumnParity({
    migrationKey: USERS_DISPLAY_NAME_MIGRATION_KEY,
    table: 'users',
    keyColumn: 'id',
    oldColumn: 'display_name',
    newColumn: 'display_name_canonical',
    sampleSize: 10,
  });
}

export async function runExampleDisplayNameMigration(pool: Pool) {
  const toolkit = new OnlineMigrationToolkit(pool);
  await toolkit.ensureStateTables();
  await toolkit.markPhase(USERS_DISPLAY_NAME_MIGRATION_KEY, 'expand', {
    description: 'Add canonicalized display names to users',
  });
  await toolkit.ensureColumn('users', 'display_name_canonical', 'TEXT');

  await runBackfill(pool);
  const parityResult = await checkParity(pool);
  const nextPhase = parityResult.mismatches === 0 ? 'contract-ready' : 'validate';
  await toolkit.markPhase(USERS_DISPLAY_NAME_MIGRATION_KEY, nextPhase, parityResult);

  return parityResult;
}

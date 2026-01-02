import type { Pool } from 'pg';
import { BackfillRunner } from './backfillRunner.js';
import { DualWriteOptions, DualWriter } from './dualWrite.js';
import { ParityChecker } from './parityChecker.js';
import {
  ONLINE_MIGRATION_RUNS,
  assertIdentifier,
  ensureOnlineMigrationTables,
} from './state.js';

export class OnlineMigrationToolkit {
  constructor(private pool: Pool) {}

  createBackfillRunner<TRow, TCursor = string>() {
    return new BackfillRunner<TRow, TCursor>(this.pool);
  }

  createDualWriter<T>(options: DualWriteOptions<T>) {
    return new DualWriter<T>(this.pool, options);
  }

  createParityChecker() {
    return new ParityChecker(this.pool);
  }

  async ensureStateTables() {
    await ensureOnlineMigrationTables(this.pool);
  }

  async ensureTable(table: string, definition: string) {
    assertIdentifier(table, 'table');
    await ensureOnlineMigrationTables(this.pool);
    await this.pool.query(`CREATE TABLE IF NOT EXISTS "${table}" (${definition})`);
  }

  async ensureColumn(table: string, column: string, sqlType: string, defaultExpression?: string) {
    assertIdentifier(table, 'table');
    assertIdentifier(column, 'column');
    await ensureOnlineMigrationTables(this.pool);
    const defaultClause = defaultExpression ? ` DEFAULT ${defaultExpression}` : '';
    await this.pool.query(
      `ALTER TABLE IF EXISTS "${table}"
         ADD COLUMN IF NOT EXISTS "${column}" ${sqlType}${defaultClause}`,
    );
  }

  async markPhase(
    migrationKey: string,
    phase: 'expand' | 'backfill' | 'validate' | 'contract-ready',
    metadata: Record<string, unknown> | object = {},
  ) {
    await ensureOnlineMigrationTables(this.pool);
    const metadataValue = metadata ?? {};
    try {
      await this.pool.query(
        `INSERT INTO ${ONLINE_MIGRATION_RUNS} (migration_key, phase, metadata)
         VALUES ($1, $2, to_jsonb($3))
         ON CONFLICT (migration_key) DO UPDATE
           SET phase = EXCLUDED.phase,
               metadata = ${ONLINE_MIGRATION_RUNS}.metadata || EXCLUDED.metadata,
               updated_at = now()`,
        [migrationKey, phase, metadataValue],
      );
    } catch (error: any) {
      const metadataJson =
        typeof metadataValue === 'string'
          ? metadataValue
          : JSON.stringify(metadataValue ?? {}) || '{}';
      try {
        await this.pool.query(
          `INSERT INTO ${ONLINE_MIGRATION_RUNS} (migration_key, phase, metadata)
           VALUES ($1, $2, $3::jsonb)
           ON CONFLICT (migration_key) DO UPDATE
             SET phase = EXCLUDED.phase,
                 metadata = ${ONLINE_MIGRATION_RUNS}.metadata || EXCLUDED.metadata,
                 updated_at = now()`,
          [migrationKey, phase, metadataJson],
        );
      } catch {
        await this.pool.query(
          `INSERT INTO ${ONLINE_MIGRATION_RUNS} (migration_key, phase)
           VALUES ($1, $2)
           ON CONFLICT (migration_key) DO UPDATE
             SET phase = EXCLUDED.phase,
                 updated_at = now()`,
          [migrationKey, phase],
        );
      }
    }
  }
}

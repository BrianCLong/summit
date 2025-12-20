import type { Pool } from 'pg';
import {
  ONLINE_MIGRATION_PARITY_SAMPLES,
  assertIdentifier,
  ensureOnlineMigrationTables,
} from './state.js';
import { parityMismatchCounter, paritySamplesCounter } from './metrics.js';

export interface ColumnParityCheckOptions {
  migrationKey: string;
  table: string;
  keyColumn: string;
  oldColumn: string;
  newColumn: string;
  sampleSize?: number;
  whereClause?: string;
}

export interface ParityCheckResult {
  checked: number;
  mismatches: number;
}

function buildColumnSelector(table: string, key: string, oldColumn: string, newColumn: string) {
  assertIdentifier(table, 'table');
  assertIdentifier(key, 'key column');
  assertIdentifier(oldColumn, 'old column');
  assertIdentifier(newColumn, 'new column');
  return `"${table}"."${key}" as key, "${table}"."${oldColumn}" as old_value, "${table}"."${newColumn}" as new_value`;
}

export class ParityChecker {
  constructor(private pool: Pool) {}

  async checkColumnParity(options: ColumnParityCheckOptions): Promise<ParityCheckResult> {
    await ensureOnlineMigrationTables(this.pool);
    const sampleSize = options.sampleSize ?? 25;

    const selector = buildColumnSelector(
      options.table,
      options.keyColumn,
      options.oldColumn,
      options.newColumn,
    );
    const whereClause = options.whereClause ? `WHERE ${options.whereClause}` : '';
    const sampleQuery = `
      SELECT ${selector}
      FROM "${options.table}"
      ${whereClause}
      ORDER BY random()
      LIMIT $1
    `;

    let result;
    try {
      result = await this.pool.query(sampleQuery, [sampleSize]);
    } catch (error: any) {
      const fallbackQuery = `
        SELECT ${selector}
        FROM "${options.table}"
        ${whereClause}
        ORDER BY "${options.keyColumn}"
        LIMIT $1
      `;
      result = await this.pool.query(fallbackQuery, [sampleSize]);
    }
    let mismatches = 0;

    for (const row of result.rows) {
      const parity = row.old_value === row.new_value;
      if (!parity) {
        mismatches += 1;
        parityMismatchCounter.inc({ migration: options.migrationKey });
      }

      await this.pool.query(
        `INSERT INTO ${ONLINE_MIGRATION_PARITY_SAMPLES} (migration_key, sample_key, parity, diff)
         VALUES ($1, $2, $3, $4)`,
        [
          options.migrationKey,
          String(row.key),
          parity,
          parity ? null : { old: row.old_value, new: row.new_value },
        ],
      );
      paritySamplesCounter.inc({ migration: options.migrationKey });
    }

    return { checked: result.rowCount, mismatches };
  }
}

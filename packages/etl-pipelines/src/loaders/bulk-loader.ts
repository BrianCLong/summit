/**
 * Bulk Data Loader with optimizations
 */

import { Pool } from 'pg';

export interface LoadOptions {
  batchSize?: number;
  parallelism?: number;
  skipErrors?: boolean;
  truncateFirst?: boolean;
}

export class BulkLoader {
  constructor(private pool: Pool) {}

  async load(
    tableName: string,
    data: any[][],
    columns: string[],
    options: LoadOptions = {},
  ): Promise<{ loaded: number; errors: number }> {
    const batchSize = options.batchSize || 10000;

    if (options.truncateFirst) {
      await this.pool.query(`TRUNCATE TABLE ${tableName}`);
    }

    let loaded = 0;
    let errors = 0;

    for (let i = 0; i < data.length; i += batchSize) {
      const batch = data.slice(i, i + batchSize);

      try {
        await this.loadBatch(tableName, batch, columns);
        loaded += batch.length;
      } catch (error) {
        errors += batch.length;
        if (!options.skipErrors) throw error;
      }
    }

    return { loaded, errors };
  }

  private async loadBatch(tableName: string, batch: any[][], columns: string[]): Promise<void> {
    const placeholders = batch
      .map(
        (_, idx) =>
          `(${columns.map((_, colIdx) => `$${idx * columns.length + colIdx + 1}`).join(', ')})`,
      )
      .join(', ');

    await this.pool.query(
      `INSERT INTO ${tableName} (${columns.join(', ')}) VALUES ${placeholders}`,
      batch.flat(),
    );
  }

  async loadFromCSV(tableName: string, csvPath: string, columns: string[]): Promise<void> {
    await this.pool.query(`
      COPY ${tableName} (${columns.join(', ')})
      FROM '${csvPath}'
      WITH (FORMAT csv, HEADER true)
    `);
  }
}

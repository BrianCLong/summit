/**
 * Materialized View Manager
 * Manages materialized views for query acceleration
 */

import { Pool } from 'pg';

export interface MaterializedViewDefinition {
  name: string;
  query: string;
  refreshStrategy: 'manual' | 'scheduled' | 'incremental';
  refreshInterval?: number;
  indexes?: string[];
}

export class MaterializedViewManager {
  constructor(private pool: Pool) {}

  async createMaterializedView(definition: MaterializedViewDefinition): Promise<void> {
    await this.pool.query(`
      CREATE MATERIALIZED VIEW ${definition.name} AS
      ${definition.query}
    `);

    if (definition.indexes) {
      for (const indexCol of definition.indexes) {
        await this.pool.query(`
          CREATE INDEX idx_mv_${definition.name}_${indexCol}
          ON ${definition.name}(${indexCol})
        `);
      }
    }
  }

  async refreshMaterializedView(name: string, concurrently: boolean = false): Promise<void> {
    const concurrent = concurrently ? 'CONCURRENTLY' : '';
    await this.pool.query(`REFRESH MATERIALIZED VIEW ${concurrent} ${name}`);
  }

  async dropMaterializedView(name: string): Promise<void> {
    await this.pool.query(`DROP MATERIALIZED VIEW IF EXISTS ${name}`);
  }

  async getMaterializedViewInfo(name: string): Promise<{
    size: number;
    rowCount: number;
    lastRefresh: Date;
  }> {
    const sizeResult = await this.pool.query(
      `SELECT pg_total_relation_size($1) as size`,
      [name],
    );

    const countResult = await this.pool.query(`SELECT COUNT(*) as count FROM ${name}`);

    return {
      size: parseInt(sizeResult.rows[0]?.size || '0'),
      rowCount: parseInt(countResult.rows[0]?.count || '0'),
      lastRefresh: new Date(),
    };
  }
}

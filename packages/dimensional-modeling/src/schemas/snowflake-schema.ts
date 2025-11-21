/**
 * Snowflake Schema Implementation
 * Normalized dimension tables with hierarchies
 */

import { Pool } from 'pg';
import { DimensionTable } from './star-schema';

export interface DimensionHierarchy {
  name: string;
  levels: Array<{
    name: string;
    table: string;
    key: string;
    parentKey?: string;
  }>;
}

export class SnowflakeSchema {
  constructor(private pool: Pool) {}

  async createNormalizedDimension(
    dimension: DimensionTable,
    hierarchy: DimensionHierarchy,
  ): Promise<void> {
    for (const level of hierarchy.levels) {
      const parentRef = level.parentKey
        ? `, ${level.parentKey} BIGINT REFERENCES ${level.name}_parent(id)`
        : '';

      await this.pool.query(`
        CREATE TABLE ${level.table} (
          ${level.key} BIGSERIAL PRIMARY KEY,
          name VARCHAR(255) NOT NULL
          ${parentRef},
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )
      `);
    }
  }

  async querySnowflakeSchema(
    factTable: string,
    hierarchy: DimensionHierarchy,
    measures: string[],
  ): Promise<any[]> {
    const joins = hierarchy.levels.map((level, idx) => {
      if (idx === 0) {
        return `LEFT JOIN ${level.table} ON ${factTable}.${hierarchy.name}_key = ${level.table}.${level.key}`;
      } else {
        const parent = hierarchy.levels[idx - 1];
        return `LEFT JOIN ${level.table} ON ${parent.table}.${level.parentKey} = ${level.table}.${level.key}`;
      }
    }).join('\n');

    const selectCols = [
      ...hierarchy.levels.map((l) => `${l.table}.*`),
      ...measures.map((m) => `${factTable}.${m}`),
    ].join(', ');

    const query = `
      SELECT ${selectCols}
      FROM ${factTable}
      ${joins}
    `;

    const result = await this.pool.query(query);
    return result.rows;
  }
}

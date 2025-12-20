/**
 * OLAP Cube Manager
 * Manages cube creation, storage, and querying with drill-down, roll-up, slice, and dice operations
 */

import { Pool } from 'pg';

export interface CubeDefinition {
  name: string;
  measures: string[];
  dimensions: string[];
  aggregations: Array<{ function: string; measure: string }>;
  filters?: Record<string, any>;
}

export interface CubeCell {
  coordinates: Record<string, any>;
  measures: Record<string, number>;
}

export class CubeManager {
  constructor(private pool: Pool) {}

  async createCube(definition: CubeDefinition): Promise<void> {
    const measureCols = definition.measures
      .map((m) => `${m}_sum NUMERIC, ${m}_count INTEGER, ${m}_avg NUMERIC, ${m}_min NUMERIC, ${m}_max NUMERIC`)
      .join(', ');
    const dimCols = definition.dimensions.map((d) => `${d} VARCHAR(255)`).join(', ');

    await this.pool.query(`
      CREATE TABLE cube_${definition.name} (
        cube_id BIGSERIAL PRIMARY KEY,
        ${dimCols},
        ${measureCols},
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        UNIQUE (${definition.dimensions.join(', ')})
      )
    `);

    for (const dim of definition.dimensions) {
      await this.pool.query(`
        CREATE INDEX idx_cube_${definition.name}_${dim}
        ON cube_${definition.name}(${dim})
      `);
    }
  }

  async buildCube(cubeName: string, sourceTable: string, definition: CubeDefinition): Promise<void> {
    const dimensions = definition.dimensions.join(', ');
    const aggregations = definition.measures
      .map((m) => `SUM(${m}) as ${m}_sum, COUNT(${m}) as ${m}_count, AVG(${m}) as ${m}_avg, MIN(${m}) as ${m}_min, MAX(${m}) as ${m}_max`)
      .join(', ');

    const insertCols = [
      ...definition.dimensions,
      ...definition.measures.flatMap((m) => [`${m}_sum`, `${m}_count`, `${m}_avg`, `${m}_min`, `${m}_max`]),
    ].join(', ');

    await this.pool.query(`
      INSERT INTO cube_${cubeName} (${insertCols})
      SELECT ${dimensions}, ${aggregations}
      FROM ${sourceTable}
      GROUP BY ${dimensions}
    `);
  }

  async queryCube(
    cubeName: string,
    dimensions: string[],
    measures: string[],
    filters?: Record<string, any>,
  ): Promise<CubeCell[]> {
    const selectCols = [...dimensions, ...measures.flatMap((m) => [`${m}_sum`, `${m}_avg`])].join(', ');
    const whereClause = filters
      ? `WHERE ${Object.entries(filters)
          .map(([k, v]) => `${k} = '${v}'`)
          .join(' AND ')}`
      : '';

    const result = await this.pool.query(`
      SELECT ${selectCols}
      FROM cube_${cubeName}
      ${whereClause}
    `);

    return result.rows.map((row) => ({
      coordinates: dimensions.reduce((acc, d) => ({ ...acc, [d]: row[d] }), {}),
      measures: measures.reduce((acc, m) => ({ ...acc, [m]: row[`${m}_sum`] }), {}),
    }));
  }

  async drillDown(cubeName: string, fromDimension: string, toDimension: string): Promise<any[]> {
    const result = await this.pool.query(`
      SELECT ${toDimension}, SUM(measure_sum) as total
      FROM cube_${cubeName}
      GROUP BY ${toDimension}
      ORDER BY total DESC
    `);
    return result.rows;
  }

  async rollUp(cubeName: string, dimensions: string[], measures: string[]): Promise<any[]> {
    const dims = dimensions.join(', ');
    const aggs = measures.map((m) => `SUM(${m}_sum) as ${m}_total`).join(', ');

    const result = await this.pool.query(`
      SELECT ${dims}, ${aggs}
      FROM cube_${cubeName}
      GROUP BY ${dims}
    `);
    return result.rows;
  }

  async slice(cubeName: string, dimension: string, value: any): Promise<any[]> {
    const result = await this.pool.query(
      `SELECT * FROM cube_${cubeName} WHERE ${dimension} = $1`,
      [value],
    );
    return result.rows;
  }

  async dice(cubeName: string, filters: Record<string, any>): Promise<any[]> {
    const whereClause = Object.entries(filters)
      .map(([k, v]) => `${k} = '${v}'`)
      .join(' AND ');

    const result = await this.pool.query(`
      SELECT * FROM cube_${cubeName} WHERE ${whereClause}
    `);
    return result.rows;
  }
}

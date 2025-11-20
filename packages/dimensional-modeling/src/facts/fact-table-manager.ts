/**
 * Fact Table Manager
 */

import { Pool } from 'pg';

export class FactTableManager {
  constructor(private pool: Pool) {}

  async createFactTable(
    name: string,
    dimensions: string[],
    measures: Array<{ name: string; type: string }>,
  ): Promise<void> {
    const dimensionKeys = dimensions
      .map((d) => `${d}_key BIGINT`)
      .join(', ');

    const measureDefs = measures
      .map((m) => `${m.name} ${m.type}`)
      .join(', ');

    await this.pool.query(`
      CREATE TABLE fact_${name} (
        fact_id BIGSERIAL PRIMARY KEY,
        ${dimensionKeys},
        ${measureDefs},
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);
  }

  async insertFact(
    factName: string,
    data: Record<string, any>,
  ): Promise<void> {
    const columns = Object.keys(data).join(', ');
    const placeholders = Object.keys(data)
      .map((_, idx) => `$${idx + 1}`)
      .join(', ');

    await this.pool.query(
      `INSERT INTO fact_${factName} (${columns}) VALUES (${placeholders})`,
      Object.values(data),
    );
  }
}

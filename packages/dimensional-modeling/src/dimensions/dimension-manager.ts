/**
 * Dimension Manager for creating and managing dimension tables
 */

import { Pool } from 'pg';

export class DimensionManager {
  constructor(private pool: Pool) {}

  async createDimension(name: string, attributes: string[]): Promise<void> {
    const attrDefs = attributes.map((a) => `${a} VARCHAR(255)`).join(', ');

    await this.pool.query(`
      CREATE TABLE dim_${name} (
        ${name}_id BIGSERIAL PRIMARY KEY,
        ${name}_key VARCHAR(255) UNIQUE NOT NULL,
        ${attrDefs},
        effective_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        expiry_date TIMESTAMP,
        is_current BOOLEAN DEFAULT TRUE
      )
    `);
  }

  async insertDimensionRow(
    dimensionName: string,
    data: Record<string, any>,
  ): Promise<number> {
    const columns = Object.keys(data).join(', ');
    const placeholders = Object.keys(data)
      .map((_, idx) => `$${idx + 1}`)
      .join(', ');

    const result = await this.pool.query(
      `INSERT INTO dim_${dimensionName} (${columns}) VALUES (${placeholders}) RETURNING ${dimensionName}_id`,
      Object.values(data),
    );

    return result.rows[0][`${dimensionName}_id`];
  }
}

/**
 * Slowly Changing Dimension (SCD) Handler
 *
 * Supports SCD Types 1-6:
 * - Type 1: Overwrite
 * - Type 2: Add new row with versioning
 * - Type 3: Add new column
 * - Type 4: History table
 * - Type 5: Mini-dimension
 * - Type 6: Hybrid (1+2+3)
 */

import { Pool } from 'pg';

export enum SCDType {
  TYPE_1 = 1,
  TYPE_2 = 2,
  TYPE_3 = 3,
  TYPE_4 = 4,
  TYPE_5 = 5,
  TYPE_6 = 6,
}

export class SCDHandler {
  constructor(private pool: Pool) {}

  /**
   * SCD Type 1: Overwrite old values
   */
  async handleType1(
    tableName: string,
    naturalKey: string[],
    newValues: Record<string, any>,
  ): Promise<void> {
    const whereClause = naturalKey
      .map((key) => `${key} = $${naturalKey.indexOf(key) + 1}`)
      .join(' AND ');

    const setClause = Object.keys(newValues)
      .filter((k) => !naturalKey.includes(k))
      .map((k, idx) => `${k} = $${naturalKey.length + idx + 1}`)
      .join(', ');

    const values = [
      ...naturalKey.map((k) => newValues[k]),
      ...Object.entries(newValues)
        .filter(([k]) => !naturalKey.includes(k))
        .map(([_, v]) => v),
    ];

    await this.pool.query(
      `UPDATE ${tableName} SET ${setClause}, updated_at = CURRENT_TIMESTAMP WHERE ${whereClause}`,
      values,
    );
  }

  /**
   * SCD Type 2: Add new row with versioning
   */
  async handleType2(
    tableName: string,
    naturalKey: string[],
    newValues: Record<string, any>,
  ): Promise<void> {
    // Expire current record
    const whereClause = naturalKey
      .map((key) => `${key} = '${newValues[key]}'`)
      .join(' AND ');

    await this.pool.query(`
      UPDATE ${tableName}
      SET is_current = FALSE,
          expiry_date = CURRENT_TIMESTAMP
      WHERE ${whereClause} AND is_current = TRUE
    `);

    // Insert new record
    const columns = Object.keys(newValues).join(', ');
    const placeholders = Object.keys(newValues)
      .map((_, idx) => `$${idx + 1}`)
      .join(', ');

    await this.pool.query(
      `INSERT INTO ${tableName} (${columns}, is_current, effective_date)
       VALUES (${placeholders}, TRUE, CURRENT_TIMESTAMP)`,
      Object.values(newValues),
    );
  }

  /**
   * SCD Type 3: Add previous value columns
   */
  async handleType3(
    tableName: string,
    naturalKey: string[],
    newValues: Record<string, any>,
    trackedColumns: string[],
  ): Promise<void> {
    // First, get current values
    const whereClause = naturalKey
      .map((key) => `${key} = '${newValues[key]}'`)
      .join(' AND ');

    const current = await this.pool.query(
      `SELECT * FROM ${tableName} WHERE ${whereClause}`,
    );

    if (current.rows.length === 0) return;

    // Update with previous values
    const updateSets = trackedColumns
      .map((col) => `${col}_previous = ${col}, ${col} = '${newValues[col]}'`)
      .join(', ');

    await this.pool.query(`
      UPDATE ${tableName}
      SET ${updateSets}, updated_at = CURRENT_TIMESTAMP
      WHERE ${whereClause}
    `);
  }

  /**
   * SCD Type 4: Separate history table
   */
  async handleType4(
    tableName: string,
    historyTableName: string,
    naturalKey: string[],
    newValues: Record<string, any>,
  ): Promise<void> {
    // Get current record
    const whereClause = naturalKey
      .map((key) => `${key} = '${newValues[key]}'`)
      .join(' AND ');

    const current = await this.pool.query(
      `SELECT * FROM ${tableName} WHERE ${whereClause}`,
    );

    if (current.rows.length > 0) {
      // Copy to history
      const currentRow = current.rows[0];
      const columns = Object.keys(currentRow).join(', ');
      const values = Object.values(currentRow)
        .map((v) => `'${v}'`)
        .join(', ');

      await this.pool.query(`
        INSERT INTO ${historyTableName} (${columns}, history_date)
        VALUES (${values}, CURRENT_TIMESTAMP)
      `);

      // Update current record
      const setClause = Object.entries(newValues)
        .filter(([k]) => !naturalKey.includes(k))
        .map(([k, v]) => `${k} = '${v}'`)
        .join(', ');

      await this.pool.query(`
        UPDATE ${tableName}
        SET ${setClause}, updated_at = CURRENT_TIMESTAMP
        WHERE ${whereClause}
      `);
    }
  }

  /**
   * SCD Type 6: Hybrid (combines Type 1, 2, and 3)
   */
  async handleType6(
    tableName: string,
    naturalKey: string[],
    newValues: Record<string, any>,
  ): Promise<void> {
    // Expire current record (Type 2)
    const whereClause = naturalKey
      .map((key) => `${key} = '${newValues[key]}'`)
      .join(' AND ');

    // Get current values for Type 3
    const current = await this.pool.query(
      `SELECT * FROM ${tableName} WHERE ${whereClause} AND is_current = TRUE`,
    );

    // Update all records with new current value (Type 1)
    await this.pool.query(`
      UPDATE ${tableName}
      SET current_value = '${newValues.value}'
      WHERE ${whereClause}
    `);

    // Mark old record as not current (Type 2)
    await this.pool.query(`
      UPDATE ${tableName}
      SET is_current = FALSE,
          expiry_date = CURRENT_TIMESTAMP
      WHERE ${whereClause} AND is_current = TRUE
    `);

    // Insert new record with history (Type 2 + Type 3)
    const columns = Object.keys(newValues).join(', ');
    const placeholders = Object.keys(newValues)
      .map((_, idx) => `$${idx + 1}`)
      .join(', ');

    await this.pool.query(
      `INSERT INTO ${tableName} (${columns}, is_current, effective_date, previous_value)
       VALUES (${placeholders}, TRUE, CURRENT_TIMESTAMP, $${Object.keys(newValues).length + 1})`,
      [...Object.values(newValues), current.rows[0]?.value],
    );
  }

  /**
   * Query dimension with time travel
   */
  async queryAsOfDate(
    tableName: string,
    asOfDate: Date,
    filters?: Record<string, any>,
  ): Promise<any[]> {
    const whereClause = filters
      ? `AND ${Object.entries(filters)
          .map(([k, v]) => `${k} = '${v}'`)
          .join(' AND ')}`
      : '';

    const result = await this.pool.query(`
      SELECT *
      FROM ${tableName}
      WHERE effective_date <= $1
        AND (expiry_date IS NULL OR expiry_date > $1)
        ${whereClause}
    `, [asOfDate]);

    return result.rows;
  }
}

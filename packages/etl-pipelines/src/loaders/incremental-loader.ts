/**
 * Incremental Data Loader with CDC support
 */

import { Pool } from 'pg';

export interface CDCConfig {
  timestampColumn: string;
  deleteFlagColumn?: string;
}

export class IncrementalLoader {
  constructor(private pool: Pool) {}

  async loadIncremental(
    targetTable: string,
    sourceTable: string,
    keyColumns: string[],
    cdc: CDCConfig,
    lastLoadTime?: Date
  ): Promise<{ inserted: number; updated: number; deleted: number }> {
    const watermark = lastLoadTime || new Date(0);
    
    const changes = await this.pool.query(`
      SELECT * FROM ${sourceTable}
      WHERE ${cdc.timestampColumn} > $1
    `, [watermark]);

    let inserted = 0, updated = 0, deleted = 0;

    for (const row of changes.rows) {
      const isDeleted = cdc.deleteFlagColumn && row[cdc.deleteFlagColumn];
      
      if (isDeleted) {
        await this.deleteRow(targetTable, keyColumns, row);
        deleted++;
      } else {
        const exists = await this.rowExists(targetTable, keyColumns, row);
        
        if (exists) {
          await this.updateRow(targetTable, keyColumns, row);
          updated++;
        } else {
          await this.insertRow(targetTable, row);
          inserted++;
        }
      }
    }

    return { inserted, updated, deleted };
  }

  private async rowExists(table: string, keyColumns: string[], row: any): Promise<boolean> {
    const whereClause = keyColumns.map(k => `${k} = '${row[k]}'`).join(' AND ');
    const result = await this.pool.query(`SELECT 1 FROM ${table} WHERE ${whereClause}`);
    return result.rows.length > 0;
  }

  private async insertRow(table: string, row: any): Promise<void> {
    const columns = Object.keys(row).join(', ');
    const values = Object.values(row).map((_, i) => `$${i + 1}`).join(', ');
    await this.pool.query(`INSERT INTO ${table} (${columns}) VALUES (${values})`, Object.values(row));
  }

  private async updateRow(table: string, keyColumns: string[], row: any): Promise<void> {
    const setClauses = Object.keys(row).filter(k => !keyColumns.includes(k)).map(k => `${k} = '${row[k]}'`).join(', ');
    const whereClause = keyColumns.map(k => `${k} = '${row[k]}'`).join(' AND ');
    await this.pool.query(`UPDATE ${table} SET ${setClauses} WHERE ${whereClause}`);
  }

  private async deleteRow(table: string, keyColumns: string[], row: any): Promise<void> {
    const whereClause = keyColumns.map(k => `${k} = '${row[k]}'`).join(' AND ');
    await this.pool.query(`DELETE FROM ${table} WHERE ${whereClause}`);
  }
}

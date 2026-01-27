import { Pool } from 'pg';
import { Selector } from '../types.js';

function escapeId(id: string): string {
    return `"${id.replace(/"/g, '""')}"`;
}

function formatTable(table: string): string {
    return table.split('.').map(escapeId).join('.');
}

export class PgLoader {
  constructor(private pool: Pool) {}

  async *load(selector: Selector, chunkSize: number = 1000): AsyncGenerator<any[]> {
    const client = await this.pool.connect();
    try {
      await client.query('BEGIN');
      // Create a cursor
      const cols = [selector.pk.column, ...selector.properties.map(p => p.column)];

      // Handle relationship FKs if any
      if (selector.rels) {
           selector.rels.forEach(r => {
               if(r.direction === 'OUT') cols.push(r.fromPk);
           });
      }

      // dedup columns
      const uniqueCols = [...new Set(cols)];

      const tableStr = formatTable(selector.table);
      const pkStr = escapeId(selector.pk.column);
      const colsStr = uniqueCols.map(escapeId).join(', ');

      const queryName = `cursor_${selector.table.replace(/[^a-zA-Z0-9]/g, '_')}_${Date.now()}`;
      const queryText = `SELECT ${colsStr} FROM ${tableStr} ORDER BY ${pkStr}`;

      await client.query(`DECLARE ${queryName} CURSOR FOR ${queryText}`);

      while (true) {
        const res = await client.query(`FETCH ${chunkSize} FROM ${queryName}`);
        if (res.rows.length === 0) break;
        yield res.rows;
      }

      await client.query('COMMIT');
    } catch (e) {
      await client.query('ROLLBACK');
      throw e;
    } finally {
      client.release();
    }
  }
}

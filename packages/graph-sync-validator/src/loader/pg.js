"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.PgLoader = void 0;
function escapeId(id) {
    return `"${id.replace(/"/g, '""')}"`;
}
function formatTable(table) {
    return table.split('.').map(escapeId).join('.');
}
class PgLoader {
    pool;
    constructor(pool) {
        this.pool = pool;
    }
    async *load(selector, chunkSize = 1000) {
        const client = await this.pool.connect();
        try {
            await client.query('BEGIN');
            // Create a cursor
            const cols = [selector.pk.column, ...selector.properties.map(p => p.column)];
            // Handle relationship FKs if any
            if (selector.rels) {
                selector.rels.forEach(r => {
                    if (r.direction === 'OUT')
                        cols.push(r.fromPk);
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
                if (res.rows.length === 0)
                    break;
                yield res.rows;
            }
            await client.query('COMMIT');
        }
        catch (e) {
            await client.query('ROLLBACK');
            throw e;
        }
        finally {
            client.release();
        }
    }
}
exports.PgLoader = PgLoader;

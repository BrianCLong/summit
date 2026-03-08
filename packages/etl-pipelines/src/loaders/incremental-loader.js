"use strict";
/**
 * Incremental Data Loader with CDC support
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.IncrementalLoader = void 0;
class IncrementalLoader {
    pool;
    constructor(pool) {
        this.pool = pool;
    }
    async loadIncremental(targetTable, sourceTable, keyColumns, cdc, lastLoadTime) {
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
            }
            else {
                const exists = await this.rowExists(targetTable, keyColumns, row);
                if (exists) {
                    await this.updateRow(targetTable, keyColumns, row);
                    updated++;
                }
                else {
                    await this.insertRow(targetTable, row);
                    inserted++;
                }
            }
        }
        return { inserted, updated, deleted };
    }
    async rowExists(table, keyColumns, row) {
        const whereClause = keyColumns.map((k, i) => `${k} = $${i + 1}`).join(' AND ');
        const values = keyColumns.map((k) => row[k]);
        const result = await this.pool.query(`SELECT 1 FROM ${table} WHERE ${whereClause}`, values);
        return result.rows.length > 0;
    }
    async insertRow(table, row) {
        const columns = Object.keys(row).join(', ');
        const values = Object.values(row)
            .map((_, i) => `$${i + 1}`)
            .join(', ');
        await this.pool.query(`INSERT INTO ${table} (${columns}) VALUES (${values})`, Object.values(row));
    }
    async updateRow(table, keyColumns, row) {
        const updateColumns = Object.keys(row).filter((k) => !keyColumns.includes(k));
        let paramIndex = 1;
        const setClauses = updateColumns.map((k) => `${k} = $${paramIndex++}`).join(', ');
        const whereClause = keyColumns.map((k) => `${k} = $${paramIndex++}`).join(' AND ');
        const values = [...updateColumns.map((k) => row[k]), ...keyColumns.map((k) => row[k])];
        await this.pool.query(`UPDATE ${table} SET ${setClauses} WHERE ${whereClause}`, values);
    }
    async deleteRow(table, keyColumns, row) {
        const whereClause = keyColumns.map((k, i) => `${k} = $${i + 1}`).join(' AND ');
        const values = keyColumns.map((k) => row[k]);
        await this.pool.query(`DELETE FROM ${table} WHERE ${whereClause}`, values);
    }
}
exports.IncrementalLoader = IncrementalLoader;

"use strict";
/**
 * Bulk Data Loader with optimizations
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.BulkLoader = void 0;
class BulkLoader {
    pool;
    constructor(pool) {
        this.pool = pool;
    }
    async load(tableName, data, columns, options = {}) {
        const batchSize = options.batchSize || 10000;
        if (options.truncateFirst) {
            await this.pool.query(`TRUNCATE TABLE ${tableName}`);
        }
        let loaded = 0;
        let errors = 0;
        for (let i = 0; i < data.length; i += batchSize) {
            const batch = data.slice(i, i + batchSize);
            try {
                await this.loadBatch(tableName, batch, columns);
                loaded += batch.length;
            }
            catch (error) {
                errors += batch.length;
                if (!options.skipErrors)
                    throw error;
            }
        }
        return { loaded, errors };
    }
    async loadBatch(tableName, batch, columns) {
        const placeholders = batch
            .map((_, idx) => `(${columns.map((_, colIdx) => `$${idx * columns.length + colIdx + 1}`).join(', ')})`)
            .join(', ');
        await this.pool.query(`INSERT INTO ${tableName} (${columns.join(', ')}) VALUES ${placeholders}`, batch.flat());
    }
    async loadFromCSV(tableName, csvPath, columns) {
        await this.pool.query(`
      COPY ${tableName} (${columns.join(', ')})
      FROM '${csvPath}'
      WITH (FORMAT csv, HEADER true)
    `);
    }
}
exports.BulkLoader = BulkLoader;

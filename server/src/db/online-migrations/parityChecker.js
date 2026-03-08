"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.ParityChecker = void 0;
const state_js_1 = require("./state.js");
const metrics_js_1 = require("./metrics.js");
function buildColumnSelector(table, key, oldColumn, newColumn) {
    (0, state_js_1.assertIdentifier)(table, 'table');
    (0, state_js_1.assertIdentifier)(key, 'key column');
    (0, state_js_1.assertIdentifier)(oldColumn, 'old column');
    (0, state_js_1.assertIdentifier)(newColumn, 'new column');
    return `"${table}"."${key}" as key, "${table}"."${oldColumn}" as old_value, "${table}"."${newColumn}" as new_value`;
}
class ParityChecker {
    pool;
    constructor(pool) {
        this.pool = pool;
    }
    async checkColumnParity(options) {
        await (0, state_js_1.ensureOnlineMigrationTables)(this.pool);
        const sampleSize = options.sampleSize ?? 25;
        const selector = buildColumnSelector(options.table, options.keyColumn, options.oldColumn, options.newColumn);
        const whereClause = options.whereClause ? `WHERE ${options.whereClause}` : '';
        const sampleQuery = `
      SELECT ${selector}
      FROM "${options.table}"
      ${whereClause}
      ORDER BY random()
      LIMIT $1
    `;
        let result;
        try {
            result = await this.pool.query(sampleQuery, [sampleSize]);
        }
        catch (error) {
            const fallbackQuery = `
        SELECT ${selector}
        FROM "${options.table}"
        ${whereClause}
        ORDER BY "${options.keyColumn}"
        LIMIT $1
      `;
            result = await this.pool.query(fallbackQuery, [sampleSize]);
        }
        let mismatches = 0;
        for (const row of result.rows) {
            const parity = row.old_value === row.new_value;
            if (!parity) {
                mismatches += 1;
                metrics_js_1.parityMismatchCounter.inc({ migration: options.migrationKey });
            }
            await this.pool.query(`INSERT INTO ${state_js_1.ONLINE_MIGRATION_PARITY_SAMPLES} (migration_key, sample_key, parity, diff)
         VALUES ($1, $2, $3, $4)`, [
                options.migrationKey,
                String(row.key),
                parity,
                parity ? null : { old: row.old_value, new: row.new_value },
            ]);
            metrics_js_1.paritySamplesCounter.inc({ migration: options.migrationKey });
        }
        return { checked: result.rowCount, mismatches };
    }
}
exports.ParityChecker = ParityChecker;

"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.OnlineMigrationToolkit = void 0;
const backfillRunner_js_1 = require("./backfillRunner.js");
const dualWrite_js_1 = require("./dualWrite.js");
const parityChecker_js_1 = require("./parityChecker.js");
const state_js_1 = require("./state.js");
class OnlineMigrationToolkit {
    pool;
    constructor(pool) {
        this.pool = pool;
    }
    createBackfillRunner() {
        return new backfillRunner_js_1.BackfillRunner(this.pool);
    }
    createDualWriter(options) {
        return new dualWrite_js_1.DualWriter(this.pool, options);
    }
    createParityChecker() {
        return new parityChecker_js_1.ParityChecker(this.pool);
    }
    async ensureStateTables() {
        await (0, state_js_1.ensureOnlineMigrationTables)(this.pool);
    }
    async ensureTable(table, definition) {
        (0, state_js_1.assertIdentifier)(table, 'table');
        await (0, state_js_1.ensureOnlineMigrationTables)(this.pool);
        await this.pool.query(`CREATE TABLE IF NOT EXISTS "${table}" (${definition})`);
    }
    async ensureColumn(table, column, sqlType, defaultExpression) {
        (0, state_js_1.assertIdentifier)(table, 'table');
        (0, state_js_1.assertIdentifier)(column, 'column');
        await (0, state_js_1.ensureOnlineMigrationTables)(this.pool);
        const defaultClause = defaultExpression ? ` DEFAULT ${defaultExpression}` : '';
        await this.pool.query(`ALTER TABLE IF EXISTS "${table}"
         ADD COLUMN IF NOT EXISTS "${column}" ${sqlType}${defaultClause}`);
    }
    async markPhase(migrationKey, phase, metadata = {}) {
        await (0, state_js_1.ensureOnlineMigrationTables)(this.pool);
        const metadataValue = metadata ?? {};
        try {
            await this.pool.query(`INSERT INTO ${state_js_1.ONLINE_MIGRATION_RUNS} (migration_key, phase, metadata)
         VALUES ($1, $2, to_jsonb($3))
         ON CONFLICT (migration_key) DO UPDATE
           SET phase = EXCLUDED.phase,
               metadata = ${state_js_1.ONLINE_MIGRATION_RUNS}.metadata || EXCLUDED.metadata,
               updated_at = now()`, [migrationKey, phase, metadataValue]);
        }
        catch (error) {
            const metadataJson = typeof metadataValue === 'string'
                ? metadataValue
                : JSON.stringify(metadataValue ?? {}) || '{}';
            try {
                await this.pool.query(`INSERT INTO ${state_js_1.ONLINE_MIGRATION_RUNS} (migration_key, phase, metadata)
           VALUES ($1, $2, $3::jsonb)
           ON CONFLICT (migration_key) DO UPDATE
             SET phase = EXCLUDED.phase,
                 metadata = ${state_js_1.ONLINE_MIGRATION_RUNS}.metadata || EXCLUDED.metadata,
                 updated_at = now()`, [migrationKey, phase, metadataJson]);
            }
            catch {
                await this.pool.query(`INSERT INTO ${state_js_1.ONLINE_MIGRATION_RUNS} (migration_key, phase)
           VALUES ($1, $2)
           ON CONFLICT (migration_key) DO UPDATE
             SET phase = EXCLUDED.phase,
                 updated_at = now()`, [migrationKey, phase]);
            }
        }
    }
}
exports.OnlineMigrationToolkit = OnlineMigrationToolkit;

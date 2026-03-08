"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.USERS_DISPLAY_NAME_MIGRATION_KEY = void 0;
exports.buildDisplayNameDualWriter = buildDisplayNameDualWriter;
exports.runExampleDisplayNameMigration = runExampleDisplayNameMigration;
const backfillRunner_js_1 = require("./backfillRunner.js");
const parityChecker_js_1 = require("./parityChecker.js");
const toolkit_js_1 = require("./toolkit.js");
exports.USERS_DISPLAY_NAME_MIGRATION_KEY = 'users-display-name-canonical';
function buildDisplayNameDualWriter(pool) {
    const toolkit = new toolkit_js_1.OnlineMigrationToolkit(pool);
    return toolkit.createDualWriter({
        migrationKey: exports.USERS_DISPLAY_NAME_MIGRATION_KEY,
        operation: 'user_display_name',
        writePrimary: async (client, payload) => {
            await client.query(`UPDATE users SET display_name = $1 WHERE id = $2`, [
                payload.displayName,
                payload.userId,
            ]);
        },
        writeShadow: async (client, payload) => {
            await client.query(`UPDATE users SET display_name_canonical = $1 WHERE id = $2`, [payload.canonical ?? payload.displayName, payload.userId]);
        },
    });
}
async function runBackfill(pool) {
    const runner = new backfillRunner_js_1.BackfillRunner(pool);
    return runner.runJob({
        migrationKey: exports.USERS_DISPLAY_NAME_MIGRATION_KEY,
        jobName: 'copy_display_name',
        chunkSize: 250,
        throttleMs: 10,
        fetchBatch: async (client, cursor, limit) => {
            const offset = cursor ? Number(cursor) : 0;
            const [batch, total] = await Promise.all([
                client.query(`SELECT id, display_name FROM users ORDER BY created_at, id LIMIT $1 OFFSET $2`, [limit, offset]),
                offset === 0
                    ? client.query(`SELECT count(*)::int AS count FROM users`)
                    : Promise.resolve(null),
            ]);
            const totalRows = total && total.rowCount > 0 ? Number(total.rows[0].count ?? 0) : undefined;
            return {
                rows: batch.rows,
                totalRows,
                nextCursor: offset + batch.rows.length,
            };
        },
        processRow: async (client, row) => {
            await client.query(`UPDATE users SET display_name_canonical = $1 WHERE id = $2`, [
                row.display_name,
                row.id,
            ]);
        },
    });
}
async function checkParity(pool) {
    const parity = new parityChecker_js_1.ParityChecker(pool);
    return parity.checkColumnParity({
        migrationKey: exports.USERS_DISPLAY_NAME_MIGRATION_KEY,
        table: 'users',
        keyColumn: 'id',
        oldColumn: 'display_name',
        newColumn: 'display_name_canonical',
        sampleSize: 10,
    });
}
async function runExampleDisplayNameMigration(pool) {
    const toolkit = new toolkit_js_1.OnlineMigrationToolkit(pool);
    await toolkit.ensureStateTables();
    await toolkit.markPhase(exports.USERS_DISPLAY_NAME_MIGRATION_KEY, 'expand', {
        description: 'Add canonicalized display names to users',
    });
    await toolkit.ensureColumn('users', 'display_name_canonical', 'TEXT');
    await runBackfill(pool);
    const parityResult = await checkParity(pool);
    const nextPhase = parityResult.mismatches === 0 ? 'contract-ready' : 'validate';
    await toolkit.markPhase(exports.USERS_DISPLAY_NAME_MIGRATION_KEY, nextPhase, parityResult);
    return parityResult;
}

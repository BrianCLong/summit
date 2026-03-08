"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const globals_1 = require("@jest/globals");
const crypto_1 = require("crypto");
const pg_mem_1 = require("pg-mem");
const online_migrations_1 = require("../../src/db/online-migrations");
(0, globals_1.describe)('online migration example', () => {
    (0, globals_1.beforeEach)(() => {
        (0, online_migrations_1.resetMigrationMetrics)();
    });
    (0, globals_1.it)('runs expand/backfill/parity and marks contract-ready', async () => {
        const db = (0, pg_mem_1.newDb)({ noAstCoverageCheck: true });
        const { Pool } = db.adapters.createPg();
        const pool = new Pool();
        await pool.query(`
      CREATE TABLE users (
        id UUID PRIMARY KEY,
        display_name TEXT NOT NULL,
        display_name_canonical TEXT,
        created_at TIMESTAMPTZ DEFAULT now()
      )
    `);
        const writer = (0, online_migrations_1.buildDisplayNameDualWriter)(pool);
        const idOne = (0, crypto_1.randomUUID)();
        const idTwo = (0, crypto_1.randomUUID)();
        await pool.query(`INSERT INTO users (id, display_name, created_at) VALUES ($1, $2, now()), ($3, $4, now())`, [idOne, 'Initial User', idTwo, 'Second User']);
        await writer.write({ userId: idOne, displayName: 'Grace Hopper' });
        const parityResult = await (0, online_migrations_1.runExampleDisplayNameMigration)(pool);
        (0, globals_1.expect)(parityResult.mismatches).toBe(0);
        const stored = await pool.query(`SELECT display_name, display_name_canonical FROM users ORDER BY display_name`);
        (0, globals_1.expect)(stored.rows).toEqual(globals_1.expect.arrayContaining([
            { display_name: 'Grace Hopper', display_name_canonical: 'Grace Hopper' },
            { display_name: 'Second User', display_name_canonical: 'Second User' },
        ]));
        const phase = await pool.query(`SELECT phase, metadata FROM online_migration_runs WHERE migration_key = $1`, [online_migrations_1.USERS_DISPLAY_NAME_MIGRATION_KEY]);
        (0, globals_1.expect)(phase.rows[0].phase).toBe('contract-ready');
        const metadata = phase.rows[0].metadata || {};
        (0, globals_1.expect)(metadata.mismatches ?? metadata.parityResult?.mismatches ?? 0).toBe(0);
        const metrics = await online_migrations_1.migrationMetricsRegistry.metrics();
        (0, globals_1.expect)(metrics).toContain('online_migration_backfill_processed_total');
        (0, globals_1.expect)(metrics).toContain('online_migration_parity_samples_total');
        await pool.end();
    });
});

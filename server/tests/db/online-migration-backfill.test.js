"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const globals_1 = require("@jest/globals");
const pg_mem_1 = require("pg-mem");
const online_migrations_1 = require("../../src/db/online-migrations");
(0, globals_1.describe)('BackfillRunner', () => {
    (0, globals_1.beforeEach)(() => {
        (0, online_migrations_1.resetMigrationMetrics)();
    });
    (0, globals_1.it)('chunks batches, throttles, and supports pause/resume', async () => {
        const db = (0, pg_mem_1.newDb)({ noAstCoverageCheck: true });
        const { Pool } = db.adapters.createPg();
        const pool = new Pool();
        await pool.query(`
      CREATE TABLE users (
        id SERIAL PRIMARY KEY,
        display_name TEXT NOT NULL,
        display_name_canonical TEXT,
        created_at TIMESTAMPTZ DEFAULT now()
      )
    `);
        for (let i = 0; i < 5; i += 1) {
            await pool.query(`INSERT INTO users (display_name) VALUES ($1)`, [`User ${i + 1}`]);
        }
        const runner = new online_migrations_1.BackfillRunner(pool);
        let pauseAfterFirstBatch = false;
        const setTimeoutSpy = globals_1.jest.spyOn(global, 'setTimeout');
        const firstRun = await runner.runJob({
            migrationKey: 'backfill_test',
            jobName: 'display_name_backfill',
            chunkSize: 2,
            throttleMs: 10,
            fetchBatch: async (client, cursor, limit) => {
                const offset = Number(cursor ?? 0);
                const result = await client.query(`SELECT id, display_name FROM users ORDER BY id LIMIT $1 OFFSET $2`, [limit, offset]);
                const total = offset === 0
                    ? await client.query(`SELECT count(*)::int as count FROM users`)
                    : null;
                pauseAfterFirstBatch = offset === 0;
                return {
                    rows: result.rows,
                    totalRows: total ? Number(total.rows[0].count) : undefined,
                    nextCursor: offset + result.rowCount,
                };
            },
            processRow: async (client, row) => {
                await client.query(`UPDATE users SET display_name_canonical = display_name WHERE id = $1`, [row.id]);
            },
            pauseSignal: () => pauseAfterFirstBatch,
        });
        (0, globals_1.expect)(firstRun.status).toBe('paused');
        (0, globals_1.expect)(firstRun.processedRows).toBe(2);
        pauseAfterFirstBatch = false;
        const resumed = await runner.resumeJob({
            migrationKey: 'backfill_test',
            jobName: 'display_name_backfill',
            chunkSize: 2,
            throttleMs: 10,
            fetchBatch: async (client, cursor, limit) => {
                const offset = Number(cursor ?? 0);
                const result = await client.query(`SELECT id, display_name FROM users ORDER BY id LIMIT $1 OFFSET $2`, [limit, offset]);
                return {
                    rows: result.rows,
                    nextCursor: offset + result.rowCount,
                };
            },
            processRow: async (client, row) => {
                await client.query(`UPDATE users SET display_name_canonical = display_name WHERE id = $1`, [row.id]);
            },
        });
        (0, globals_1.expect)(resumed.status).toBe('completed');
        (0, globals_1.expect)(resumed.processedRows).toBe(5);
        const filled = await pool.query(`SELECT count(*)::int as count FROM users WHERE display_name_canonical IS NOT NULL`);
        (0, globals_1.expect)(Number(filled.rows[0].count)).toBe(5);
        (0, globals_1.expect)(setTimeoutSpy).toHaveBeenCalledWith(globals_1.expect.any(Function), 10);
        setTimeoutSpy.mockRestore();
        await pool.end();
    });
});

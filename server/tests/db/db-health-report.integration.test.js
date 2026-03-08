"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const globals_1 = require("@jest/globals");
const pg_1 = require("pg");
const dbHealth_1 = require("../../src/db/dbHealth");
(0, globals_1.describe)('db health report (integration)', () => {
    let pool = null;
    let available = false;
    (0, globals_1.beforeAll)(async () => {
        if (!process.env.DATABASE_URL) {
            return;
        }
        pool = new pg_1.Pool({ connectionString: process.env.DATABASE_URL });
        try {
            await pool.query('SELECT 1');
            available = true;
        }
        catch (error) {
            console.warn(`Skipping db health integration test; could not connect to ${process.env.DATABASE_URL}: ${error.message}`);
        }
    });
    (0, globals_1.afterAll)(async () => {
        await pool?.end();
    });
    const maybeIt = available ? globals_1.it : globals_1.it.skip;
    maybeIt('runs with read-only queries and no extension requirement', async () => {
        if (!pool)
            return;
        const report = await (0, dbHealth_1.generateDbHealthReport)({
            pool: pool,
            useExtensions: false,
            limit: 3,
        });
        (0, globals_1.expect)(report.usedPgstattuple).toBe(false);
        (0, globals_1.expect)(report.bloat.tables).toBeDefined();
        (0, globals_1.expect)(report.recommendations.targetedActions.length).toBeGreaterThanOrEqual(0);
    });
});

#!/usr/bin/env ts-node
"use strict";
// Backfill read models for case dashboard metrics (READ_MODELS_V1)
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const postgres_js_1 = require("../src/db/postgres.js");
const logger_js_1 = __importDefault(require("../src/config/logger.js"));
async function main() {
    const pool = (0, postgres_js_1.getPostgresPool)();
    const log = logger_js_1.default.child({ name: 'backfill-case-read-models' });
    try {
        const started = Date.now();
        const { rows } = await pool.query(`SELECT maestro.backfill_case_dashboard_read_models()`);
        const processed = rows?.[0]?.backfill_case_dashboard_read_models ?? 0;
        const durationMs = Date.now() - started;
        log.info({ processed, durationMs }, 'Read model backfill completed for case dashboard');
    }
    catch (error) {
        log.error({ error }, 'Failed to backfill case dashboard read models');
        process.exitCode = 1;
    }
    finally {
        await pool.end();
    }
}
main();

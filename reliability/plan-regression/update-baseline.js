#!/usr/bin/env node
"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const promises_1 = require("node:fs/promises");
const node_path_1 = __importDefault(require("node:path"));
const node_url_1 = require("node:url");
const pg_1 = require("pg");
const critical_queries_1 = require("./critical-queries");
const plan_regression_1 = require("./plan-regression");
const __dirname = (0, node_url_1.fileURLToPath)(new URL('.', import.meta.url));
const seedFile = node_path_1.default.join(__dirname, 'seed.sql');
async function seedDataset(pool) {
    const sql = await (0, promises_1.readFile)(seedFile, 'utf8');
    await pool.query(sql);
}
async function refreshBaseline() {
    const connectionString = process.env.PLAN_REGRESSION_DATABASE_URL || process.env.DATABASE_URL;
    if (!connectionString) {
        throw new Error('PLAN_REGRESSION_DATABASE_URL or DATABASE_URL must be set to refresh the plan baseline');
    }
    const stage = process.env.PLAN_REGRESSION_ENV || process.env.NODE_ENV || 'development';
    if (['prod', 'production'].includes(stage.toLowerCase())) {
        throw new Error('Refusing to update plan baselines against production');
    }
    const analyze = process.env.PLAN_REGRESSION_ANALYZE === 'true';
    const shouldSeed = process.env.PLAN_REGRESSION_SKIP_SEED !== 'true' &&
        process.env.PLAN_REGRESSION_SKIP_SEED !== '1';
    const pool = new pg_1.Pool({ connectionString });
    try {
        if (shouldSeed) {
            await seedDataset(pool);
        }
        const queries = await Promise.all(critical_queries_1.criticalQueries.map(async (query) => {
            const explainPrefix = analyze
                ? 'EXPLAIN (ANALYZE, BUFFERS, FORMAT JSON)'
                : 'EXPLAIN (FORMAT JSON)';
            const { rows } = await pool.query(`${explainPrefix} ${query.sql}`);
            const signature = (0, plan_regression_1.collectPlanSignature)(rows[0]['QUERY PLAN']);
            return {
                id: query.id,
                description: query.description,
                sql: query.sql.replace(/\s+/g, ' ').trim(),
                sqlHash: (0, plan_regression_1.hashSql)(query.sql),
                signature,
            };
        }));
        const baseline = {
            generatedAt: new Date().toISOString(),
            analyze,
            queries,
        };
        await (0, promises_1.writeFile)(plan_regression_1.DEFAULT_BASELINE_PATH, `${JSON.stringify(baseline, null, 2)}\n`, 'utf8');
        // eslint-disable-next-line no-console
        console.log(`✅ Updated ${plan_regression_1.DEFAULT_BASELINE_PATH} with ${queries.length} query plans`);
    }
    finally {
        await pool.end();
    }
}
refreshBaseline().catch((error) => {
    // eslint-disable-next-line no-console
    console.error('Failed to refresh plan regression baseline', error);
    process.exitCode = 1;
});

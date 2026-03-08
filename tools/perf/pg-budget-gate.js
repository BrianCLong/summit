#!/usr/bin/env node
"use strict";
/**
 * pg-budget-gate
 *
 * Usage:
 *   pnpm dlx ts-node tools/perf/pg-budget-gate.ts --stats perf/pg_stat_statements.json
 *   pnpm dlx ts-node tools/perf/pg-budget-gate.ts --pg-url postgres://user:pass@localhost:5432/db
 *
 * Flags:
 *   --budgets <path>   Path to budget file (default: perf/query-budgets.json)
 *   --stats <path>     Path to pg_stat_statements JSON fixture (optional)
 *   --pg-url <url>     Postgres connection string (optional)
 *   --allow-missing-extension  Exit 0 when pg_stat_statements is not installed.
 */
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const fs_1 = __importDefault(require("fs"));
const path_1 = __importDefault(require("path"));
const pg_1 = require("pg");
const pgStatBudgeter_1 = require("../../packages/slow-query-killer/src/pgStatBudgeter");
function parseArgs() {
    const getArg = (flag) => {
        const idx = process.argv.indexOf(flag);
        if (idx >= 0 && process.argv[idx + 1]) {
            return process.argv[idx + 1];
        }
        return undefined;
    };
    return {
        budgetsPath: getArg('--budgets') ?? 'perf/query-budgets.json',
        statsPath: getArg('--stats'),
        pgUrl: getArg('--pg-url'),
        allowMissingExtension: process.argv.includes('--allow-missing-extension'),
    };
}
function loadBudgets(budgetsPath) {
    const absolute = path_1.default.resolve(budgetsPath);
    const payload = fs_1.default.readFileSync(absolute, 'utf8');
    return JSON.parse(payload);
}
function loadStatsFromFile(statsPath) {
    const absolute = path_1.default.resolve(statsPath);
    const payload = fs_1.default.readFileSync(absolute, 'utf8');
    return JSON.parse(payload);
}
async function loadStatsFromDatabase(pgUrl) {
    const client = new pg_1.Client({ connectionString: pgUrl });
    await client.connect();
    const extensionAvailable = await (0, pgStatBudgeter_1.pgStatStatementsAvailable)(client);
    if (!extensionAvailable) {
        await client.end();
        const error = new Error('pg_stat_statements extension is not installed');
        error.code = 'PGSTAT_MISSING';
        throw error;
    }
    const { rows } = await client.query(`
    SELECT
      query,
      mean_exec_time,
      total_exec_time,
      calls
    FROM pg_stat_statements
    WHERE calls > 0
    ORDER BY total_exec_time DESC
  `);
    await client.end();
    return rows;
}
function handleResult(result) {
    const report = (0, pgStatBudgeter_1.formatBudgetDiff)(result);
    console.log(report);
    if (result.violations.length) {
        process.exitCode = 1;
    }
}
async function main() {
    const args = parseArgs();
    const budgets = loadBudgets(args.budgetsPath);
    let stats;
    if (args.statsPath) {
        stats = loadStatsFromFile(args.statsPath);
    }
    else if (args.pgUrl) {
        try {
            stats = await loadStatsFromDatabase(args.pgUrl);
        }
        catch (error) {
            if (error.code === 'PGSTAT_MISSING' && args.allowMissingExtension) {
                console.warn('pg_stat_statements missing; skipping gate because feature is optional.');
                return;
            }
            console.error('Failed to load pg_stat_statements data:', error);
            process.exit(1);
            return;
        }
    }
    else {
        throw new Error('Provide --stats fixture path or --pg-url for live evaluation.');
    }
    const evaluation = (0, pgStatBudgeter_1.evaluateBudgets)(stats, budgets);
    handleResult(evaluation);
}
main().catch((error) => {
    console.error(error);
    process.exit(1);
});

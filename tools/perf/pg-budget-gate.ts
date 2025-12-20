#!/usr/bin/env node
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

import fs from 'fs';
import path from 'path';
import { Client } from 'pg';
import {
  BudgetEvaluationResult,
  PgStatStatementRow,
  QueryBudgetFile,
  evaluateBudgets,
  formatBudgetDiff,
  pgStatStatementsAvailable,
} from '../../packages/slow-query-killer/src/pgStatBudgeter';

interface CliArgs {
  budgetsPath: string;
  statsPath?: string;
  pgUrl?: string;
  allowMissingExtension: boolean;
}

function parseArgs(): CliArgs {
  const getArg = (flag: string): string | undefined => {
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

function loadBudgets(budgetsPath: string): QueryBudgetFile {
  const absolute = path.resolve(budgetsPath);
  const payload = fs.readFileSync(absolute, 'utf8');
  return JSON.parse(payload) as QueryBudgetFile;
}

function loadStatsFromFile(statsPath: string): PgStatStatementRow[] {
  const absolute = path.resolve(statsPath);
  const payload = fs.readFileSync(absolute, 'utf8');
  return JSON.parse(payload) as PgStatStatementRow[];
}

async function loadStatsFromDatabase(pgUrl: string): Promise<PgStatStatementRow[]> {
  const client = new Client({ connectionString: pgUrl });
  await client.connect();

  const extensionAvailable = await pgStatStatementsAvailable(client);

  if (!extensionAvailable) {
    await client.end();
    const error = new Error('pg_stat_statements extension is not installed');
    (error as any).code = 'PGSTAT_MISSING';
    throw error;
  }

  const { rows } = await client.query<PgStatStatementRow>(`
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

function handleResult(result: BudgetEvaluationResult): void {
  const report = formatBudgetDiff(result);
  console.log(report);

  if (result.violations.length) {
    process.exitCode = 1;
  }
}

async function main(): Promise<void> {
  const args = parseArgs();
  const budgets = loadBudgets(args.budgetsPath);

  let stats: PgStatStatementRow[];

  if (args.statsPath) {
    stats = loadStatsFromFile(args.statsPath);
  } else if (args.pgUrl) {
    try {
      stats = await loadStatsFromDatabase(args.pgUrl);
    } catch (error) {
      if ((error as any).code === 'PGSTAT_MISSING' && args.allowMissingExtension) {
        console.warn('pg_stat_statements missing; skipping gate because feature is optional.');
        return;
      }

      console.error('Failed to load pg_stat_statements data:', error);
      process.exit(1);
      return;
    }
  } else {
    throw new Error('Provide --stats fixture path or --pg-url for live evaluation.');
  }

  const evaluation = evaluateBudgets(stats, budgets);
  handleResult(evaluation);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});

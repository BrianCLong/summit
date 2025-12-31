#!/usr/bin/env -S node --loader ts-node/esm
import fs from 'node:fs';
import path from 'node:path';

interface UsageEntry {
  timestamp: string;
  vendor: string;
  model: string;
  inputTokens: number;
  outputTokens: number;
  cost: number;
  currency: string;
  feature?: string;
  tenantId?: string;
  environment?: string;
}

const DEFAULT_LOG_PATH = process.env.LLM_USAGE_LOG_PATH || 'logs/llm-usage.ndjson';

function loadEntries(logPath: string): UsageEntry[] {
  if (!fs.existsSync(logPath)) {
    console.warn(`No usage log found at ${logPath}`);
    return [];
  }

  const raw = fs.readFileSync(logPath, 'utf8');
  const lines = raw
    .split('\n')
    .map(line => line.trim())
    .filter(Boolean);

  return lines
    .map(line => {
      try {
        return JSON.parse(line) as UsageEntry;
      } catch (err) {
        console.warn('Skipping malformed line in log:', err);
        return null;
      }
    })
    .filter((entry): entry is UsageEntry => Boolean(entry));
}

function aggregate(entries: UsageEntry[], key: (entry: UsageEntry) => string) {
  const totals: Record<string, { cost: number; tokens: number; calls: number }> = {};

  for (const entry of entries) {
    const bucket = key(entry) || 'unspecified';
    if (!totals[bucket]) {
      totals[bucket] = { cost: 0, tokens: 0, calls: 0 };
    }
    totals[bucket].cost += entry.cost;
    totals[bucket].tokens += entry.inputTokens + entry.outputTokens;
    totals[bucket].calls += 1;
  }

  return totals;
}

function printSection(title: string, totals: Record<string, { cost: number; tokens: number; calls: number }>) {
  console.log(`\n${title}`);
  console.log('---------------------------');
  const entries = Object.entries(totals);
  if (!entries.length) {
    console.log('No data available.');
    return;
  }

  for (const [bucket, stats] of entries) {
    console.log(
      `${bucket}: cost=$${stats.cost.toFixed(4)} tokens=${stats.tokens} calls=${stats.calls}`,
    );
  }
}

function main() {
  const logPathArgIndex = process.argv.findIndex(arg => arg === '--log');
  const logPath =
    logPathArgIndex !== -1 && process.argv[logPathArgIndex + 1]
      ? process.argv[logPathArgIndex + 1]
      : DEFAULT_LOG_PATH;

  const resolvedLogPath = path.resolve(logPath);
  const entries = loadEntries(resolvedLogPath);

  console.log(`Reading LLM usage from ${resolvedLogPath}`);
  printSection('Cost by provider', aggregate(entries, entry => entry.vendor));
  printSection('Cost by feature', aggregate(entries, entry => entry.feature || 'unspecified'));
  printSection('Cost by tenant', aggregate(entries, entry => entry.tenantId || 'multi-tenant'));
}

main();

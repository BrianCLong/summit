#!/usr/bin/env node

import { DbObservabilityService, EXPLAIN_WHITELIST } from '../observability/db-observability.js';

function parseParams(raw: string | undefined): Record<string, string | number> | undefined {
  if (!raw) return undefined;
  return raw.split(',').reduce<Record<string, string | number>>((acc, pair) => {
    const [key, value] = pair.split('=');
    if (!key) return acc;
    const trimmed = key.trim();
    if (!trimmed) return acc;
    const num = Number(value);
    acc[trimmed] = Number.isNaN(num) ? value : num;
    return acc;
  }, {});
}

async function main() {
  const [, , ...args] = process.argv;

  if (process.env.DB_OBSERVABILITY_V2 !== '1') {
    console.error('DB_OBSERVABILITY_V2 is not enabled. Set it to 1 to use this CLI.');
    process.exit(1);
  }

  if (args.includes('--help') || args.includes('-h')) {
    console.log(`
DB Observability v2 CLI

Usage:
  cd server && pnpm db:observability -- --explain=<queryId> --params=key=value,...
  cd server && pnpm db:observability -- --list

Flags:
  --list                  List whitelisted explain query IDs
  --explain=<queryId>     Run EXPLAIN (FORMAT JSON) for a whitelisted query
  --params=key=value      Comma-separated parameters for the explain template
`);
    process.exit(0);
  }

  if (args.includes('--list')) {
    console.log('Whitelisted explainable queries:');
    Object.entries(EXPLAIN_WHITELIST).forEach(([key, value]) => {
      console.log(`- ${key}: ${value.description}`);
    });
    process.exit(0);
  }

  const explainArg = args.find((arg) => arg.startsWith('--explain='));
  const paramsArg = args.find((arg) => arg.startsWith('--params='));

  const explainRequest = explainArg
    ? {
        queryId: explainArg.split('=')[1],
        parameters: parseParams(paramsArg?.split('=')[1]),
      }
    : undefined;

  const service = new DbObservabilityService();
  const snapshot = await service.snapshot(
    explainRequest ? { explain: explainRequest } : {},
    { userId: 'cli-admin', tenantId: 'system', requestId: 'db-observability-cli' },
  );

  console.log('=== Human-readable summary ===');
  console.log(`Locks   : ${snapshot.summary.locks}`);
  console.log(`Slow SQL: ${snapshot.summary.slowQueries}`);
  if (snapshot.summary.explain) {
    console.log(`Explain : ${snapshot.summary.explain}`);
  }
  console.log('\n=== Machine-readable JSON ===');
  console.log(JSON.stringify(snapshot, null, 2));
}

main().catch((err: any) => {
  console.error(err);
  process.exit(1);
});

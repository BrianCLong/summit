#!/usr/bin/env node
import { execFileSync } from 'node:child_process';
import { mkdirSync, writeFileSync } from 'node:fs';

const requiredEnv = [
  'PG_DIGEST_SQL',
  'NEO4J_DIGEST_CYPHER',
  'NEO4J_USER',
  'NEO4J_PASS',
];

const missing = requiredEnv.filter((key) => !process.env[key]);
if (missing.length > 0) {
  console.error(`Missing required env vars: ${missing.join(', ')}`);
  process.exit(2);
}

const run = (cmd, args, env = {}) =>
  execFileSync(cmd, args, {
    stdio: ['ignore', 'pipe', 'pipe'],
    env: { ...process.env, ...env },
  })
    .toString()
    .trim();

const pgDigest = run('psql', ['-tAc', process.env.PG_DIGEST_SQL]);
const neoDigest = run('cypher-shell', [
  '-u',
  process.env.NEO4J_USER,
  '-p',
  process.env.NEO4J_PASS,
  process.env.NEO4J_DIGEST_CYPHER,
]);

const ok = pgDigest === neoDigest;
const evidence = {
  schema_version: '1.0',
  comparison: 'postgres_vs_neo4j',
  postgres: { run_digest: pgDigest },
  neo4j: { run_digest: neoDigest },
  passed: ok,
  generated_by: 'scripts/ci/compare_digests.mjs',
};

mkdirSync('artifacts', { recursive: true });

if (!ok) {
  evidence.delta = [
    { field: 'run_digest', expected: pgDigest, actual: neoDigest },
  ];
  writeFileSync('artifacts/evidence_delta.json', JSON.stringify(evidence, null, 2));
  console.error('Run digests differ. See artifacts/evidence_delta.json');
  process.exit(1);
}

writeFileSync('artifacts/evidence_delta.json', JSON.stringify(evidence, null, 2));
console.log('Digests match:', pgDigest);

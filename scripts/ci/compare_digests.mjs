import { execFileSync } from 'node:child_process';
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname } from 'node:path';
import { buildEvidence, extractHexDigest } from './compare_digests_lib.mjs';

const PG_SQL_PATH =
  process.env.PG_DIGEST_SQL_FILE || 'db/consistency/entities-digest.sql';
const NEO_CYPHER_PATH =
  process.env.NEO4J_DIGEST_CYPHER_FILE ||
  'graph/consistency/entities-digest.cypher';

const EVIDENCE_PATH =
  process.env.DATA_CONSISTENCY_EVIDENCE_PATH ||
  'artifacts/evidence/data_consistency/evidence_delta.json';

const PROJECTION_NAME = process.env.DIGEST_PROJECTION || 'entities_v1';

const neo4jUri = process.env.NEO4J_URI || 'bolt://localhost:7687';
const neo4jUser = process.env.NEO4J_USER;
const neo4jPass = process.env.NEO4J_PASS;

if (!neo4jUser || !neo4jPass) {
  throw new Error(
    'NEO4J_USER and NEO4J_PASS must be set for data consistency checks.'
  );
}

const runCommand = (command, args, label) => {
  try {
    return execFileSync(command, args, {
      stdio: ['ignore', 'pipe', 'pipe'],
      env: process.env,
    }).toString();
  } catch (error) {
    throw new Error(`${label} command failed.`);
  }
};

const pgDigest = extractHexDigest(
  runCommand('psql', ['-v', 'ON_ERROR_STOP=1', '-tA', '-f', PG_SQL_PATH], 'psql')
);

const neoDigest = extractHexDigest(
  runCommand(
    'cypher-shell',
    [
      '-a',
      neo4jUri,
      '-u',
      neo4jUser,
      '-p',
      neo4jPass,
      '--format',
      'plain',
      '--non-interactive',
      '-f',
      NEO_CYPHER_PATH,
    ],
    'cypher-shell'
  )
);

const evidence = buildEvidence({
  pgDigest,
  neoDigest,
  projection: PROJECTION_NAME,
});

mkdirSync(dirname(EVIDENCE_PATH), { recursive: true });
writeFileSync(EVIDENCE_PATH, `${JSON.stringify(evidence, null, 2)}\n`);

if (!evidence.passed) {
  process.exit(1);
}

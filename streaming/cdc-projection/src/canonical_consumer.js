import readline from 'node:readline';
import crypto from 'node:crypto';
import { upsertToPostgres } from './targets/postgres.js';
import { mergeToNeo4j } from './targets/neo4j.js';

/**
 * Computes a deterministic evidence ID based on the source commit and projection name.
 */
const EVID = (commit, proj) =>
  `sha256:${crypto.createHash('sha256').update(`${commit}@projection:${proj}`).digest('hex')}`;

const COMMIT_SHA = process.env.SOURCE_COMMIT || 'unknown';
const PROJECTION_NAME = process.env.PROJECTION_NAME || 'default-projection';
const SCHEMA_VERSION = parseInt(process.env.SCHEMA_VERSION || '1', 10);

const rl = readline.createInterface({ input: process.stdin });

/**
 * Normalizes a change message into a canonical envelope.
 * Supports both wal2json ('kind') and pgoutput-like ('op') formats.
 */
function toCanonical(change, msgMetadata) {
  const { table, schema, columnnames, columnvalues, oldkeys } = change;

  // wal2json uses 'kind', some others use 'op'
  const rawOp = (change.kind || change.op || 'u').toLowerCase();

  // Mapping to the requested canonical 'c|u|d'
  const opMap = {
    'insert': 'c',
    'i': 'c',
    'update': 'u',
    'u': 'u',
    'delete': 'd',
    'd': 'd'
  };
  const op_type = opMap[rawOp] || 'u';

  // Construct a stable, deterministic source_id.
  let pkValue = 'unknown';
  if (columnvalues && columnvalues.length > 0) {
    pkValue = columnvalues[0];
  } else if (oldkeys && oldkeys.keyvalues && oldkeys.keyvalues.length > 0) {
    pkValue = oldkeys.keyvalues[0];
  }

  const source_id = `pg://${process.env.PGHOST || 'localhost'}/${process.env.PGDATABASE || 'db'}/${schema}.${table}/PK:${pkValue}`;

  const before = oldkeys ? Object.fromEntries(oldkeys.keynames.map((name, i) => [name, oldkeys.keyvalues[i]])) : null;
  const after = columnnames ? Object.fromEntries(columnnames.map((name, i) => [name, columnvalues[i]])) : null;

  return {
    source_id,
    schema_version: SCHEMA_VERSION,
    op_type,
    ts_source: msgMetadata.timestamp || new Date().toISOString(),
    commit_lsn: msgMetadata.nextlsn || 'unknown',
    before,
    after,
    evidence_id: EVID(COMMIT_SHA, PROJECTION_NAME),
  };
}

rl.on('line', async (line) => {
  try {
    const msg = JSON.parse(line);
    if (!msg.change) return;

    for (const change of msg.change) {
      const evt = toCanonical(change, {
        timestamp: msg.timestamp,
        nextlsn: msg.nextlsn
      });

      await applyEvent(evt);
    }
  } catch (err) {
    console.error('Failed to process line:', err);
  }
});

async function applyEvent(e) {
  console.log(`Applying ${e.op_type} for ${e.source_id} (Evidence: ${e.evidence_id})`);

  try {
    await Promise.all([
      upsertToPostgres(e),
      mergeToNeo4j(e)
    ]);
  } catch (err) {
    console.error(`Error applying event ${e.source_id}:`, err);
  }
}

console.log(`Canonical Consumer started for projection: ${PROJECTION_NAME}`);

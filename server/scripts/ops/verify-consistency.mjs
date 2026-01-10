#!/usr/bin/env node
/* eslint-disable no-console */
// Quick consistency verifier: ProvenanceLedgerV2 (PG) vs CanonicalGraph (Neo4j)
// Checks if all ledger entries are correctly projected to the graph.
// Groups by hour to form "batches".
// Assumes: NODE_ENV=production|staging, PG/NEO4J env vars present.
// Exit code: 0 = clean, 2 = diffs found, 3 = runtime error.

import crypto from 'node:crypto';
import process from 'node:process';

import pg from 'pg';
import neo4j from 'neo4j-driver';

// ---------- config ----------
const {
  PGHOST, PGPORT = '5432', PGDATABASE, PGUSER, PGPASSWORD,
  NEO4J_URI, NEO4J_USER, NEO4J_PASSWORD,
  TENANT_ID, // optional: scope to a single tenant
  BATCH_SINCE, // ISO timestamp for lower bound
  BATCH_UNTIL, // optional upper bound
} = process.env;

const REQUIRED = ['PGHOST','PGDATABASE','PGUSER','PGPASSWORD','NEO4J_URI','NEO4J_USER','NEO4J_PASSWORD'];
for (const k of REQUIRED) if (!process.env[k]) { console.error(`Missing ${k}`); process.exit(3); }

const pgClient = new pg.Client({
  host: PGHOST, port: +PGPORT, database: PGDATABASE, user: PGUSER, password: PGPASSWORD,
  statement_timeout: 45_000, application_name: 'verify-consistency'
});
const n4j = neo4j.driver(NEO4J_URI, neo4j.auth.basic(NEO4J_USER, NEO4J_PASSWORD), { disableLosslessIntegers: true });

// ---------- queries ----------
// ProvenanceLedgerV2 is the source of truth.
// We group by hour to create logical batches for comparison.
const qPgBatches = `
  SELECT
         to_char(date_trunc('hour', timestamp), 'YYYY-MM-DD"T"HH24:MI:SS"Z"') as batch_id,
         MIN(timestamp) AS since,
         MAX(timestamp) AS until,
         COUNT(*) AS pg_count,
         -- Stable, order‑insensitive checksum for all entries in the hour (per tenant)
         ENCODE(
           DIGEST(
             STRING_AGG(
               (tenant_id || '|' || id || '|' || current_hash),
               '\n' ORDER BY tenant_id, id
             ),
             'sha256'
           ),
           'hex'
         ) AS pg_checksum
  FROM provenance_ledger_v2
  WHERE ($1::timestamptz IS NULL OR timestamp >= $1)
    AND ($2::timestamptz IS NULL OR timestamp <  $2)
    AND ($3::text IS NULL OR tenant_id = $3)
  GROUP BY 1
  ORDER BY 1 ASC;
`;

// Neo4j: reconstruct the same materialization surface (CanonicalNodes from the ledger)
// Updated to order rows before collection to ensure deterministic checksum without apoc.coll.sortNodes
const qNeoBatches = `
  MATCH (n:CanonicalNode)
  WHERE exists(n.sourceEntryId)
    AND ($since IS NULL OR datetime(n.timestamp) >= datetime($since))
    AND ($until IS NULL OR datetime(n.timestamp) <  datetime($until))
    AND ($tenant IS NULL OR n.tenantId = $tenant)
  WITH n
  ORDER BY n.tenantId, n.sourceEntryId, n.hash
  WITH
       date.truncate('hour', datetime(n.timestamp)) AS batch_dt,
       {
         t: n.tenantId,
         id: n.sourceEntryId,
         h: n.hash
       } AS row_data
  WITH batch_dt, collect(row_data) AS rows
  RETURN
         toString(batch_dt) as batch_id,
         size(rows) AS neo_count,
         apoc.util.sha256(
           apoc.text.join([x IN rows
             | x.t + '|' + x.id + '|' + x.h
           ], '\n')
         ) AS neo_checksum
  ORDER BY batch_id ASC;
`;

function rowKey(r){ return `${r.batch_id}`; }

(async () => {
  const start = Date.now();
  try {
    await pgClient.connect();
    // Verify pgcrypto extension exists (implied by user script but good to check or fail fast)
    // The query itself will fail if DIGEST is missing, which is caught by catch block.

    const pgRes = await pgClient.query(qPgBatches, [BATCH_SINCE || null, BATCH_UNTIL || null, TENANT_ID || null]);

    const s = n4j.session();
    const neoRes = await s.run(qNeoBatches, {
      since: BATCH_SINCE || null, until: BATCH_UNTIL || null, tenant: TENANT_ID || null
    });
    await s.close();

    const pgByBatch = new Map(pgRes.rows.map(r => [rowKey(r), r]));
    const neoByBatch = new Map(neoRes.records.map(rec => [String(rec.get('batch_id')), {
      batch_id: String(rec.get('batch_id')),
      neo_count: rec.get('neo_count'),
      neo_checksum: rec.get('neo_checksum'),
    }]));

    const diffs = [];
    const allKeys = new Set([...pgByBatch.keys(), ...neoByBatch.keys()]);
    for (const k of allKeys) {
      const pr = pgByBatch.get(k);
      const nr = neoByBatch.get(k);

      if (!pr || !nr) {
        diffs.push({ batch_id: k, kind: !pr ? 'missing_in_pg' : 'missing_in_neo', pg: pr || null, neo: nr || null });
        continue;
      }

      if (String(pr.pg_checksum) !== String(nr.neo_checksum)) {
        diffs.push({
          batch_id: k,
          kind: 'checksum_mismatch',
          pg_checksum: pr.pg_checksum,
          neo_checksum: nr.neo_checksum,
          pg_count: pr.pg_count,
          neo_count: nr.neo_count,
          since: pr.since,
          until: pr.until
        });
      } else if (Number(pr.pg_count) !== Number(nr.neo_count)) {
        diffs.push({
          batch_id: k,
          kind: 'count_mismatch',
          pg_count: pr.pg_count,
          neo_count: nr.neo_count
        });
      }
    }

    if (diffs.length === 0) {
      console.log(JSON.stringify({ ok: true, batches: pgRes.rowCount, duration_ms: Date.now() - start }, null, 2));
      process.exit(0);
    } else {
      console.error(JSON.stringify({ ok: false, diffs, duration_ms: Date.now() - start }, null, 2));
      process.exit(2);
    }
  } catch (err) {
    console.error(JSON.stringify({ ok: false, error: err.message, stack: err.stack }, null, 2));
    process.exit(3);
  } finally {
    await pgClient.end().catch(()=>{});
    await n4j.close().catch(()=>{});
  }
})();

import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { Client } from 'pg';

const outputDir = process.env.PG_DELTAS_DIR ?? 'pg_deltas';
const dateStamp = process.env.DELTA_WINDOW ?? new Date().toISOString().slice(0, 10);
const outputPath = path.join(outputDir, `${dateStamp}.jsonl`);

const pgUrl = process.env.PG_URL ?? process.env.DATABASE_URL;
if (!pgUrl) {
  throw new Error('PG_URL or DATABASE_URL must be set to export Postgres deltas.');
}

const lastRun = process.env.LAST_RUN ?? new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
const thisRun = process.env.THIS_RUN ?? new Date().toISOString();

const defaultQuery = `
  SELECT
    'node' AS kind,
    tenant_id,
    uuid,
    type,
    version,
    provenance_id,
    evidence_id,
    payload,
    event_time
  FROM entity_events
  WHERE event_time > $1 AND event_time <= $2
  UNION ALL
  SELECT
    'edge' AS kind,
    tenant_id,
    uuid,
    type,
    version,
    provenance_id,
    evidence_id,
    payload,
    event_time
  FROM edge_events
  WHERE event_time > $1 AND event_time <= $2
  ORDER BY event_time ASC
`;

const query = process.env.PG_DELTA_QUERY ?? defaultQuery;

const client = new Client({ connectionString: pgUrl });
await client.connect();

const stream = fs.createWriteStream(outputPath, { encoding: 'utf8' });

try {
  fs.mkdirSync(outputDir, { recursive: true });
  const result = await client.query(query, [lastRun, thisRun]);

  for (const row of result.rows) {
    const evidenceIds = Array.isArray(row.evidence_ids)
      ? row.evidence_ids
      : row.evidence_id
        ? [row.evidence_id]
        : [];

    stream.write(
      `${JSON.stringify({
        ...row,
        evidence_ids: evidenceIds,
        extracted_at: new Date().toISOString(),
        host: os.hostname(),
      })}\n`,
    );
  }
} finally {
  await client.end();
  stream.end();
}

console.log(`Postgres deltas written to ${outputPath}`);

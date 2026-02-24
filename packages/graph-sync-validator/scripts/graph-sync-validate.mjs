#!/usr/bin/env node
import { spawnSync } from 'node:child_process';
import fs from 'node:fs/promises';
import path from 'node:path';
import { compare } from '../src/compare/compare.mjs';
import { writeArtifacts } from '../src/io/writeArtifacts.mjs';

const outDir = process.env.GRAPH_SYNC_OUT_DIR || 'artifacts/graph-sync';
const maxLag = Number(process.env.GRAPH_SYNC_MAX_LAG || '0.001');

const pgHost = process.env.PGHOST || 'localhost';
const pgPort = process.env.PGPORT || '5432';
const pgUser = process.env.PGUSER || 'postgres';
const pgPassword = process.env.PGPASSWORD || 'postgres';
const pgDatabase = process.env.PGDATABASE || 'postgres';
const pgDsn = process.env.PG_DSN || null;

const neo4jUri = process.env.NEO4J_URI || 'bolt://localhost:7687';
const neo4jUser = process.env.NEO4J_USER || 'neo4j';
const neo4jPassword = process.env.NEO4J_PASSWORD || process.env.NEO4J_PASS || 'test1234';

function run(cmd, args, env = {}) {
  return spawnSync(cmd, args, {
    stdio: 'pipe',
    env: { ...process.env, ...env },
    encoding: 'utf8',
  });
}

async function writeJsonl(fileName, lines) {
  await fs.mkdir(outDir, { recursive: true });
  await fs.writeFile(path.join(outDir, fileName), `${lines.join('\n')}${lines.length ? '\n' : ''}`, 'utf8');
}

async function readJsonl(fileName) {
  const filePath = path.join(outDir, fileName);
  try {
    const content = await fs.readFile(filePath, 'utf8');
    if (!content.trim()) return [];
    return content
      .trim()
      .split('\n')
      .filter(Boolean)
      .map((line) => JSON.parse(line));
  } catch (error) {
    if (error && error.code === 'ENOENT') return [];
    throw error;
  }
}

function parsePlainRows(stdout, mapper) {
  return stdout
    .split('\n')
    .map((line) => line.trim())
    .filter(Boolean)
    .filter((line) => !line.includes('|'))
    .filter((line) => !/^\+[-+]+\+$/.test(line))
    .filter((line) => !line.startsWith('table,') && !line.startsWith('src,') && !line.startsWith('toString('))
    .map((line) => line.split(',').map((part) => part.trim()))
    .filter((parts) => parts.length >= 1)
    .map(mapper)
    .map((record) => JSON.stringify(record));
}

async function snapshotPostgres() {
  const psqlBaseArgs = pgDsn
    ? [pgDsn, '-t', '-A']
    : ['-h', pgHost, '-p', pgPort, '-U', pgUser, '-d', pgDatabase, '-t', '-A'];

  const nodes = run(
    'psql',
    [
      ...psqlBaseArgs,
      '-c',
      `
      SELECT row_to_json(t)::text
      FROM (
        SELECT
          'public.users'::text AS table,
          'User'::text AS label,
          ('user:' || u.id::text) AS id,
          coalesce(u.updated_at::text, '') AS updated_at,
          txid_current()::text AS txid,
          pg_current_wal_lsn()::text AS lsn,
          now()::text AS commit_ts,
          md5(jsonb_build_object('table', 'public.users', 'id', u.id, 'updated_at', coalesce(u.updated_at::text, ''))::text) AS checksum
        FROM users u

        UNION ALL

        SELECT
          'public.orders'::text AS table,
          'Order'::text AS label,
          ('order:' || o.id::text) AS id,
          coalesce(o.updated_at::text, '') AS updated_at,
          txid_current()::text AS txid,
          pg_current_wal_lsn()::text AS lsn,
          now()::text AS commit_ts,
          md5(jsonb_build_object('table', 'public.orders', 'id', o.id, 'user_id', o.user_id, 'updated_at', coalesce(o.updated_at::text, ''))::text) AS checksum
        FROM orders o
      ) t
      ORDER BY id;
      `,
    ],
    { PGPASSWORD: pgPassword },
  );

  if (nodes.status !== 0) {
    return false;
  }

  const edges = run(
    'psql',
    [
      ...psqlBaseArgs,
      '-c',
      `
      SELECT row_to_json(t)::text
      FROM (
        SELECT
          ('user:' || o.user_id::text) AS src,
          'PLACED'::text AS rel,
          ('order:' || o.id::text) AS dst,
          txid_current()::text AS txid,
          pg_current_wal_lsn()::text AS lsn,
          now()::text AS commit_ts,
          md5(jsonb_build_object('src', o.user_id, 'rel', 'PLACED', 'dst', o.id)::text) AS checksum
        FROM orders o
      ) t
      ORDER BY src, rel, dst;
      `,
    ],
    { PGPASSWORD: pgPassword },
  );

  if (edges.status !== 0) {
    return false;
  }

  const nodeLines = nodes.stdout.split('\n').map((line) => line.trim()).filter(Boolean);
  const edgeLines = edges.stdout.split('\n').map((line) => line.trim()).filter(Boolean);

  await writeJsonl('pg.nodes.jsonl', nodeLines);
  await writeJsonl('pg.edges.jsonl', edgeLines);

  return true;
}

async function snapshotNeo4j() {
  const nodes = run('cypher-shell', [
    '-a',
    neo4jUri,
    '-u',
    neo4jUser,
    '-p',
    neo4jPassword,
    '--format',
    'plain',
    `
    MATCH (n)
    WHERE n:User OR n:Order
    WITH
      n,
      CASE WHEN n:User THEN 'public.users' ELSE 'public.orders' END AS table,
      CASE WHEN n:User THEN 'User' ELSE 'Order' END AS label,
      CASE WHEN n:User THEN ('user:' + toString(n.id)) ELSE ('order:' + toString(n.id)) END AS id
    RETURN
      table,
      label,
      id,
      coalesce(toString(n.updated_at), ''),
      coalesce(toString(n.last_txid), ''),
      coalesce(toString(n.last_lsn), ''),
      coalesce(toString(n.last_commit_ts), ''),
      coalesce(toString(n.last_checksum), '')
    ORDER BY id;
    `,
  ]);

  if (nodes.status !== 0) {
    return false;
  }

  const edges = run('cypher-shell', [
    '-a',
    neo4jUri,
    '-u',
    neo4jUser,
    '-p',
    neo4jPassword,
    '--format',
    'plain',
    `
    MATCH (u:User)-[r:PLACED]->(o:Order)
    RETURN
      ('user:' + toString(u.id)),
      'PLACED',
      ('order:' + toString(o.id)),
      coalesce(toString(r.last_txid), ''),
      coalesce(toString(r.last_lsn), ''),
      coalesce(toString(r.last_commit_ts), ''),
      coalesce(toString(r.last_checksum), '')
    ORDER BY u.id, o.id;
    `,
  ]);

  if (edges.status !== 0) {
    return false;
  }

  const nodeLines = parsePlainRows(nodes.stdout, (parts) => {
    const [table, label, id, updatedAt = '', lastTxid = '', lastLsn = '', lastCommitTs = '', lastChecksum = ''] = parts;
    return {
      table,
      label,
      id,
      updated_at: updatedAt,
      last_txid: lastTxid || null,
      last_lsn: lastLsn || null,
      last_commit_ts: lastCommitTs || null,
      last_checksum: lastChecksum || null,
    };
  });

  const edgeLines = parsePlainRows(edges.stdout, (parts) => {
    const [src, rel, dst, lastTxid = '', lastLsn = '', lastCommitTs = '', lastChecksum = ''] = parts;
    return {
      src,
      rel,
      dst,
      last_txid: lastTxid || null,
      last_lsn: lastLsn || null,
      last_commit_ts: lastCommitTs || null,
      last_checksum: lastChecksum || null,
    };
  });

  await writeJsonl('neo.nodes.jsonl', nodeLines);
  await writeJsonl('neo.edges.jsonl', edgeLines);

  return true;
}

function buildOpenLineageEvent({ namespace, name, txid, lsn, commitTs, checksum }) {
  return {
    eventType: 'COMPLETE',
    eventTime: commitTs,
    job: {
      namespace: 'summit/graph-sync',
      name: 'pg-to-neo4j-upsert',
    },
    run: {
      runId: `txid:${txid}/lsn:${lsn}`,
    },
    inputs: [
      {
        namespace: 'pg://source/postgres',
        name: namespace,
        facets: {
          tx: {
            _producer: 'summit/graph-sync-validator',
            txid: String(txid),
            lsn: String(lsn),
            commit_ts: commitTs,
          },
        },
      },
    ],
    outputs: [
      {
        namespace: 'neo4j://intelgraph',
        name,
        facets: {
          checksum: {
            value: checksum,
          },
        },
      },
    ],
  };
}

async function emitOpenLineageFromSnapshots() {
  const pgNodes = await readJsonl('pg.nodes.jsonl');
  const pgEdges = await readJsonl('pg.edges.jsonl');

  const events = [];

  for (const node of pgNodes) {
    if (!node.txid || !node.lsn || !node.commit_ts) continue;
    events.push(
      buildOpenLineageEvent({
        namespace: node.table ?? 'public.unknown',
        name: `${node.label ?? 'Node'}(${node.id})`,
        txid: node.txid,
        lsn: node.lsn,
        commitTs: node.commit_ts,
        checksum: node.checksum ?? '',
      }),
    );
  }

  for (const edge of pgEdges) {
    if (!edge.txid || !edge.lsn || !edge.commit_ts) continue;
    events.push(
      buildOpenLineageEvent({
        namespace: 'public.orders',
        name: `Edge(${edge.src})-[:${edge.rel}]->(${edge.dst})`,
        txid: edge.txid,
        lsn: edge.lsn,
        commitTs: edge.commit_ts,
        checksum: edge.checksum ?? '',
      }),
    );
  }

  const lines = events.map((event) => JSON.stringify(event));
  await writeJsonl('openlineage.jsonl', lines);
}

async function main() {
  await fs.mkdir(outDir, { recursive: true });

  const pgOk = await snapshotPostgres();
  const neoOk = await snapshotNeo4j();

  if (!pgOk || !neoOk) {
    await writeJsonl('pg.nodes.jsonl', []);
    await writeJsonl('pg.edges.jsonl', []);
    await writeJsonl('neo.nodes.jsonl', []);
    await writeJsonl('neo.edges.jsonl', []);
  }

  await emitOpenLineageFromSnapshots();

  const metrics = await compare({ outDir, maxLag });
  await writeArtifacts({ outDir, metrics });

  if (metrics.violation) {
    console.error('Graph sync validation failed:', JSON.stringify(metrics, null, 2));
    process.exit(1);
  }

  console.log('Graph sync validation passed.');
}

main().catch((error) => {
  console.error('Graph sync validation errored:', error);
  process.exit(1);
});

import { createHash, randomUUID } from 'crypto';
import { gzip, gunzip } from 'node:zlib';
import { promisify } from 'node:util';
import type { Driver, QueryResult } from 'neo4j-driver';
import neo4j from 'neo4j-driver';
import type { Pool } from 'pg';
import type { Readable } from 'node:stream';
import logger from '../config/logger';
import { getNeo4jDriver } from '../db/neo4j.js';
import { getPostgresPool } from '../db/postgres.js';

const gzipAsync = promisify(gzip);
const gunzipAsync = promisify(gunzip);

const log = logger.child({ name: 'graphSnapshotService' });

const DEFAULT_NODE_BATCH_SIZE = Number.parseInt(
  process.env.GRAPH_SNAPSHOT_NODE_BATCH_SIZE || process.env.GRAPH_SNAPSHOT_BATCH_SIZE || '1000',
  10,
);
const DEFAULT_REL_BATCH_SIZE = Number.parseInt(
  process.env.GRAPH_SNAPSHOT_REL_BATCH_SIZE || process.env.GRAPH_SNAPSHOT_BATCH_SIZE || '1000',
  10,
);

const SUPPORTED_COMPRESSION = 'gzip' as const;
const SNAPSHOT_FORMAT_VERSION = '1.0.0';

export type GraphSnapshotStorageMode = 'postgres' | 's3';

export interface GraphSnapshotRecord {
  id: string;
  label: string | null;
  description: string | null;
  tenantId: string | null;
  storage: GraphSnapshotStorageMode;
  compression: string;
  sizeBytes: number;
  checksum: string;
  nodeCount: number;
  relationshipCount: number;
  createdAt: Date;
  lastRestoredAt: Date | null;
  location: string | null;
  formatVersion: string;
}

interface ExportedNode {
  id: string;
  labels: string[];
  properties: Record<string, any>;
}

interface ExportedRelationship {
  id: string;
  type: string;
  start: string;
  end: string;
  properties: Record<string, any>;
}

interface GraphSnapshotPayload {
  formatVersion: string;
  exportedAt: string;
  tenantId: string | null;
  nodes: ExportedNode[];
  relationships: ExportedRelationship[];
}

interface SnapshotOptions {
  label?: string;
  description?: string;
  tenantId?: string | null;
  storage?: GraphSnapshotStorageMode | string;
  driver?: Driver;
  pool?: Pool;
}

interface RestoreOptions {
  snapshotId: string;
  tenantId?: string | null;
  clearExisting?: boolean;
  driver?: Driver;
  pool?: Pool;
}

type S3ClientType = import('@aws-sdk/client-s3').S3Client;
type PutObjectCommandType = import('@aws-sdk/client-s3').PutObjectCommand;
type GetObjectCommandType = import('@aws-sdk/client-s3').GetObjectCommand;

let snapshotTableEnsured = false;
let s3ClientPromise: Promise<S3ClientType> | null = null;

function normalizeStorageMode(storage?: string | null): GraphSnapshotStorageMode {
  const preferred = (storage || process.env.GRAPH_SNAPSHOT_STORAGE || 'postgres').toLowerCase();
  if (preferred === 's3') return 's3';
  return 'postgres';
}

async function ensureSnapshotTable(pool: Pool) {
  if (snapshotTableEnsured) return;
  await pool.query(`
    CREATE TABLE IF NOT EXISTS graph_snapshots (
      id UUID PRIMARY KEY,
      label TEXT,
      description TEXT,
      tenant_id TEXT,
      storage TEXT NOT NULL,
      compression TEXT NOT NULL,
      size_bytes BIGINT NOT NULL,
      checksum TEXT NOT NULL,
      node_count BIGINT NOT NULL,
      relationship_count BIGINT NOT NULL,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      last_restored_at TIMESTAMPTZ,
      format_version TEXT NOT NULL,
      location TEXT,
      payload BYTEA
    )
  `);
  snapshotTableEnsured = true;
}

function stringifyNeoInt(value: any): string {
  if (neo4j.isInt(value)) {
    return value.toString();
  }
  return String(value);
}

function convertNeo4jValue(value: any): any {
  if (neo4j.isInt(value)) {
    if (neo4j.integer.inSafeRange(value)) {
      return value.toNumber();
    }
    return value.toString();
  }
  if (Array.isArray(value)) {
    return value.map((item) => convertNeo4jValue(item));
  }
  if (value && typeof value === 'object') {
    if (typeof value.toJSON === 'function') {
      return value.toJSON();
    }
    return Object.fromEntries(
      Object.entries(value).map(([key, val]) => [key, convertNeo4jValue(val)]),
    );
  }
  return value;
}

function chunkArray<T>(items: T[], size: number): T[][] {
  if (items.length === 0) return [];
  const chunks: T[][] = [];
  for (let i = 0; i < items.length; i += size) {
    chunks.push(items.slice(i, i + size));
  }
  return chunks;
}

async function fetchAllNodes(session: any, tenantId: string | null): Promise<ExportedNode[]> {
  const nodes: ExportedNode[] = [];
  let skip = 0;
  const limit = DEFAULT_NODE_BATCH_SIZE;
  const whereClause = tenantId ? 'WHERE n.tenant_id = $tenantId' : '';

  // eslint-disable-next-line no-constant-condition
  while (true) {
    const result: QueryResult = await session.run(
      `
        MATCH (n)
        ${whereClause}
        RETURN id(n) as id, labels(n) as labels, properties(n) as properties
        ORDER BY id(n)
        SKIP $skip
        LIMIT $limit
      `,
      { skip, limit, tenantId },
    );
    if (result.records.length === 0) break;
    for (const record of result.records) {
      nodes.push({
        id: stringifyNeoInt(record.get('id')),
        labels: record.get('labels') as string[],
        properties: convertNeo4jValue(record.get('properties')),
      });
    }
    skip += result.records.length;
  }
  return nodes;
}

async function fetchAllRelationships(session: any, tenantId: string | null): Promise<ExportedRelationship[]> {
  const relationships: ExportedRelationship[] = [];
  let skip = 0;
  const limit = DEFAULT_REL_BATCH_SIZE;
  const whereClause = tenantId
    ? 'WHERE a.tenant_id = $tenantId AND b.tenant_id = $tenantId'
    : '';

  // eslint-disable-next-line no-constant-condition
  while (true) {
    const result: QueryResult = await session.run(
      `
        MATCH (a)-[r]->(b)
        ${whereClause}
        RETURN id(r) as id, id(a) as startId, id(b) as endId, type(r) as type, properties(r) as properties
        ORDER BY id(r)
        SKIP $skip
        LIMIT $limit
      `,
      { skip, limit, tenantId },
    );
    if (result.records.length === 0) break;
    for (const record of result.records) {
      relationships.push({
        id: stringifyNeoInt(record.get('id')),
        type: record.get('type') as string,
        start: stringifyNeoInt(record.get('startId')),
        end: stringifyNeoInt(record.get('endId')),
        properties: convertNeo4jValue(record.get('properties')),
      });
    }
    skip += result.records.length;
  }
  return relationships;
}

async function exportGraph(driver: Driver, tenantId: string | null): Promise<GraphSnapshotPayload> {
  const session = driver.session({ defaultAccessMode: neo4j.session.READ });
  try {
    const nodes = await fetchAllNodes(session, tenantId);
    const relationships = await fetchAllRelationships(session, tenantId);
    return {
      formatVersion: SNAPSHOT_FORMAT_VERSION,
      exportedAt: new Date().toISOString(),
      tenantId,
      nodes,
      relationships,
    };
  } finally {
    await session.close();
  }
}

async function getS3Client(): Promise<S3ClientType> {
  if (!s3ClientPromise) {
    s3ClientPromise = (async () => {
      let mod: typeof import('@aws-sdk/client-s3');
      try {
        mod = await import('@aws-sdk/client-s3');
      } catch (error) {
        throw new Error(
          'S3 snapshot storage requested but @aws-sdk/client-s3 is not installed. Install it to enable S3 support.',
        );
      }
      const { S3Client } = mod;
      const region = process.env.S3_REGION || process.env.AWS_REGION || 'us-east-1';
      const endpoint = process.env.S3_ENDPOINT || undefined;
      const forcePathStyle = process.env.S3_FORCE_PATH_STYLE === 'true';
      const credentials = process.env.S3_ACCESS_KEY_ID
        ? {
            accessKeyId: process.env.S3_ACCESS_KEY_ID!,
            secretAccessKey: process.env.S3_SECRET_ACCESS_KEY!,
          }
        : undefined;
      return new S3Client({ region, endpoint, forcePathStyle, credentials });
    })();
  }
  return s3ClientPromise;
}

async function storeSnapshotInS3(
  id: string,
  payload: Buffer,
  checksum: string,
): Promise<string> {
  const bucket = process.env.GRAPH_SNAPSHOT_S3_BUCKET || process.env.S3_BUCKET;
  if (!bucket) {
    throw new Error('Graph snapshot storage set to S3 but no bucket configured');
  }
  const prefix = process.env.GRAPH_SNAPSHOT_S3_PREFIX?.replace(/\/+$/, '') || 'graph-snapshots';
  const key = `${prefix}/${id}.json.gz`;
  const client = await getS3Client();
  let PutObjectCommand: typeof import('@aws-sdk/client-s3').PutObjectCommand;
  try {
    ({ PutObjectCommand } = await import('@aws-sdk/client-s3'));
  } catch (error) {
    throw new Error(
      'S3 snapshot storage requested but @aws-sdk/client-s3 is not installed. Install it to enable S3 support.',
    );
  }
  const command: PutObjectCommandType = new PutObjectCommand({
    Bucket: bucket,
    Key: key,
    Body: payload,
    ContentType: 'application/json',
    ContentEncoding: SUPPORTED_COMPRESSION,
    Metadata: { checksum },
  });
  await client.send(command);
  return `s3://${bucket}/${key}`;
}

async function loadSnapshotFromS3(location: string): Promise<Buffer> {
  const match = location.startsWith('s3://')
    ? location.replace('s3://', '').split('/')
    : null;
  const bucket = match?.shift() || process.env.GRAPH_SNAPSHOT_S3_BUCKET || process.env.S3_BUCKET;
  const key = match ? match.join('/') : location;
  if (!bucket || !key) {
    throw new Error('Invalid S3 snapshot location configuration');
  }
  const client = await getS3Client();
  let GetObjectCommand: typeof import('@aws-sdk/client-s3').GetObjectCommand;
  try {
    ({ GetObjectCommand } = await import('@aws-sdk/client-s3'));
  } catch (error) {
    throw new Error(
      'S3 snapshot restore requested but @aws-sdk/client-s3 is not installed. Install it to enable S3 support.',
    );
  }
  const command: GetObjectCommandType = new GetObjectCommand({ Bucket: bucket, Key: key });
  const response = await client.send(command);
  const body = response.Body;
  if (!body) {
    throw new Error('Snapshot object had no body');
  }
  if (Buffer.isBuffer(body)) {
    return body;
  }
  if (typeof (body as any).transformToByteArray === 'function') {
    const byteArray = await (body as any).transformToByteArray();
    return Buffer.from(byteArray);
  }
  const chunks: Buffer[] = [];
  for await (const chunk of body as Readable) {
    chunks.push(Buffer.from(chunk));
  }
  return Buffer.concat(chunks);
}

function mapRowToRecord(row: any): GraphSnapshotRecord {
  return {
    id: row.id,
    label: row.label ?? null,
    description: row.description ?? null,
    tenantId: row.tenant_id ?? null,
    storage: normalizeStorageMode(row.storage),
    compression: row.compression,
    sizeBytes: Number(row.size_bytes),
    checksum: row.checksum,
    nodeCount: Number(row.node_count),
    relationshipCount: Number(row.relationship_count),
    createdAt: new Date(row.created_at),
    lastRestoredAt: row.last_restored_at ? new Date(row.last_restored_at) : null,
    location: row.location ?? null,
    formatVersion: row.format_version ?? SNAPSHOT_FORMAT_VERSION,
  };
}

async function clearGraph(
  session: any,
  tenantId: string | null,
  shouldClear: boolean,
) {
  if (!shouldClear) return;
  const clause = tenantId ? 'WHERE n.tenant_id = $tenantId' : '';
  await session.run(`MATCH (n) ${clause} DETACH DELETE n`, { tenantId });
}

async function importNodes(
  session: any,
  nodes: ExportedNode[],
): Promise<Map<string, number>> {
  const idMap = new Map<string, number>();
  if (!nodes.length) return idMap;

  const grouped = new Map<string, ExportedNode[]>();
  for (const node of nodes) {
    const key = node.labels.slice().sort().join('::');
    if (!grouped.has(key)) {
      grouped.set(key, []);
    }
    grouped.get(key)!.push(node);
  }

  for (const [labelKey, bucket] of grouped.entries()) {
    const labels = labelKey ? `:${labelKey.replace(/::/g, ':')}` : '';
    const chunks = chunkArray(bucket, 200);
    for (const chunk of chunks) {
      const params = {
        nodes: chunk.map((node) => ({
          originalId: node.id,
          properties: node.properties,
        })),
      };
      const result: QueryResult = await session.run(
        `
          UNWIND $nodes as node
          CREATE (n${labels})
          SET n += node.properties
          RETURN id(n) as newId, node.originalId as originalId
        `,
        params,
      );
      for (const record of result.records) {
        const originalId = record.get('originalId') as string;
        const newIdValue = record.get('newId');
        const newId = neo4j.isInt(newIdValue)
          ? neo4j.integer.toNumber(newIdValue)
          : Number(newIdValue);
        idMap.set(originalId, newId);
      }
    }
  }

  return idMap;
}

async function importRelationships(
  session: any,
  relationships: ExportedRelationship[],
  idMap: Map<string, number>,
) {
  if (!relationships.length) return;

  const grouped = new Map<string, ExportedRelationship[]>();
  for (const rel of relationships) {
    if (!idMap.has(rel.start) || !idMap.has(rel.end)) {
      log.warn('Skipping relationship due to missing node mapping', {
        relationshipId: rel.id,
        start: rel.start,
        end: rel.end,
      });
      continue;
    }
    const key = rel.type;
    if (!grouped.has(key)) {
      grouped.set(key, []);
    }
    grouped.get(key)!.push(rel);
  }

  for (const [type, bucket] of grouped.entries()) {
    const chunks = chunkArray(bucket, 500);
    for (const chunk of chunks) {
      const params = {
        rels: chunk.map((rel) => ({
          start: idMap.get(rel.start),
          end: idMap.get(rel.end),
          properties: rel.properties,
        })),
      };
      await session.run(
        `
          UNWIND $rels as rel
          MATCH (start) WHERE id(start) = rel.start
          MATCH (end) WHERE id(end) = rel.end
          CREATE (start)-[r:${type}]->(end)
          SET r += rel.properties
        `,
        params,
      );
    }
  }
}

export async function createGraphSnapshot(options: SnapshotOptions = {}): Promise<GraphSnapshotRecord> {
  const driver = options.driver || getNeo4jDriver();
  const pool = options.pool || getPostgresPool();
  await ensureSnapshotTable(pool);

  const tenantId = options.tenantId ?? null;
  const storage = normalizeStorageMode(options.storage);

  const payload = await exportGraph(driver, tenantId);
  const serialized = Buffer.from(JSON.stringify(payload), 'utf-8');
  const compressed = await gzipAsync(serialized);
  const checksum = createHash('sha256').update(compressed).digest('hex');

  const id = randomUUID();
  const createdAt = new Date();
  let location: string | null = null;

  if (storage === 's3') {
    location = await storeSnapshotInS3(id, compressed, checksum);
  }

  await pool.query(
    `
      INSERT INTO graph_snapshots (
        id, label, description, tenant_id, storage, compression, size_bytes,
        checksum, node_count, relationship_count, created_at, format_version,
        location, payload
      ) VALUES (
        $1, $2, $3, $4, $5, $6, $7,
        $8, $9, $10, $11, $12,
        $13, $14
      )
    `,
    [
      id,
      options.label ?? null,
      options.description ?? null,
      tenantId,
      storage,
      SUPPORTED_COMPRESSION,
      compressed.byteLength,
      checksum,
      payload.nodes.length,
      payload.relationships.length,
      createdAt.toISOString(),
      payload.formatVersion,
      location,
      storage === 'postgres' ? compressed : null,
    ],
  );

  return {
    id,
    label: options.label ?? null,
    description: options.description ?? null,
    tenantId,
    storage,
    compression: SUPPORTED_COMPRESSION,
    sizeBytes: compressed.byteLength,
    checksum,
    nodeCount: payload.nodes.length,
    relationshipCount: payload.relationships.length,
    createdAt,
    lastRestoredAt: null,
    location,
    formatVersion: SNAPSHOT_FORMAT_VERSION,
  };
}

export async function restoreGraphSnapshot(options: RestoreOptions) {
  const driver = options.driver || getNeo4jDriver();
  const pool = options.pool || getPostgresPool();
  await ensureSnapshotTable(pool);

  const { rows } = await pool.query(
    'SELECT * FROM graph_snapshots WHERE id = $1',
    [options.snapshotId],
  );
  if (!rows.length) {
    throw new Error(`Snapshot ${options.snapshotId} not found`);
  }

  const row = rows[0];
  const record = mapRowToRecord(row);

  const rawPayload: Buffer = record.storage === 'postgres'
    ? row.payload
    : await loadSnapshotFromS3(record.location!);

  if (!rawPayload) {
    throw new Error(`Snapshot ${options.snapshotId} has no stored payload`);
  }

  const calculatedChecksum = createHash('sha256').update(rawPayload).digest('hex');
  if (calculatedChecksum !== record.checksum) {
    throw new Error('Snapshot checksum mismatch. Aborting restore to prevent corruption.');
  }

  const decompressed = await gunzipAsync(rawPayload);
  const snapshot = JSON.parse(decompressed.toString('utf-8')) as GraphSnapshotPayload;

  const tenantId = options.tenantId ?? record.tenantId ?? null;
  const clearExisting = options.clearExisting !== false;

  const session = driver.session({ defaultAccessMode: neo4j.session.WRITE });
  try {
    await clearGraph(session, tenantId, clearExisting);
    const idMap = await importNodes(session, snapshot.nodes);
    await importRelationships(session, snapshot.relationships, idMap);
  } finally {
    await session.close();
  }

  await pool.query('UPDATE graph_snapshots SET last_restored_at = NOW() WHERE id = $1', [
    options.snapshotId,
  ]);

  return {
    snapshot: {
      ...record,
      tenantId,
    },
    restoredNodeCount: snapshot.nodes.length,
    restoredRelationshipCount: snapshot.relationships.length,
  };
}

export type RestoreGraphSnapshotResult = Awaited<ReturnType<typeof restoreGraphSnapshot>>;


import pino from 'pino';
import { getPostgresPool } from '../postgres.js';
import { getNeo4jDriver } from '../neo4j.js';

const logger = pino({ name: 'performance-indexes' });

async function postgresTableExists(tableName: string): Promise<boolean> {
  const pool = getPostgresPool();
  const result = await pool.query<{ exists: boolean }>(
    `SELECT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = $1) AS exists`,
    [tableName],
  );
  return result.rows[0]?.exists ?? false;
}

async function ensurePostgresIndex(name: string, createStatement: string): Promise<void> {
  const pool = getPostgresPool();
  const existing = await pool.query<{ oid: string | null }>('SELECT to_regclass($1) as oid', [
    name,
  ]);

  if (existing.rows[0]?.oid) {
    return;
  }

  await pool.query(createStatement);
  logger.info({ index: name }, 'Created PostgreSQL performance index');
}

async function ensurePostgresIndexes(): Promise<void> {
  if (!(await postgresTableExists('entities'))) {
    logger.debug('Skipping PostgreSQL index creation because entities table is missing');
    return;
  }

  await ensurePostgresIndex(
    'idx_entities_tenant_kind_created_at',
    'CREATE INDEX IF NOT EXISTS idx_entities_tenant_kind_created_at ON entities (tenant_id, kind, created_at DESC)',
  );

  await ensurePostgresIndex(
    'idx_entities_labels_gin',
    'CREATE INDEX IF NOT EXISTS idx_entities_labels_gin ON entities USING gin(labels)',
  );

  if (await postgresTableExists('relationships')) {
    await ensurePostgresIndex(
      'idx_relationships_tenant_source_target',
      'CREATE INDEX IF NOT EXISTS idx_relationships_tenant_source_target ON relationships (tenant_id, source_id, target_id)',
    );
  }
}

async function ensureNeo4jIndexes(): Promise<void> {
  const driver = getNeo4jDriver();
  const session = driver.session();

  try {
    await session.run(
      'CREATE FULLTEXT INDEX evidenceContentSearch IF NOT EXISTS FOR (n:Evidence) ON EACH [n.content]',
    );
    await session.run(
      'CREATE INDEX evidence_tenant_label IF NOT EXISTS FOR (n:Evidence) ON (n.tenantId)',
    );
  } finally {
    await session.close();
  }
}

export async function ensurePerformanceIndexes(): Promise<void> {
  try {
    await ensurePostgresIndexes();
  } catch (error) {
    logger.warn({ err: error }, 'PostgreSQL index bootstrap failed');
  }

  try {
    await ensureNeo4jIndexes();
  } catch (error) {
    logger.warn({ err: error }, 'Neo4j index bootstrap failed');
  }
}

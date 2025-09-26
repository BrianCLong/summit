import type { Pool, PoolClient } from 'pg';
import baseLogger from '../../config/logger.js';
import { getPostgresPool } from '../postgres.js';

const logger = baseLogger.child({ name: 'PostgresTenancy' });
const schemaCache: Set<string> = new Set();

export function formatTenantSchema(tenantId: string): string {
  const normalized = tenantId.toLowerCase().replace(/[^a-z0-9]+/g, '_');
  return `tenant_${normalized}`;
}

async function runEnsureSchema(client: PoolClient, tenantId: string): Promise<string> {
  const { rows } = await client.query<{ ensure_tenant_schema: string }>(
    'SELECT ensure_tenant_schema($1) AS ensure_tenant_schema',
    [tenantId]
  );
  const schemaName = rows[0]?.ensure_tenant_schema ?? formatTenantSchema(tenantId);
  schemaCache.add(schemaName);
  return schemaName;
}

export async function ensureTenantSchema(tenantId: string, client?: PoolClient): Promise<string> {
  const schemaName = formatTenantSchema(tenantId);
  if (schemaCache.has(schemaName)) {
    return schemaName;
  }

  if (client) {
    return await runEnsureSchema(client, tenantId);
  }

  const pool = getPostgresPool();
  const scopedClient = await pool.connect();
  try {
    await scopedClient.query('BEGIN');
    const ensured = await runEnsureSchema(scopedClient, tenantId);
    await scopedClient.query('COMMIT');
    return ensured;
  } catch (error) {
    await scopedClient.query('ROLLBACK').catch(() => undefined);
    logger.error({ tenantId, error }, 'Failed to ensure tenant schema');
    throw error;
  } finally {
    scopedClient.release();
  }
}

export interface TenantConnectionOptions {
  pool?: Pool;
  transactional?: boolean;
}

export async function withTenantConnection<T>(
  tenantId: string,
  fn: (client: PoolClient) => Promise<T>,
  options: TenantConnectionOptions = {}
): Promise<T> {
  const pool = options.pool ?? getPostgresPool();
  const transactional = options.transactional ?? true;
  const client = await pool.connect();

  try {
    if (transactional) {
      await client.query('BEGIN');
    }

    await runEnsureSchema(client, tenantId);
    await client.query('SELECT set_tenant_search_path($1)', [tenantId]);

    const result = await fn(client);

    if (transactional) {
      await client.query('COMMIT');
    }

    return result;
  } catch (error) {
    if (transactional) {
      await client.query('ROLLBACK').catch(() => undefined);
    }
    logger.error({ tenantId, error }, 'Tenant scoped query failed');
    throw error;
  } finally {
    client.release();
  }
}

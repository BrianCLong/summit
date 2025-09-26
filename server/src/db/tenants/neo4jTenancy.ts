import type { Driver } from 'neo4j-driver';
import baseLogger from '../../config/logger.js';

const logger = baseLogger.child({ name: 'Neo4jTenancy' });
const namespaceCache: Set<string> = new Set();

export function formatTenantNamespace(tenantId: string): string {
  const normalized = tenantId.toLowerCase().replace(/[^a-z0-9]+/g, '_');
  return `tenant_${normalized}`;
}

export async function ensureTenantNamespace(driver: Driver, tenantId: string): Promise<string> {
  const namespace = formatTenantNamespace(tenantId);
  if (namespaceCache.has(namespace)) {
    return namespace;
  }

  const systemSession = driver.session({ database: 'system' });
  try {
    const existsResult = await systemSession.run(
      'SHOW DATABASES YIELD name WHERE name = $name RETURN name',
      { name: namespace }
    );

    if (existsResult.records.length === 0) {
      try {
        await systemSession.run(`CREATE DATABASE ${namespace}`);
      } catch (error) {
        logger.warn({ namespace, error }, 'Failed to create tenant namespace database');
      }
    }

    namespaceCache.add(namespace);
    return namespace;
  } finally {
    await systemSession.close();
  }
}

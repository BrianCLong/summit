// @ts-nocheck
import fs from 'fs';
import path from 'path';
import type { PoolConfig } from 'pg';
import { TenantConfig } from '../tenancy/types';

export interface TenantDbConfig {
  postgres: PoolConfig;
  neo4j: {
    uri: string;
    username: string;
    password: string;
  };
  redisPrefix?: string;
}

interface ConfigMap {
  [tenantId: string]: TenantDbConfig & Partial<TenantConfig>;
}

const configPath =
  process.env.TENANT_DB_CONFIG ||
  path.resolve(process.cwd(), 'server/tenant-databases.json');
let configs: ConfigMap = {};
let version = 0;

function loadConfigs(): void {
  try {
    const raw = fs.readFileSync(configPath, 'utf-8');
    configs = JSON.parse(raw);
    version++;
  } catch (err) {
    configs = {};
  }
}

// initial load
loadConfigs();

// hot reload on config changes
try {
  fs.watch(configPath, { persistent: false }, () => {
    loadConfigs();
  });
} catch {
  // ignore watch errors; config will not hot reload
}

export function getTenantConfig(tenantId: string): (TenantDbConfig & Partial<TenantConfig>) | undefined {
  return configs[tenantId];
}

export function getAllTenantConfigs(): ConfigMap {
  return configs;
}

// Write capability for pilot program persistence
export function updateTenantConfig(tenantId: string, updates: Partial<TenantConfig>): void {
    if (!configs[tenantId]) {
        throw new Error(`Tenant ${tenantId} not found`);
    }
    configs[tenantId] = { ...configs[tenantId], ...updates };

    // Persist to disk
    try {
        fs.writeFileSync(configPath, JSON.stringify(configs, null, 2));
        version++;
    } catch (err) {
        console.error('Failed to persist tenant config updates', err);
        throw err;
    }
}

export function getConfigVersion(): number {
  return version;
}

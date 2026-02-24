// @ts-nocheck
import { Pool, PoolClient } from 'pg';
import { Counter, Gauge, register } from 'prom-client';
import logger from '../config/logger.js';

interface PartitionRecord {
  partition_key: string;
  strategy: 'schema' | 'shared';
  schema_name: string | null;
  write_connection_url: string | null;
  read_connection_url: string | null;
  is_default: boolean;
  status?: string | null;
}

export interface TenantRoute {
  tenantId: string;
  partitionKey: string;
  schema: string | null;
  strategy: 'schema-per-tenant' | 'shared-schema';
  writePool: Pool;
  readPool: Pool;
  source: 'default' | 'mapping' | 'static';
}

const routeResolutionCounter =
  (register.getSingleMetric('tenant_router_resolutions_total') as Counter) ||
  new Counter({
    name: 'tenant_router_resolutions_total',
    help: 'Tenant routing resolution decisions',
    labelNames: ['tenant_id', 'partition_key', 'source', 'strategy'],
  });

const partitionGauge =
  (register.getSingleMetric('tenant_partition_config_info') as Gauge) ||
  new Gauge({
    name: 'tenant_partition_config_info',
    help: 'Active tenant partition definitions loaded into the router',
    labelNames: ['partition_key', 'strategy', 'schema', 'is_default'],
  });

const ROUTER_TTL_MS = 60_000;

class TenantRouter {
  private enabled = process.env.TENANT_ROUTING_V1 === '1';
  private writePool: Pool | null = null;
  private readPool: Pool | null = null;
  private defaultPartition = 'primary';
  private partitions = new Map<string, PartitionRecord>();
  private tenantToPartition = new Map<string, string>();
  private poolCache = new Map<string, Pool>();
  private lastLoadedAt = 0;

  configure(pools: { writePool: Pool; readPool?: Pool }): void {
    if (!this.writePool) {
      this.writePool = pools.writePool;
    }
    if (!this.readPool && pools.readPool) {
      this.readPool = pools.readPool;
    }
    this.ensureDefaultPartition();
  }

  isEnabled(): boolean {
    return this.enabled;
  }

  async refresh(): Promise<void> {
    this.lastLoadedAt = 0;
    await this.ensureLoaded();
  }

  async resolve(tenantId?: string | null): Promise<TenantRoute | null> {
    if (!this.enabled || !this.writePool) {
      return null;
    }

    await this.ensureLoaded();

    const partitionKey =
      (tenantId && this.tenantToPartition.get(tenantId)) ||
      this.defaultPartition;
    const partition =
      this.partitions.get(partitionKey) ||
      this.partitions.get(this.defaultPartition);

    if (!partition) {
      // Fallback to direct pools when no config is available
      return {
        tenantId: tenantId || 'unknown',
        partitionKey: this.defaultPartition,
        schema: null,
        strategy: 'shared-schema',
        writePool: this.writePool,
        readPool: this.readPool || this.writePool,
        source: 'static',
      };
    }

    const writePool = this.getOrCreatePool(
      partition.partition_key,
      'write',
      partition.write_connection_url,
    );
    const readPool = this.getOrCreatePool(
      partition.partition_key,
      'read',
      partition.read_connection_url || partition.write_connection_url,
    );

    const strategy =
      partition.strategy === 'schema'
        ? 'schema-per-tenant'
        : 'shared-schema';
    const source = this.tenantToPartition.has(tenantId || '')
      ? 'mapping'
      : 'default';

    routeResolutionCounter.inc({
      tenant_id: tenantId || 'unknown',
      partition_key: partition.partition_key,
      source,
      strategy,
    });

    return {
      tenantId: tenantId || 'unknown',
      partitionKey: partition.partition_key,
      schema: partition.schema_name,
      strategy,
      writePool,
      readPool,
      source,
    };
  }

  async assignTenantToPartition(
    client: PoolClient,
    tenantId: string,
    requestedKey?: string | null,
  ): Promise<string> {
    if (!this.enabled) {
      return this.defaultPartition;
    }

    await this.ensureLoaded();
    const partitionKey =
      (requestedKey && this.partitions.get(requestedKey)?.partition_key) ||
      this.defaultPartition;

    try {
      await client.query(
        `
          INSERT INTO tenant_partition_map (tenant_id, partition_key)
          VALUES ($1, $2)
          ON CONFLICT (tenant_id) DO UPDATE
            SET partition_key = EXCLUDED.partition_key,
                updated_at = NOW()
        `,
        [tenantId, partitionKey],
      );

      this.tenantToPartition.set(tenantId, partitionKey);
      return partitionKey;
    } catch (error: any) {
      logger.warn(
        { tenantId, partitionKey, err: error },
        'Tenant routing map not available; continuing without partition mapping',
      );
      return this.defaultPartition;
    }
  }

  getDefaultPartition(): string {
    return this.defaultPartition;
  }

  /**
   * Test hook: reset router cache between tests.
   */
  resetForTests(): void {
    this.partitions.clear();
    this.tenantToPartition.clear();
    this.poolCache.clear();
    this.lastLoadedAt = 0;
    this.defaultPartition = 'primary';
    this.writePool = null;
    this.readPool = null;
    this.enabled = process.env.TENANT_ROUTING_V1 === '1';
  }

  /**
   * Test hook: seed partitions without hitting the database.
   */
  seedForTests(
    partitions: PartitionRecord[],
    tenantMap: { tenant_id: string; partition_key: string }[] = [],
  ): void {
    this.partitions.clear();
    partitions.forEach((row: any) => this.partitions.set(row.partition_key, row));
    tenantMap.forEach(({ tenant_id, partition_key }) =>
      this.tenantToPartition.set(tenant_id, partition_key),
    );
    const defaultRow =
      partitions.find((p) => p.is_default) || partitions[0] || null;
    if (defaultRow) {
      this.defaultPartition = defaultRow.partition_key;
      partitionGauge.set(
        {
          partition_key: defaultRow.partition_key,
          strategy: defaultRow.strategy,
          schema: defaultRow.schema_name || 'public',
          is_default: 'true',
        },
        1,
      );
    } else {
      this.ensureDefaultPartition();
    }
    this.lastLoadedAt = Date.now();
  }

  private ensureDefaultPartition(): void {
    if (!this.partitions.size) {
      this.partitions.set(this.defaultPartition, {
        partition_key: this.defaultPartition,
        strategy: 'shared',
        schema_name: null,
        write_connection_url: null,
        read_connection_url: null,
        is_default: true,
        status: 'active',
      });
    }
  }

  private async ensureLoaded(): Promise<void> {
    if (
      !this.enabled ||
      !this.writePool ||
      (Date.now() - this.lastLoadedAt < ROUTER_TTL_MS &&
        this.partitions.size > 0)
    ) {
      return;
    }

    try {
      const partitionResult = await this.writePool.query(
        `
          SELECT partition_key,
                 strategy,
                 schema_name,
                 write_connection_url,
                 read_connection_url,
                 is_default,
                 status
          FROM tenant_partitions
          WHERE status IS NULL OR status = 'active'
        `,
      );

      const mapResult = await this.writePool.query(
        `SELECT tenant_id, partition_key FROM tenant_partition_map`,
      );

      this.partitions.clear();
      partitionResult.rows.forEach((row: PartitionRecord) => {
        this.partitions.set(row.partition_key, row);
        partitionGauge.set(
          {
            partition_key: row.partition_key,
            strategy: row.strategy,
            schema: row.schema_name || 'public',
            is_default: row.is_default ? 'true' : 'false',
          },
          1,
        );
        if (row.is_default) {
          this.defaultPartition = row.partition_key;
        }
      });

      if (!partitionResult.rows.length) {
        this.ensureDefaultPartition();
      }

      this.tenantToPartition.clear();
      mapResult.rows.forEach((row: { tenant_id: string; partition_key: string }) =>
        this.tenantToPartition.set(row.tenant_id, row.partition_key),
      );

      this.lastLoadedAt = Date.now();
    } catch (error: any) {
      logger.debug(
        { err: error },
        'Tenant routing tables unavailable; using default partition',
      );
      this.ensureDefaultPartition();
      this.lastLoadedAt = Date.now();
    }
  }

  private getOrCreatePool(
    partitionKey: string,
    type: 'write' | 'read',
    connectionUrl?: string | null,
  ): Pool {
    if (!connectionUrl) {
      if (type === 'read' && this.readPool) {
        return this.readPool;
      }
      return this.writePool as Pool;
    }

    const cacheKey = `${partitionKey}:${type}:${connectionUrl}`;
    const cached = this.poolCache.get(cacheKey);
    if (cached) {
      return cached;
    }

    const pool = new Pool({
      connectionString: connectionUrl,
      application_name: `summit-${type}-${partitionKey}`,
    });
    this.poolCache.set(cacheKey, pool);
    return pool;
  }
}

export const tenantRouter = new TenantRouter();

export const __private = {
  routeResolutionCounter,
  partitionGauge,
};

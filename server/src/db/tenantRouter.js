"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.__private = exports.tenantRouter = void 0;
// @ts-nocheck
const pg_1 = require("pg");
const prom_client_1 = require("prom-client");
const logger_js_1 = __importDefault(require("../config/logger.js"));
const routeResolutionCounter = prom_client_1.register.getSingleMetric('tenant_router_resolutions_total') ||
    new prom_client_1.Counter({
        name: 'tenant_router_resolutions_total',
        help: 'Tenant routing resolution decisions',
        labelNames: ['tenant_id', 'partition_key', 'source', 'strategy'],
    });
const partitionGauge = prom_client_1.register.getSingleMetric('tenant_partition_config_info') ||
    new prom_client_1.Gauge({
        name: 'tenant_partition_config_info',
        help: 'Active tenant partition definitions loaded into the router',
        labelNames: ['partition_key', 'strategy', 'schema', 'is_default'],
    });
const ROUTER_TTL_MS = 60_000;
class TenantRouter {
    enabled = process.env.TENANT_ROUTING_V1 === '1';
    writePool = null;
    readPool = null;
    defaultPartition = 'primary';
    partitions = new Map();
    tenantToPartition = new Map();
    poolCache = new Map();
    lastLoadedAt = 0;
    configure(pools) {
        if (!this.writePool) {
            this.writePool = pools.writePool;
        }
        if (!this.readPool && pools.readPool) {
            this.readPool = pools.readPool;
        }
        this.ensureDefaultPartition();
    }
    isEnabled() {
        return this.enabled;
    }
    async refresh() {
        this.lastLoadedAt = 0;
        await this.ensureLoaded();
    }
    async resolve(tenantId) {
        if (!this.enabled || !this.writePool) {
            return null;
        }
        await this.ensureLoaded();
        const partitionKey = (tenantId && this.tenantToPartition.get(tenantId)) ||
            this.defaultPartition;
        const partition = this.partitions.get(partitionKey) ||
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
        const writePool = this.getOrCreatePool(partition.partition_key, 'write', partition.write_connection_url);
        const readPool = this.getOrCreatePool(partition.partition_key, 'read', partition.read_connection_url || partition.write_connection_url);
        const strategy = partition.strategy === 'schema'
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
            region: partition.region,
        };
    }
    async resolveRegionalRoute(tenantId, region) {
        if (!this.enabled || !this.writePool) {
            return null;
        }
        await this.ensureLoaded();
        // 1. Check mapping
        const partitionKey = tenantId ? this.tenantToPartition.get(tenantId) : null;
        let partition;
        if (partitionKey) {
            partition = this.partitions.get(partitionKey);
        }
        // 2. Regional override: If no mapping OR mapped partition is in a DIFFERENT region,
        // find a partition native to the requested region.
        if (!partition || (partition.region && partition.region !== region)) {
            const regionalPool = Array.from(this.partitions.values()).find((p) => p.region === region && (p.status === 'active' || p.status === null));
            if (regionalPool) {
                partition = regionalPool;
            }
        }
        // 3. Absolute fallback
        if (!partition) {
            partition = this.partitions.get(this.defaultPartition);
        }
        if (!partition)
            return null;
        const writePool = this.getOrCreatePool(partition.partition_key, 'write', partition.write_connection_url);
        const readPool = this.getOrCreatePool(partition.partition_key, 'read', partition.read_connection_url || partition.write_connection_url);
        const strategy = partition.strategy === 'schema'
            ? 'schema-per-tenant'
            : 'shared-schema';
        const source = this.tenantToPartition.has(tenantId || '')
            ? 'mapping'
            : 'default';
        return {
            tenantId: tenantId || 'unknown',
            partitionKey: partition.partition_key,
            schema: partition.schema_name,
            strategy,
            writePool,
            readPool,
            source,
            region: partition.region,
        };
    }
    async assignTenantToPartition(client, tenantId, requestedKey) {
        if (!this.enabled) {
            return this.defaultPartition;
        }
        await this.ensureLoaded();
        const partitionKey = (requestedKey && this.partitions.get(requestedKey)?.partition_key) ||
            this.defaultPartition;
        try {
            await client.query(`
          INSERT INTO tenant_partition_map (tenant_id, partition_key)
          VALUES ($1, $2)
          ON CONFLICT (tenant_id) DO UPDATE
            SET partition_key = EXCLUDED.partition_key,
                updated_at = NOW()
        `, [tenantId, partitionKey]);
            this.tenantToPartition.set(tenantId, partitionKey);
            return partitionKey;
        }
        catch (error) {
            logger_js_1.default.warn({ tenantId, partitionKey, err: error }, 'Tenant routing map not available; continuing without partition mapping');
            return this.defaultPartition;
        }
    }
    getDefaultPartition() {
        return this.defaultPartition;
    }
    /**
     * Test hook: reset router cache between tests.
     */
    resetForTests() {
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
    seedForTests(partitions, tenantMap = []) {
        this.partitions.clear();
        partitions.forEach((row) => this.partitions.set(row.partition_key, { region: 'us-east-1', ...row }));
        tenantMap.forEach(({ tenant_id, partition_key }) => this.tenantToPartition.set(tenant_id, partition_key));
        const defaultRow = partitions.find((p) => p.is_default) || partitions[0] || null;
        if (defaultRow) {
            this.defaultPartition = defaultRow.partition_key;
            partitionGauge.set({
                partition_key: defaultRow.partition_key,
                strategy: defaultRow.strategy,
                schema: defaultRow.schema_name || 'public',
                is_default: 'true',
            }, 1);
        }
        else {
            this.ensureDefaultPartition();
        }
        this.lastLoadedAt = Date.now();
    }
    ensureDefaultPartition() {
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
    async ensureLoaded() {
        if (!this.enabled ||
            !this.writePool ||
            (Date.now() - this.lastLoadedAt < ROUTER_TTL_MS &&
                this.partitions.size > 0)) {
            return;
        }
        try {
            const partitionResult = await this.writePool.query(`
          SELECT partition_key,
                 strategy,
                 schema_name,
                 write_connection_url,
                 read_connection_url,
                 is_default,
                 status,
                 region
          FROM tenant_partitions
          WHERE status IS NULL OR status = 'active'
        `);
            const mapResult = await this.writePool.query(`SELECT tenant_id, partition_key FROM tenant_partition_map`);
            this.partitions.clear();
            partitionResult.rows.forEach((row) => {
                this.partitions.set(row.partition_key, row);
                partitionGauge.set({
                    partition_key: row.partition_key,
                    strategy: row.strategy,
                    schema: row.schema_name || 'public',
                    is_default: row.is_default ? 'true' : 'false',
                }, 1);
                if (row.is_default) {
                    this.defaultPartition = row.partition_key;
                }
            });
            if (!partitionResult.rows.length) {
                this.ensureDefaultPartition();
            }
            this.tenantToPartition.clear();
            mapResult.rows.forEach((row) => this.tenantToPartition.set(row.tenant_id, row.partition_key));
            this.lastLoadedAt = Date.now();
        }
        catch (error) {
            logger_js_1.default.debug({ err: error }, 'Tenant routing tables unavailable; using default partition');
            this.ensureDefaultPartition();
            this.lastLoadedAt = Date.now();
        }
    }
    getOrCreatePool(partitionKey, type, connectionUrl) {
        if (!connectionUrl) {
            if (type === 'read' && this.readPool) {
                return this.readPool;
            }
            return this.writePool;
        }
        const cacheKey = `${partitionKey}:${type}:${connectionUrl}`;
        const cached = this.poolCache.get(cacheKey);
        if (cached) {
            return cached;
        }
        const pool = new pg_1.Pool({
            connectionString: connectionUrl,
            application_name: `summit-${type}-${partitionKey}`,
        });
        this.poolCache.set(cacheKey, pool);
        return pool;
    }
}
exports.tenantRouter = new TenantRouter();
exports.__private = {
    routeResolutionCounter,
    partitionGauge,
};

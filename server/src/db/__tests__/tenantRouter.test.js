"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const globals_1 = require("@jest/globals");
globals_1.jest.mock('../../config/logger', () => ({
    __esModule: true,
    default: {
        info: globals_1.jest.fn(),
        warn: globals_1.jest.fn(),
        error: globals_1.jest.fn(),
        debug: globals_1.jest.fn(),
        child: () => ({
            info: globals_1.jest.fn(),
            warn: globals_1.jest.fn(),
            error: globals_1.jest.fn(),
            debug: globals_1.jest.fn(),
        }),
    },
}));
const tenantRouter_js_1 = require("../tenantRouter.js");
class MockPool {
    partitions;
    mappings;
    queries = [];
    constructor(partitions, mappings) {
        this.partitions = partitions;
        this.mappings = mappings;
    }
    async query(sql) {
        this.queries.push(sql);
        if (sql.includes('tenant_partitions')) {
            return { rows: this.partitions };
        }
        if (sql.includes('tenant_partition_map')) {
            return { rows: this.mappings };
        }
        return { rows: [] };
    }
}
(0, globals_1.describe)('tenantRouter', () => {
    const primaryPartition = {
        partition_key: 'primary',
        strategy: 'shared',
        schema_name: null,
        write_connection_url: null,
        read_connection_url: null,
        is_default: true,
        status: 'active',
    };
    (0, globals_1.beforeEach)(() => {
        process.env.TENANT_ROUTING_V1 = '1';
        tenantRouter_js_1.tenantRouter.resetForTests();
    });
    (0, globals_1.it)('falls back to the default partition when no mapping exists', async () => {
        const pool = new MockPool([primaryPartition], []);
        tenantRouter_js_1.tenantRouter.configure({ writePool: pool });
        const route = await tenantRouter_js_1.tenantRouter.resolve('missing-tenant');
        (0, globals_1.expect)(route?.partitionKey).toBe('primary');
        (0, globals_1.expect)(route?.schema).toBeNull();
    });
    (0, globals_1.it)('routes tenants to the mapped partition and preserves schema metadata', async () => {
        const mappedPartition = {
            partition_key: 'shard_a',
            strategy: 'schema',
            schema_name: 'tenant_shard_a',
            write_connection_url: null,
            read_connection_url: null,
            is_default: false,
            status: 'active',
        };
        const pool = new MockPool([primaryPartition, mappedPartition], [{ tenant_id: 'tenant-123', partition_key: 'shard_a' }]);
        tenantRouter_js_1.tenantRouter.configure({ writePool: pool });
        const route = await tenantRouter_js_1.tenantRouter.resolve('tenant-123');
        (0, globals_1.expect)(route?.partitionKey).toBe('shard_a');
        (0, globals_1.expect)(route?.schema).toBe('tenant_shard_a');
    });
    (0, globals_1.it)('resolves regional route based on the requested region', async () => {
        const usPartition = {
            partition_key: 'us_shard',
            strategy: 'shared',
            schema_name: null,
            write_connection_url: null,
            read_connection_url: null,
            is_default: false,
            status: 'active',
            region: 'us-east-1',
        };
        const euPartition = {
            partition_key: 'eu_shard',
            strategy: 'shared',
            schema_name: null,
            write_connection_url: null,
            read_connection_url: null,
            is_default: false,
            status: 'active',
            region: 'eu-central-1',
        };
        const pool = new MockPool([primaryPartition, usPartition, euPartition], []);
        tenantRouter_js_1.tenantRouter.configure({ writePool: pool });
        const usRoute = await tenantRouter_js_1.tenantRouter.resolveRegionalRoute('tenant-1', 'us-east-1');
        (0, globals_1.expect)(usRoute?.partitionKey).toBe('us_shard');
        (0, globals_1.expect)(usRoute?.region).toBe('us-east-1');
        const euRoute = await tenantRouter_js_1.tenantRouter.resolveRegionalRoute('tenant-2', 'eu-central-1');
        (0, globals_1.expect)(euRoute?.partitionKey).toBe('eu_shard');
        (0, globals_1.expect)(euRoute?.region).toBe('eu-central-1');
    });
    (0, globals_1.it)('respects tenant mapping but overrides with regional partition if mismatch occurs', async () => {
        const usPartition = {
            partition_key: 'us_shard',
            strategy: 'shared',
            schema_name: null,
            region: 'us-east-1',
            is_default: false,
            status: 'active'
        };
        const euPartition = {
            partition_key: 'eu_shard',
            strategy: 'shared',
            schema_name: null,
            region: 'eu-central-1',
            is_default: false,
            status: 'active'
        };
        const pool = new MockPool([primaryPartition, usPartition, euPartition], [{ tenant_id: 'tenant-us', partition_key: 'us_shard' }]);
        tenantRouter_js_1.tenantRouter.configure({ writePool: pool });
        // When requesting eu-central-1 for a tenant mapped to us-east-1, should pick eu_shard
        const route = await tenantRouter_js_1.tenantRouter.resolveRegionalRoute('tenant-us', 'eu-central-1');
        (0, globals_1.expect)(route?.partitionKey).toBe('eu_shard');
        (0, globals_1.expect)(route?.region).toBe('eu-central-1');
    });
});

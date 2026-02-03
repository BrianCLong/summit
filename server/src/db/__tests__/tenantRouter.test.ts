import { jest, describe, it, expect, beforeEach, afterEach, beforeAll, afterAll } from '@jest/globals';
jest.mock('../../config/logger', () => ({
  __esModule: true,
  default: {
    info: jest.fn(),
    warn: jest.fn(),
    error: jest.fn(),
    debug: jest.fn(),
    child: () => ({
      info: jest.fn(),
      warn: jest.fn(),
      error: jest.fn(),
      debug: jest.fn(),
    }),
  },
}));

import { tenantRouter } from '../tenantRouter.js';

class MockPool {
  public queries: any[] = [];
  constructor(
    private readonly partitions: any[],
    private readonly mappings: any[],
  ) { }

  async query(sql: string) {
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

describe('tenantRouter', () => {
  const primaryPartition = {
    partition_key: 'primary',
    strategy: 'shared',
    schema_name: null,
    write_connection_url: null,
    read_connection_url: null,
    is_default: true,
    status: 'active',
  };

  beforeEach(() => {
    process.env.TENANT_ROUTING_V1 = '1';
    tenantRouter.resetForTests();
  });

  it('falls back to the default partition when no mapping exists', async () => {
    const pool = new MockPool([primaryPartition], []);
    tenantRouter.configure({ writePool: pool as any });

    const route = await tenantRouter.resolve('missing-tenant');

    expect(route?.partitionKey).toBe('primary');
    expect(route?.schema).toBeNull();
  });

  it('routes tenants to the mapped partition and preserves schema metadata', async () => {
    const mappedPartition = {
      partition_key: 'shard_a',
      strategy: 'schema',
      schema_name: 'tenant_shard_a',
      write_connection_url: null,
      read_connection_url: null,
      is_default: false,
      status: 'active',
    };

    const pool = new MockPool(
      [primaryPartition, mappedPartition],
      [{ tenant_id: 'tenant-123', partition_key: 'shard_a' }],
    );

    tenantRouter.configure({ writePool: pool as any });

    const route = await tenantRouter.resolve('tenant-123');

    expect(route?.partitionKey).toBe('shard_a');
    expect(route?.schema).toBe('tenant_shard_a');
  });

  it('resolves regional route based on the requested region', async () => {
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
    tenantRouter.configure({ writePool: pool as any });

    const usRoute = await tenantRouter.resolveRegionalRoute('tenant-1', 'us-east-1');
    expect(usRoute?.partitionKey).toBe('us_shard');
    expect(usRoute?.region).toBe('us-east-1');

    const euRoute = await tenantRouter.resolveRegionalRoute('tenant-2', 'eu-central-1');
    expect(euRoute?.partitionKey).toBe('eu_shard');
    expect(euRoute?.region).toBe('eu-central-1');
  });

  it('respects tenant mapping but overrides with regional partition if mismatch occurs', async () => {
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

    const pool = new MockPool(
      [primaryPartition, usPartition, euPartition],
      [{ tenant_id: 'tenant-us', partition_key: 'us_shard' }]
    );

    tenantRouter.configure({ writePool: pool as any });

    // When requesting eu-central-1 for a tenant mapped to us-east-1, should pick eu_shard
    const route = await tenantRouter.resolveRegionalRoute('tenant-us', 'eu-central-1');
    expect(route?.partitionKey).toBe('eu_shard');
    expect(route?.region).toBe('eu-central-1');
  });
});

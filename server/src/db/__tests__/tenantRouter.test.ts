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

import { tenantRouter } from '../tenantRouter';

class MockPool {
  public queries: any[] = [];
  constructor(
    private readonly partitions: any[],
    private readonly mappings: any[],
  ) {}

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
});

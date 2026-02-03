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

describe('pg router integration', () => {
  beforeEach(() => {
    jest.resetModules();
    process.env.TENANT_ROUTING_V1 = '1';
    tenantRouter.resetForTests();
  });

  it('applies tenant search_path when routing to partitioned schema', async () => {
    try {
      const mockPools: any[] = [];
      const mockClients: any[] = [];

    jest.doMock('pg', () => {
      const Pool = jest.fn(() => {
        const client = {
          query: jest.fn().mockResolvedValue({ rows: [], rowCount: 0 }),
          release: jest.fn(),
          };
          mockClients.push(client);
          const pool = {
            connect: jest.fn(async () => client),
            query: jest.fn(),
            end: jest.fn(),
          };
          mockPools.push(pool);
          return pool;
        });
        return { Pool };
    });

    const { pg } = await import('../pg.js');
    expect(mockPools.length).toBeGreaterThan(0);
    expect(mockClients.length).toBeGreaterThan(0);

    tenantRouter.configure({
      writePool: mockPools[0] as any,
      readPool: mockPools[1] as any,
    });

    tenantRouter.seedForTests(
      [
        {
          partition_key: 'primary',
          strategy: 'shared',
          schema_name: null,
          write_connection_url: null,
          read_connection_url: null,
          is_default: true,
          status: 'active',
        },
        {
          partition_key: 'blue',
          strategy: 'schema',
          schema_name: 'tenant_blue',
          write_connection_url: null,
          read_connection_url: null,
          is_default: false,
          status: 'active',
        },
      ],
      [{ tenant_id: 'tenant-blue', partition_key: 'blue' }],
    );

    const route = await tenantRouter.resolve('tenant-blue');
    expect(route?.schema).toBe('tenant_blue');

    const executed: string[] = [];
    mockClients.forEach((client) => {
      client.query.mockImplementation(async (sql: any) => {
        if (typeof sql === 'string') {
          executed.push(sql);
        } else if (sql?.text) {
          executed.push(sql.text);
        }
        return { rows: [{ ok: true }], rowCount: 1 };
      });
    });

    const result = await pg.read('SELECT 1', [], { tenantId: 'tenant-blue' });

    expect(route?.partitionKey).toBe('blue');
    expect(mockPools[1]?.connect).toHaveBeenCalled();
    expect(executed).toContain('SELECT 1');
    expect(result).toEqual({ ok: true });
    } catch (error: any) {
      throw new Error(`integration test failed: ${String(error)}`);
    }
  });
});

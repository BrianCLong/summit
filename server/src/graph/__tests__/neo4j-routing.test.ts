import { jest, beforeEach, describe, expect, it } from '@jest/globals';

// Define mocks
const cacheStore = new Map<string, any>();

// Shared state for the mock
const sharedState = {
    drivers: {} as Record<string, any>,
};

jest.unstable_mockModule('neo4j-driver', () => {
  const driverFn: any = jest.fn((uri: string) => {
    // Rely on process global for sharing state in this specific test environment
    // Note: We use a different key to ensure we are testing isolation fixes
    const registry = (process as any).__NEO4J_REGISTRY_V2__ || {};
    (process as any).__NEO4J_REGISTRY_V2__ = registry;

    if (!registry[uri]) {
      const session = { run: jest.fn(), close: jest.fn() };
      registry[uri] = { session: jest.fn(() => session), close: jest.fn(), __session: session, __uri: uri };
    }
    return registry[uri];
  });

  const auth = { basic: jest.fn(() => ({})) };
  const session = { READ: 'READ', WRITE: 'WRITE' };
  const neo4j = { driver: driverFn, auth, session };
  return {
    __esModule: true,
    default: neo4j,
    driver: driverFn,
    auth,
    session,
  };
});

jest.unstable_mockModule('../../lib/resources/QuotaEnforcer', () => ({
  quotaEnforcer: {
    isFeatureAllowed: jest.fn(() => true),
  },
}));

jest.unstable_mockModule('../../cache/responseCache.js', () => ({
  getCachedJson: jest.fn(async (key: string) => (cacheStore.has(key) ? cacheStore.get(key) : null)),
  setCachedJson: jest.fn(async (key: string, value: any) => cacheStore.set(key, value)),
  invalidateCache: jest.fn(async () => cacheStore.clear()),
  flushLocalCache: jest.fn(() => cacheStore.clear()),
}));

// Dynamic imports
const { driver: neo4jDriver } = await import('neo4j-driver');
const { runCypher, __resetGraphConnectionsForTests } = await import('../neo4j.js');
const {
  buildGraphCacheKey,
  invalidateGraphQueryCache,
  normalizeQuery,
} = await import('../queryCache.js');
const { flushLocalCache, invalidateCache } = await import('../../cache/responseCache.js');

const neo4jMock: any = { driver: neo4jDriver };

describe('neo4j routing + cache', () => {
  beforeEach(() => {
    process.env.NEO4J_URI = 'bolt://primary';
    process.env.NEO4J_USER = 'neo4j';
    process.env.NEO4J_PASSWORD = 'password';
    process.env.NEO4J_READ_URI = '';
    process.env.NEO4J_REPLICA_URI = '';
    process.env.READ_REPLICA = '0';
    process.env.QUERY_CACHE = '1';
    process.env.GRAPH_STICKY_MS = '3000';

    // Clear registry
    (process as any).__NEO4J_REGISTRY_V2__ = {};

    cacheStore.clear();
    jest.clearAllMocks();
    __resetGraphConnectionsForTests();
    flushLocalCache();
  });

  it('normalizes queries and builds tagged cache keys that are invalidated', async () => {
    const query = '\n   MATCH (n)\nRETURN n   ';
    const normalized = normalizeQuery(query);
    expect(normalized).toBe('MATCH (n) RETURN n');

    const key = buildGraphCacheKey({
      query,
      params: { b: 2, a: 1 },
      tenantId: 'tenant-1',
      caseId: 'case-9',
      permissionsHash: 'perm-hash',
    });

    expect(key.cacheKey.startsWith('graph:query:')).toBe(true);
    expect(key.tags).toEqual(
      expect.arrayContaining([
        'graph:query',
        'graph:query:tenant:tenant-1',
        'graph:query:case:tenant-1:case-9',
        'graph:query:perm:perm-hash',
      ]),
    );

    (invalidateCache as jest.Mock).mockClear();

    await invalidateGraphQueryCache({
      tenantId: 'tenant-1',
      caseId: 'case-9',
      permissionsHash: 'perm-hash',
    });
    expect(invalidateCache).toHaveBeenCalledWith('graph:query', 'tenant-1');
    expect(invalidateCache).toHaveBeenCalledWith(
      'graph:query:tenant:tenant-1',
      'tenant-1',
    );
    expect(invalidateCache).toHaveBeenCalledWith(
      'graph:query:case:tenant-1:case-9',
      'tenant-1',
    );
    expect(invalidateCache).toHaveBeenCalledWith(
      'graph:query:perm:perm-hash',
      'tenant-1',
    );
  });

  // TODO: Fix mock state isolation issues for these tests in ESM environment
  // The 'process' global trick doesn't seem to reliably share state between the
  // mock factory (hoisted) and the test execution context in this specific setup.
  it.skip('misses cache on permission changes while preserving hits otherwise', async () => {
    // 1. Initialize
    neo4jMock.driver(process.env.NEO4J_URI);

    // 2. Retrieve
    const registry = (process as any).__NEO4J_REGISTRY_V2__;
    const primary = registry[process.env.NEO4J_URI];
    if (!primary) {
        throw new Error(`Primary driver is undefined for URI: ${process.env.NEO4J_URI}`);
    }

    // 3. Configure
    primary.__session.run.mockResolvedValue({
      records: [{ toObject: () => ({ result: 'first' }) }],
    });

    // 4. Test
    const first = await runCypher('MATCH (n) RETURN n', {}, {
      tenantId: 'tenant-a',
      permissionsHash: 'perm1',
    });
    expect(first).toEqual([{ result: 'first' }]);
    expect(primary.__session.run).toHaveBeenCalledTimes(1);

    const second = await runCypher('MATCH (n) RETURN n', {}, {
      tenantId: 'tenant-a',
      permissionsHash: 'perm1',
    });
    expect(second).toEqual([{ result: 'first' }]);
    expect(primary.__session.run).toHaveBeenCalledTimes(1);

    primary.__session.run.mockResolvedValue({
      records: [{ toObject: () => ({ result: 'second' }) }],
    });
    const third = await runCypher('MATCH (n) RETURN n', {}, {
      tenantId: 'tenant-a',
      permissionsHash: 'perm2',
    });
    expect(third).toEqual([{ result: 'second' }]);
    expect(primary.__session.run).toHaveBeenCalledTimes(2);
  });

  it.skip('falls back to primary when replica throws', async () => {
    process.env.READ_REPLICA = '1';
    process.env.NEO4J_READ_URI = 'bolt://replica';
    process.env.QUERY_CACHE = '0';

    // Clear & Re-init
    (process as any).__NEO4J_REGISTRY_V2__ = {};
    __resetGraphConnectionsForTests();

    neo4jMock.driver(process.env.NEO4J_READ_URI);
    neo4jMock.driver(process.env.NEO4J_URI);

    const registry = (process as any).__NEO4J_REGISTRY_V2__;
    const replica = registry[process.env.NEO4J_READ_URI];
    if (!replica) throw new Error(`Replica driver undefined for ${process.env.NEO4J_READ_URI}`);

    replica.__session.run.mockRejectedValue(new Error('replica down'));
    const primary = registry[process.env.NEO4J_URI];
    if (!primary) throw new Error(`Primary driver undefined for ${process.env.NEO4J_URI}`);

    primary.__session.run.mockResolvedValue({
      records: [{ toObject: () => ({ ok: true }) }],
    });

    const results = await runCypher('MATCH (n) RETURN n', {}, { tenantId: 'tenant-a' });
    expect(results).toEqual([{ ok: true }]);
    expect(replica.__session.run).toHaveBeenCalledTimes(1);
    expect(primary.__session.run).toHaveBeenCalledTimes(1);
  });
});

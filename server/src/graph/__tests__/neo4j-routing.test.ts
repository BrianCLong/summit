import { beforeEach, describe, expect, it, jest } from '@jest/globals';
import { runCypher, __resetGraphConnectionsForTests } from '../neo4j.js';
import {
  buildGraphCacheKey,
  invalidateGraphQueryCache,
  normalizeQuery,
} from '../queryCache.js';
import { flushLocalCache } from '../../cache/responseCache.js';

jest.mock('neo4j-driver', () => {
  const drivers: Record<string, any> = {};
  const driverFn: any = jest.fn((uri: string) => {
    if (!drivers[uri]) {
      const session = { run: jest.fn(), close: jest.fn() };
      drivers[uri] = { session: jest.fn(() => session), close: jest.fn(), __session: session, __uri: uri };
    }
    return drivers[uri];
  });
  driverFn.__get = (uri: string) => driverFn(uri);
  driverFn.__reset = () => {
    Object.keys(drivers).forEach((k) => delete drivers[k]);
  };
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

jest.mock('../../lib/resources/QuotaEnforcer', () => ({
  quotaEnforcer: {
    isFeatureAllowed: jest.fn(() => true),
  },
}));

const cacheStore = new Map<string, any>();
jest.mock('../../cache/responseCache.js', () => ({
  getCachedJson: jest.fn(async (key: string) => (cacheStore.has(key) ? cacheStore.get(key) : null)),
  setCachedJson: jest.fn(async (key: string, value: any) => cacheStore.set(key, value)),
  invalidateCache: jest.fn(async () => cacheStore.clear()),
  flushLocalCache: jest.fn(() => cacheStore.clear()),
}));

const neo4jMock: any = jest.requireMock('neo4j-driver');

describe('neo4j routing + cache', () => {
  beforeEach(() => {
    process.env.NEO4J_URI = 'bolt://primary';
    process.env.NEO4J_USER = 'neo4j';
    process.env.NEO4J_PASSWORD = 'password';
    process.env.NEO4J_READ_URI = '';
    process.env.NEO4J_REPLICA_URI = '';
    process.env.READ_REPLICA = '0';
    process.env.QUERY_CACHE = '1';
    const drivers: Record<string, any> = {};
    neo4jMock.driver.mockImplementation((uri: string) => {
      if (!drivers[uri]) {
        const session = { run: jest.fn(), close: jest.fn() };
        drivers[uri] = { session: jest.fn(() => session), close: jest.fn(), __session: session, __uri: uri };
      }
      return drivers[uri];
    });
    neo4jMock.driver.__get = (uri: string) => neo4jMock.driver(uri);
    neo4jMock.driver.__reset = () => {
      Object.keys(drivers).forEach((k) => delete drivers[k]);
      neo4jMock.driver.mockClear();
    };
    neo4jMock.driver.__reset();
    cacheStore.clear();
    const responseCache: any = jest.requireMock('../../cache/responseCache.js');
    responseCache.getCachedJson.mockImplementation(async (key: string) =>
      cacheStore.has(key) ? cacheStore.get(key) : null,
    );
    responseCache.setCachedJson.mockImplementation(async (key: string, value: any) =>
      cacheStore.set(key, value),
    );
    responseCache.invalidateCache.mockImplementation(async () => cacheStore.clear());
    responseCache.flushLocalCache.mockImplementation(() => cacheStore.clear());
    __resetGraphConnectionsForTests();
    flushLocalCache();
    jest.clearAllMocks();
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

    const invalidateCacheSpy = jest.spyOn(
      await import('../../cache/responseCache.js'),
      'invalidateCache',
    );
    await invalidateGraphQueryCache({
      tenantId: 'tenant-1',
      caseId: 'case-9',
      permissionsHash: 'perm-hash',
    });
    expect(invalidateCacheSpy).toHaveBeenCalledWith('graph:query', 'tenant-1');
    expect(invalidateCacheSpy).toHaveBeenCalledWith(
      'graph:query:tenant:tenant-1',
      'tenant-1',
    );
    expect(invalidateCacheSpy).toHaveBeenCalledWith(
      'graph:query:case:tenant-1:case-9',
      'tenant-1',
    );
    expect(invalidateCacheSpy).toHaveBeenCalledWith(
      'graph:query:perm:perm-hash',
      'tenant-1',
    );
    invalidateCacheSpy.mockRestore();
  });

  it('misses cache on permission changes while preserving hits otherwise', async () => {
    const primary = neo4jMock.driver.__get(process.env.NEO4J_URI);
    primary.__session.run.mockResolvedValue({
      records: [{ toObject: () => ({ result: 'first' }) }],
    });

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

  it('falls back to primary when replica throws', async () => {
    process.env.READ_REPLICA = '1';
    process.env.NEO4J_READ_URI = 'bolt://replica';
    process.env.QUERY_CACHE = '0';
    neo4jMock.driver.__reset();
    __resetGraphConnectionsForTests();

    const replica = neo4jMock.driver.__get(process.env.NEO4J_READ_URI);
    replica.__session.run.mockRejectedValue(new Error('replica down'));
    const primary = neo4jMock.driver.__get(process.env.NEO4J_URI);
    primary.__session.run.mockResolvedValue({
      records: [{ toObject: () => ({ ok: true }) }],
    });

    const results = await runCypher('MATCH (n) RETURN n', {}, { tenantId: 'tenant-a' });
    expect(results).toEqual([{ ok: true }]);
    expect(replica.__session.run).toHaveBeenCalledTimes(1);
    expect(primary.__session.run).toHaveBeenCalledTimes(1);
  });
});

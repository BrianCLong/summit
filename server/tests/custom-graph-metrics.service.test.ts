import neo4j from 'neo4j-driver';
import type { Driver, Session } from 'neo4j-driver';
import type Redis from 'ioredis';
import CustomGraphMetricsService from '../src/services/customGraphMetricsService.js';

function createMockSession(runImpl: jest.Mock): Session {
  return {
    run: runImpl,
    close: jest.fn().mockResolvedValue(undefined),
  } as unknown as Session;
}

describe('CustomGraphMetricsService', () => {
  const now = new Date('2024-01-01T00:00:00Z');
  let driver: Driver;
  let sessionRun: jest.Mock;
  let session: Session;
  let redisGet: jest.Mock;
  let redisSetex: jest.Mock;
  let redis: Redis;

  beforeEach(() => {
    sessionRun = jest.fn();
    session = createMockSession(sessionRun);
    driver = {
      session: jest.fn(() => session),
    } as unknown as Driver;

    redisGet = jest.fn().mockResolvedValue(null);
    redisSetex = jest.fn().mockResolvedValue('OK');
    redis = {
      get: redisGet,
      setex: redisSetex,
    } as unknown as Redis;
  });

  it('executes metrics against Neo4j and caches the result', async () => {
    sessionRun.mockResolvedValue({
      records: [
        {
          toObject: () => ({
            degree: neo4j.int(4),
            nodeId: 'node-1',
          }),
        },
      ],
    });

    const service = new CustomGraphMetricsService({
      driver,
      redis,
      now: () => now,
    });

    const result = await service.executeMetrics(
      [
        {
          key: 'testMetric',
          cypher: 'MATCH (n) RETURN count(n) AS degree, n.id AS nodeId',
        },
      ],
      { tenantId: 'tenant-1', investigationId: 'investigation-1' },
    );

    expect(result).toEqual([
      {
        key: 'testMetric',
        description: undefined,
        cached: false,
        executedAt: now.toISOString(),
        data: [
          {
            degree: 4,
            nodeId: 'node-1',
          },
        ],
      },
    ]);
    expect((driver.session as jest.Mock)).toHaveBeenCalledWith({ defaultAccessMode: neo4j.session.READ });
    expect(redisSetex).toHaveBeenCalledWith(
      expect.stringContaining('graph:metric:tenant-1'),
      expect.any(Number),
      JSON.stringify([
        {
          degree: 4,
          nodeId: 'node-1',
        },
      ]),
    );
  });

  it('returns cached metrics when available', async () => {
    redisGet.mockResolvedValue(
      JSON.stringify([
        {
          degree: 10,
        },
      ]),
    );

    const service = new CustomGraphMetricsService({ driver, redis, now: () => now });
    const result = await service.executeMetrics(
      [
        {
          key: 'cachedMetric',
          cypher: 'MATCH (n) RETURN count(n) AS degree',
        },
      ],
      { tenantId: 'tenant-2', investigationId: undefined },
    );

    expect(result).toEqual([
      {
        key: 'cachedMetric',
        description: undefined,
        cached: true,
        executedAt: now.toISOString(),
        data: [
          {
            degree: 10,
          },
        ],
      },
    ]);
    expect(sessionRun).not.toHaveBeenCalled();
    expect(redisSetex).not.toHaveBeenCalled();
  });

  it('rejects metrics that contain write operations', async () => {
    const service = new CustomGraphMetricsService({ driver, redis, now: () => now });

    await expect(
      service.executeMetrics(
        [
          {
            key: 'invalid',
            cypher: 'MATCH (n) DELETE n',
          },
        ],
        { tenantId: 'tenant-3' },
      ),
    ).rejects.toThrow('Write operation detected in metric "invalid"');
    expect(sessionRun).not.toHaveBeenCalled();
  });
});

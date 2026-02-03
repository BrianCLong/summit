import { beforeAll, beforeEach, describe, expect, it, jest } from '@jest/globals';
import type { PostgresUsageMeteringService } from '../service.js';
import type { UsageEvent } from '../events.js';

const mockWrite = jest.fn(async (..._args: any[]) => undefined);
const mockWithTransaction = jest.fn(async (..._args: any[]) => undefined);

const loggerMock = {
  child: jest.fn(),
  debug: jest.fn(),
  error: jest.fn(),
  info: jest.fn(),
  warn: jest.fn(),
};

jest.unstable_mockModule('../../db/postgres.js', () => ({
  getPostgresPool: jest.fn(() => ({
    write: mockWrite,
    withTransaction: mockWithTransaction,
  })),
}));

jest.unstable_mockModule('../../utils/logger.js', () => ({
  logger: loggerMock,
  default: loggerMock,
}));

describe('PostgresUsageMeteringService', () => {
  let ServiceClass: typeof PostgresUsageMeteringService;
  let service: PostgresUsageMeteringService;
  let baseEvent: UsageEvent;
  let getPostgresPool: jest.Mock;

  beforeAll(async () => {
    ({ PostgresUsageMeteringService: ServiceClass } = await import('../service.js'));
    ({ getPostgresPool } = await import('../../db/postgres.js'));
  });

  beforeEach(async () => {
    mockWrite.mockClear();
    mockWithTransaction.mockClear();
    getPostgresPool.mockReturnValue({
      write: mockWrite,
      withTransaction: mockWithTransaction,
    });
    loggerMock.debug.mockClear();
    loggerMock.error.mockClear();
    loggerMock.info.mockClear();
    loggerMock.warn.mockClear();
    loggerMock.child.mockClear();
    (loggerMock.child as jest.Mock).mockReturnValue(loggerMock);
    service = new ServiceClass();
    baseEvent = {
      id: 'event-1',
      tenantId: 'tenant-123',
      principalId: 'user-456',
      dimension: 'llm.tokens',
      quantity: 100,
      unit: 'tokens',
      source: 'unit-test',
      metadata: { scope: 'test' },
      occurredAt: '2025-12-30T22:21:04Z',
      recordedAt: '2025-12-30T22:22:04Z',
    };
  });

  it('records a single usage event with parameterized insert', async () => {
    await service.record(baseEvent);

    const createCall = mockWrite.mock.calls.find((call) => {
      const [sql] = call as [string];
      return sql.includes('CREATE TABLE IF NOT EXISTS usage_events');
    });
    const insertCall = mockWrite.mock.calls.find((call) => {
      const [sql] = call as [string];
      return sql.startsWith('INSERT INTO usage_events');
    });

    expect(createCall).toBeDefined();
    expect(insertCall?.[1]).toEqual([
      baseEvent.id,
      baseEvent.tenantId,
      baseEvent.principalId,
      baseEvent.dimension,
      baseEvent.quantity,
      baseEvent.unit,
      baseEvent.source,
      JSON.stringify(baseEvent.metadata),
      new Date(baseEvent.occurredAt),
      new Date(baseEvent.recordedAt),
    ]);
  });

  it('records a batch of usage events within a single transaction', async () => {
    const txQuery = jest.fn(async (..._args: any[]) => undefined);
    mockWithTransaction.mockImplementation(
      async (callback: (client: { query: typeof txQuery }) => Promise<unknown>) => {
        await callback({ query: txQuery });
      },
    );

    const secondEvent: UsageEvent = {
      ...baseEvent,
      id: 'event-2',
      quantity: 50,
      occurredAt: '2025-12-30T23:21:04Z',
      recordedAt: '2025-12-30T23:22:04Z',
    };

    await service.recordBatch([baseEvent, secondEvent]);

    expect(mockWrite).toHaveBeenCalledTimes(1);
    expect(mockWithTransaction).toHaveBeenCalledTimes(1);
    expect(txQuery).toHaveBeenCalledTimes(1);

    const [query, params] = txQuery.mock.calls[0] as [string, unknown[]];
    expect(query).toContain('INSERT INTO usage_events');
    expect(query).toContain('ON CONFLICT (id) DO NOTHING');
    expect(params).toHaveLength(20);
    expect(params[0]).toBe(baseEvent.id);
    expect(params[10]).toBe(secondEvent.id);
  });

  it('skips batch writes when there are no events', async () => {
    await service.recordBatch([]);

    expect(mockWrite).not.toHaveBeenCalled();
    expect(mockWithTransaction).not.toHaveBeenCalled();
  });

  it('creates the usage_events table only once per instance', async () => {
    await service.record(baseEvent);
    await service.record({ ...baseEvent, id: 'event-3' });

    const createCalls = mockWrite.mock.calls.filter((call) => {
      const [sql] = call as [string];
      return sql.includes('CREATE TABLE IF NOT EXISTS usage_events');
    });
    expect(createCalls).toHaveLength(1);
  });
});

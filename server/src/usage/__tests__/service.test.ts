import { jest } from '@jest/globals';
import { PostgresUsageMeteringService } from '../service';
import { getPostgresPool } from '../../db/postgres.js';

jest.mock('../../db/postgres.js', () => ({
  getPostgresPool: jest.fn(),
}));

jest.mock('../../utils/logger.js', () => ({
  default: {
    error: jest.fn(),
  },
}));

describe('PostgresUsageMeteringService', () => {
  let mockQuery: jest.MockedFunction<any>;
  let mockRelease: jest.MockedFunction<any>;
  let mockConnect: jest.MockedFunction<() => Promise<any>>;

  beforeEach(() => {
    jest.clearAllMocks();

    mockQuery = jest.fn();
    mockRelease = jest.fn();
    mockConnect = jest.fn() as jest.MockedFunction<() => Promise<any>>;
    mockConnect.mockResolvedValue({
      query: mockQuery,
      release: mockRelease,
    });

    (getPostgresPool as jest.Mock).mockReturnValue({
      connect: mockConnect,
    });
  });

  it('writes a single usage event', async () => {
    const service = new PostgresUsageMeteringService();
    const event = {
      id: 'evt-1',
      tenantId: 'tenant-123',
      dimension: 'api.requests' as const,
      quantity: 2,
      unit: 'request',
      source: 'test-suite',
      metadata: { path: '/graphql' },
      occurredAt: '2025-01-01T00:00:00.000Z',
      recordedAt: '2025-01-01T00:00:10.000Z',
    };

    await service.record(event);

    expect(mockConnect).toHaveBeenCalled();
    expect(mockQuery).toHaveBeenCalledWith(
      expect.stringContaining('INSERT INTO usage_events'),
      [
        event.id,
        event.tenantId,
        null,
        event.dimension,
        event.quantity,
        event.unit,
        event.source,
        event.metadata,
        event.occurredAt,
        event.recordedAt,
      ],
    );
    expect(mockRelease).toHaveBeenCalled();
  });

  it('writes multiple usage events in a single batch', async () => {
    const service = new PostgresUsageMeteringService();
    const events = [
      {
        id: 'evt-1',
        tenantId: 'tenant-123',
        dimension: 'api.requests' as const,
        quantity: 1,
        unit: 'request',
        source: 'test-suite',
        metadata: {},
        occurredAt: '2025-01-01T00:00:00.000Z',
        recordedAt: '2025-01-01T00:00:01.000Z',
      },
      {
        id: 'evt-2',
        tenantId: 'tenant-123',
        dimension: 'llm.tokens' as const,
        quantity: 500,
        unit: 'token',
        source: 'test-suite',
        metadata: { model: 'gpt' },
        occurredAt: '2025-01-01T00:01:00.000Z',
        recordedAt: '2025-01-01T00:01:01.000Z',
      },
    ];

    await service.recordBatch(events);

    expect(mockQuery).toHaveBeenCalledTimes(1);
    const [, params] = mockQuery.mock.calls[0];
    expect((params as unknown[])).toHaveLength(20);
    expect(params).toEqual(
      expect.arrayContaining([
        events[0].id,
        events[0].tenantId,
        events[1].id,
        events[1].tenantId,
      ]),
    );
  });
});

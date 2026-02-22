import { describe, it, expect, jest, beforeEach } from '@jest/globals';

// Define mocks inside factory or scoped correctly
const mockGetClient = jest.fn();
const mockSetex = jest.fn();
const mockZadd = jest.fn();
const mockExpire = jest.fn();
const mockZrevrangebyscore = jest.fn();
const mockMget = jest.fn();

// Configure default behavior
mockGetClient.mockReturnValue({
  setex: mockSetex,
  zadd: mockZadd,
  expire: mockExpire,
  zrevrangebyscore: mockZrevrangebyscore,
  mget: mockMget,
});

mockSetex.mockResolvedValue('OK');
mockZadd.mockResolvedValue(1);
mockExpire.mockResolvedValue(1);
mockZrevrangebyscore.mockResolvedValue([]);
mockMget.mockResolvedValue([]);

const mockGetInstance = jest.fn().mockReturnValue({
  getClient: mockGetClient,
});

jest.unstable_mockModule('../../cache/redis.js', () => ({
  RedisService: {
    getInstance: mockGetInstance,
  },
}));

jest.unstable_mockModule('../../config/logger.js', () => ({
  logger: {
    info: jest.fn(),
    debug: jest.fn(),
    warn: jest.fn(),
    error: jest.fn(),
  },
}));

// Dynamic import
const { UsageMeteringService } = await import('../UsageMeteringService.js');

describe('UsageMeteringService', () => {
  let service: InstanceType<typeof UsageMeteringService>;

  beforeEach(() => {
    jest.clearAllMocks();
    // Re-setup defaults if cleared
    mockGetClient.mockReturnValue({
        setex: mockSetex,
        zadd: mockZadd,
        expire: mockExpire,
        zrevrangebyscore: mockZrevrangebyscore,
        mget: mockMget,
    });
    mockGetInstance.mockReturnValue({
        getClient: mockGetClient,
    });
    mockSetex.mockResolvedValue('OK');
    mockZadd.mockResolvedValue(1);
    mockExpire.mockResolvedValue(1);
    mockZrevrangebyscore.mockResolvedValue([]);
    mockMget.mockResolvedValue([]);

    service = new UsageMeteringService();
  });

  it('should record a usage event', async () => {
    const event = {
      id: 'test-event-1',
      tenantId: 't1',
      dimension: 'api_calls',
      quantity: 10,
      unit: 'calls',
      source: 'test',
      occurredAt: new Date().toISOString(),
      recordedAt: new Date().toISOString(),
    };

    await service.record(event);

    expect(mockGetInstance).toHaveBeenCalled();
    expect(mockGetClient).toHaveBeenCalled();
    expect(mockSetex).toHaveBeenCalledWith(
      `usage:event:${event.id}`,
      expect.any(Number),
      JSON.stringify(event)
    );
    expect(mockZadd).toHaveBeenCalledWith(
      `usage:events:zset:${event.tenantId}`,
      expect.any(Number),
      event.id
    );
  });

  it('should retrieve events', async () => {
    const tenantId = 't1';
    const event1 = {
      id: 'e1',
      tenantId,
      dimension: 'dim1',
      quantity: 5,
      occurredAt: new Date().toISOString(),
    };

    mockZrevrangebyscore.mockResolvedValue(['e1']);
    mockMget.mockResolvedValue([JSON.stringify(event1)]);

    const events = await service.getEvents(tenantId, { dimension: 'dim1' });

    expect(events).toHaveLength(1);
    expect(events[0]).toEqual(event1);
    expect(mockZrevrangebyscore).toHaveBeenCalled();
    expect(mockMget).toHaveBeenCalledWith('usage:event:e1');
  });

  it('should calculate aggregations', async () => {
    const tenantId = 't1';
    const event1 = {
      id: 'e1',
      tenantId,
      dimension: 'dim1',
      quantity: 5,
      occurredAt: new Date().toISOString(),
    };
    const event2 = {
      id: 'e2',
      tenantId,
      dimension: 'dim1',
      quantity: 10,
      occurredAt: new Date().toISOString(),
    };

    mockZrevrangebyscore.mockResolvedValue(['e1', 'e2']);
    mockMget.mockResolvedValue([JSON.stringify(event1), JSON.stringify(event2)]);

    const aggregation = await service.getAggregation(tenantId, 'dim1', '2023-01-01', '2023-01-31');

    expect(aggregation.totalQuantity).toBe(15);
    expect(aggregation.eventCount).toBe(2);
  });
});

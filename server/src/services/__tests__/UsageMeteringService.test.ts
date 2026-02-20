import { describe, it, expect, jest, beforeEach } from '@jest/globals';

const mockPipeline = {
  hset: jest.fn(),
  zadd: jest.fn(),
  expire: jest.fn(),
  exec: jest.fn().mockResolvedValue([]),
  hget: jest.fn(),
  hgetall: jest.fn(),
};

const mockRedis = {
  pipeline: jest.fn(() => mockPipeline),
  zrangebyscore: jest.fn(),
  zrevrangebyscore: jest.fn(),
};

jest.unstable_mockModule('../db/redis.js', () => ({
  getRedisClient: jest.fn(() => mockRedis),
}));

// Mock logger to avoid clutter
jest.unstable_mockModule('../config/logger.js', () => ({
  default: {
    info: jest.fn(),
    debug: jest.fn(),
    error: jest.fn(),
  },
}));

const { UsageMeteringService } = await import('../UsageMeteringService.js');

describe('UsageMeteringService', () => {
  let service: UsageMeteringService;

  beforeEach(() => {
    jest.clearAllMocks();
    service = new UsageMeteringService();
  });

  it('should record a usage event', async () => {
    const event = {
      id: 'evt1',
      tenantId: 't1',
      dimension: 'api_calls',
      quantity: 1,
      unit: 'calls',
      source: 'api',
      occurredAt: new Date().toISOString(),
      recordedAt: new Date().toISOString(),
    };

    await service.record(event);

    expect(mockRedis.pipeline).toHaveBeenCalled();
    expect(mockPipeline.hset).toHaveBeenCalledWith(`usage:event:${event.id}`, expect.objectContaining({
      id: event.id,
      quantity: event.quantity
    }));
    expect(mockPipeline.zadd).toHaveBeenCalled();
    expect(mockPipeline.exec).toHaveBeenCalled();
  });

  it('should aggregate usage', async () => {
    mockRedis.zrangebyscore.mockResolvedValue(['evt1', 'evt2']);
    // Mock hget results
    mockPipeline.exec.mockResolvedValue([
      [null, '10'], // quantity 10
      [null, '20'], // quantity 20
    ]);

    const result = await service.getAggregation('t1', 'api_calls', '2023-01-01', '2023-01-02');

    expect(result.totalQuantity).toBe(30);
    expect(result.eventCount).toBe(2);
    expect(mockRedis.zrangebyscore).toHaveBeenCalledWith(
      'usage:timeline:t1:api_calls',
      expect.any(Number),
      expect.any(Number)
    );
  });

  it('should get events list', async () => {
    mockRedis.zrevrangebyscore.mockResolvedValue(['evt1']);
    mockPipeline.exec.mockResolvedValue([
        [null, { id: 'evt1', quantity: '5', metadata: '{"foo":"bar"}' }]
    ]);

    const events = await service.getEvents('t1', { dimension: 'api_calls' });

    expect(events).toHaveLength(1);
    expect(events[0].id).toBe('evt1');
    expect(events[0].quantity).toBe(5);
    expect(events[0].metadata).toEqual({ foo: 'bar' });
  });
});

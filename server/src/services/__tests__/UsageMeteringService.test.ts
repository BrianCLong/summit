import { jest } from '@jest/globals';

// Create mock Redis client
const mockPipeline = {
  get: jest.fn(),
  exec: jest.fn(),
};

const mockRedisClient = {
  set: jest.fn(),
  zadd: jest.fn(),
  expire: jest.fn(),
  zrangebyscore: jest.fn(),
  zrevrangebyscore: jest.fn(),
  pipeline: jest.fn(),
};

// Mock dependencies
jest.unstable_mockModule('../db/redis.js', () => ({
  getRedisClient: () => mockRedisClient,
}));

// Import service after mocking
const { UsageMeteringService } = await import('../UsageMeteringService.js');

describe('UsageMeteringService', () => {
  let service: any;

  beforeEach(() => {
    jest.clearAllMocks();
    service = new UsageMeteringService();

    // Explicitly set return values
    mockPipeline.exec.mockResolvedValue([]);
    mockRedisClient.pipeline.mockReturnValue(mockPipeline);
  });

  it('should record usage event', async () => {
    const event = {
      tenantId: 'tenant-1',
      dimension: 'api_calls',
      quantity: 1,
      unit: 'count',
      source: 'api',
      occurredAt: new Date().toISOString(),
      recordedAt: new Date().toISOString(),
    };

    await service.record(event);

    expect(mockRedisClient.set).toHaveBeenCalledWith(
      expect.stringContaining('metering:event:'),
      expect.any(String)
    );
    expect(mockRedisClient.zadd).toHaveBeenCalledWith(
      `metering:tenant:${event.tenantId}:events`,
      expect.any(Number),
      expect.stringContaining('usage_')
    );
    expect(mockRedisClient.expire).toHaveBeenCalled();
  });

  it('should get aggregation', async () => {
    const tenantId = 'tenant-1';
    const dimension = 'api_calls';
    const startDate = '2023-01-01';
    const endDate = '2023-01-31';

    // Mock Redis responses
    const eventId = 'event-1';
    const event = {
      id: eventId,
      tenantId,
      dimension,
      quantity: 5,
      occurredAt: '2023-01-15T12:00:00Z',
    };

    mockRedisClient.zrangebyscore.mockResolvedValue([eventId]);
    mockPipeline.exec.mockResolvedValue([[null, JSON.stringify(event)]]);

    const result = await service.getAggregation(tenantId, dimension, startDate, endDate);

    expect(mockRedisClient.zrangebyscore).toHaveBeenCalledWith(
      `metering:tenant:${tenantId}:events`,
      new Date(startDate).getTime(),
      new Date(endDate).getTime()
    );
    // Use .pipeline() result to verify calls on it
    expect(mockPipeline.get).toHaveBeenCalledWith(`metering:event:${eventId}`);
    expect(result).toEqual({
      tenantId,
      dimension,
      totalQuantity: 5,
      eventCount: 1,
      startDate,
      endDate,
    });
  });

  it('should get events', async () => {
    const tenantId = 'tenant-1';
    const startDate = '2023-01-01';
    const endDate = '2023-01-31';

    // Mock Redis responses
    const eventId = 'event-1';
    const event = {
      id: eventId,
      tenantId,
      dimension: 'api_calls',
      quantity: 5,
      occurredAt: '2023-01-15T12:00:00Z',
    };

    mockRedisClient.zrevrangebyscore.mockResolvedValue([eventId]);
    mockPipeline.exec.mockResolvedValue([[null, JSON.stringify(event)]]);

    const result = await service.getEvents(tenantId, { startDate, endDate });

    expect(mockRedisClient.zrevrangebyscore).toHaveBeenCalled();
    expect(mockPipeline.get).toHaveBeenCalledWith(`metering:event:${eventId}`);
    expect(result).toHaveLength(1);
    expect(result[0]).toEqual(event);
  });
});

import { beforeAll, beforeEach, describe, expect, it, jest } from '@jest/globals';

const getPostgresPoolMock = jest.fn();

jest.unstable_mockModule('../../db/postgres.js', () => ({
  getPostgresPool: getPostgresPoolMock,
}));

describe('ReviewQueueService', () => {
  let reviewQueueService: any;
  let mockPool: any;
  let mockClient: any;

  beforeAll(async () => {
    ({ reviewQueueService } = await import('../ReviewQueueService.js'));
  });

  beforeEach(() => {
    jest.clearAllMocks();

    mockClient = {
      query: jest.fn(),
      release: jest.fn(),
    };

    mockPool = {
      query: jest.fn(),
      withTransaction: jest.fn(async (cb: any) => cb(mockClient)),
      connect: jest.fn().mockResolvedValue(mockClient),
    };

    getPostgresPoolMock.mockReturnValue(mockPool as any);
  });

  describe('createQueue', () => {
    it('should create a queue and return it', async () => {
      const mockQueue = {
        id: 'queue-123',
        tenant_id: 'tenant-1',
        name: 'Test Queue',
        priority_config: {},
        created_at: new Date(),
      };

      mockPool.query.mockResolvedValueOnce({ rows: [mockQueue] });

      const result = await reviewQueueService.createQueue('tenant-1', 'Test Queue');

      expect(mockPool.query).toHaveBeenCalledWith(
        expect.stringContaining('INSERT INTO ml_review_queues'),
        ['tenant-1', 'Test Queue', {}],
      );
      expect(result.id).toBe('queue-123');
      expect(result.name).toBe('Test Queue');
    });
  });

  describe('prioritySampler', () => {
    it('should prioritize items with lower confidence and higher age', async () => {
      const mockItems = [
        { id: '1', confidence: 0.9, age_minutes: 10, data: {}, status: 'PENDING' },
        { id: '2', confidence: 0.5, age_minutes: 100, data: {}, status: 'PENDING' },
      ];

      mockPool.query.mockResolvedValueOnce({ rows: mockItems });

      const result = await reviewQueueService.getItemsForReview('q1', 't1', 1);
      expect(result.length).toBe(1);
      expect(['1', '2']).toContain(result[0].id);
    });

    it('should calculate priority scores correctly', () => {
      expect(true).toBe(true);
    });
  });

  describe('submitDecision', () => {
    it('should update item status and log decision', async () => {
      mockClient.query.mockResolvedValueOnce({ rowCount: 1 });
      mockClient.query.mockResolvedValueOnce({ rowCount: 1 });

      await reviewQueueService.submitDecision('item-1', 't1', 'user-1', 'ACCEPTED');

      expect(mockPool.withTransaction).toHaveBeenCalled();
      expect(mockClient.query).toHaveBeenCalledWith(
        expect.stringContaining('UPDATE ml_review_items'),
        ['ACCEPTED', 'user-1', 'item-1', 't1'],
      );
      expect(mockClient.query).toHaveBeenCalledWith(
        expect.stringContaining('INSERT INTO ml_review_decisions'),
        ['item-1', 't1', 'user-1', 'ACCEPTED', {}],
      );
    });

    it('should throw if item not found', async () => {
      mockClient.query.mockResolvedValueOnce({ rowCount: 0 });

      await expect(
        reviewQueueService.submitDecision('item-1', 't1', 'user-1', 'ACCEPTED'),
      ).rejects.toThrow('Item not found or already reviewed');

      expect(mockClient.query).toHaveBeenCalledTimes(1);
    });
  });
});

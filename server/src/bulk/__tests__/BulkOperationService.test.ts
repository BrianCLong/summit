import { jest, describe, it, expect, beforeEach, afterEach, beforeAll, afterAll } from '@jest/globals';
import { BulkOperationService } from '../BulkOperationService.js';
import { handlers } from '../handlers.js';
import { BulkContext, BulkItemInput } from '../types.js';
import { getPostgresPool } from '../../db/postgres.js';

// Mock dependencies
jest.mock('../../db/postgres.js', () => ({
  getPostgresPool: jest.fn(() => ({
      connect: jest.fn(() => ({
        query: jest.fn(),
        release: jest.fn()
      }))
  }))
}));

jest.mock('../../config/logger.js', () => ({
  child: jest.fn(() => ({
    info: jest.fn(),
    error: jest.fn(),
    debug: jest.fn(),
    warn: jest.fn()
  }))
}));

describe('BulkOperationService', () => {
  let service: BulkOperationService;
  let context: BulkContext;
  let mockClient: any;
  let mockPool: any;

  beforeEach(() => {
    // Create a complete mock client with all required methods
    mockClient = {
      query: jest.fn().mockResolvedValue({ rows: [], rowCount: 0 }),
      release: jest.fn()
    };

    // Create mock pool that returns the mock client
    mockPool = {
      connect: jest.fn().mockResolvedValue(mockClient),
      query: jest.fn().mockResolvedValue({ rows: [], rowCount: 0 })
    };

    service = new BulkOperationService();
    service.setPool(mockPool);

    context = {
      tenantId: 'tenant-1',
      userId: 'user-1',
      requestId: 'req-1'
    };

    // Reset all mocks
    jest.clearAllMocks();
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  test('should execute best-effort bulk operation via handler spy', async () => {
    // Spy on the handler's execute method to bypass database calls
    const handler = handlers['tags/apply'];
    const executeSpy = jest.spyOn(handler, 'execute').mockResolvedValue([
      { itemId: 'id1', status: 'success' },
      { itemId: 'id2', status: 'success' }
    ]);

    const payload = {
      items: [{ id: 'id1' }, { id: 'id2' }],
      requestId: 'req-1',
      operationType: 'tags/apply',
      params: { tags: ['test'] },
      atomic: false
    };

    const response = await service.process(context, payload);

    expect(executeSpy).toHaveBeenCalledWith(
      payload.items,
      payload.params,
      expect.objectContaining({ tenantId: 'tenant-1' })
    );
    expect(response.summary.total).toBe(2);
    expect(response.summary.success).toBe(2);
    expect(response.summary.failed).toBe(0);
  });

  test('should fail for unsupported operation', async () => {
    const payload = {
      items: [{ id: 'id1' }],
      requestId: 'req-1',
      operationType: 'unknown/op',
      params: {},
      atomic: false
    };

    await expect(service.process(context, payload)).rejects.toThrow('Unsupported bulk operation');
  });

  test('should handle atomic rollback when handler returns failures', async () => {
    // Spy on handler to return mixed results
    const handler = handlers['tags/apply'];
    const executeSpy = jest.spyOn(handler, 'execute').mockResolvedValue([
      { itemId: 'id1', status: 'success' },
      { itemId: 'id2', status: 'failure', message: 'Simulated error' }
    ]);

    const payload = {
      items: [{ id: 'id1' }, { id: 'id2' }],
      requestId: 'req-1',
      operationType: 'tags/apply',
      params: { tags: ['test'] },
      atomic: true
    };

    const response = await service.process(context, payload);

    // Verify rollback was triggered
    expect(mockClient.query).toHaveBeenCalledWith('BEGIN');
    expect(mockClient.query).toHaveBeenCalledWith('ROLLBACK');
    expect(mockClient.release).toHaveBeenCalled();

    // All items should be marked as failed due to atomic rollback
    expect(response.summary.failed).toBe(2);
    expect(response.summary.success).toBe(0);
    expect(response.results[0].status).toBe('failure');
    expect(response.results[0].code).toBe('ATOMIC_ROLLBACK');
  });

  test('should commit atomic operation when all items succeed', async () => {
    const handler = handlers['tags/apply'];
    jest.spyOn(handler, 'execute').mockResolvedValue([
      { itemId: 'id1', status: 'success' },
      { itemId: 'id2', status: 'success' }
    ]);

    const payload = {
      items: [{ id: 'id1' }, { id: 'id2' }],
      requestId: 'req-1',
      operationType: 'tags/apply',
      params: { tags: ['test'] },
      atomic: true
    };

    const response = await service.process(context, payload);

    // Verify commit was called
    expect(mockClient.query).toHaveBeenCalledWith('BEGIN');
    expect(mockClient.query).toHaveBeenCalledWith('COMMIT');
    expect(mockClient.release).toHaveBeenCalled();

    expect(response.summary.success).toBe(2);
    expect(response.summary.failed).toBe(0);
  });

  test('should handle dry run without executing', async () => {
    const handler = handlers['tags/apply'];
    const executeSpy = jest.spyOn(handler, 'execute');

    const payload = {
      items: [{ id: 'id1' }, { id: 'id2' }],
      requestId: 'req-1',
      operationType: 'tags/apply',
      params: { tags: ['test'] },
      atomic: false,
      dryRun: true
    };

    const response = await service.process(context, payload);

    // Handler should not be called in dry run
    expect(executeSpy).not.toHaveBeenCalled();
    expect(response.summary.total).toBe(2);
    expect(response.summary.success).toBe(2);
  });
});

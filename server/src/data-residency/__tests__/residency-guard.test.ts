import { jest, describe, it, expect, beforeEach, afterEach, beforeAll, afterAll } from '@jest/globals';
import { ResidencyGuard, ResidencyViolationError } from '../residency-guard.js';
import { getPostgresPool } from '../../db/postgres.js';

jest.mock('../../db/postgres', () => ({
  getPostgresPool: jest.fn(),
}));

jest.mock('../../middleware/observability/otel-tracing', () => ({
  otelService: {
    createSpan: jest.fn(() => ({ end: jest.fn() })),
    addSpanAttributes: jest.fn(),
  },
}));

describe('ResidencyGuard', () => {
  let guard: ResidencyGuard;
  let mockPool: any;

  beforeEach(() => {
    // Reset singleton if possible, or just use the instance
    guard = ResidencyGuard.getInstance();
    mockPool = {
      query: jest.fn(),
    };
    (getPostgresPool as jest.Mock).mockReturnValue(mockPool);
  });

  it('should allow access when region is allowed', async () => {
    mockPool.query.mockResolvedValueOnce({
      rows: [
        {
          region: 'us-east-1',
          allowed_transfers: '["us-west-2"]',
        },
      ],
    });

    await expect(
      guard.enforce('tenant-1', {
        operation: 'compute',
        targetRegion: 'us-west-2',
      })
    ).resolves.not.toThrow();
  });

  it('should block access when region is prohibited', async () => {
    mockPool.query.mockResolvedValueOnce({
      rows: [
        {
          region: 'us-east-1',
          allowed_transfers: '[]',
        },
      ],
    });

    // Mock exceptions check to return false
    mockPool.query.mockResolvedValueOnce({ rows: [] });

    await expect(
      guard.enforce('tenant-1', {
        operation: 'compute',
        targetRegion: 'eu-central-1',
      })
    ).rejects.toThrow(ResidencyViolationError);
  });

  it('should allow access via exception', async () => {
    mockPool.query.mockResolvedValueOnce({
      rows: [
        {
          region: 'us-east-1',
          allowed_transfers: '[]',
        },
      ],
    });

    // Mock exceptions check to return true
    mockPool.query.mockResolvedValueOnce({ rows: [{ id: 'exc-1' }] });

    await expect(
      guard.enforce('tenant-1', {
        operation: 'compute',
        targetRegion: 'eu-central-1',
      })
    ).resolves.not.toThrow();
  });
});

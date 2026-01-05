import { describe, it, expect, jest, beforeEach } from '@jest/globals';
import { DisasterRecoveryService } from '../../src/dr/DisasterRecoveryService.js';

const mockReaddir = jest.fn();

jest.mock('fs/promises', () => ({
  readdir: (...args: unknown[]) => mockReaddir(...args),
}));

const mockRedisSet = jest.fn().mockResolvedValue(undefined);
const mockRedisGet = jest.fn().mockResolvedValue(null);

jest.mock('../../src/cache/redis.js', () => ({
  RedisService: {
    getInstance: jest.fn(() => ({
      set: mockRedisSet,
      get: mockRedisGet,
    })),
  },
}));

jest.mock('../../src/config/logger.js', () => ({
  info: jest.fn(),
  warn: jest.fn(),
  error: jest.fn(),
}));

describe('Disaster recovery restore validation', () => {
  beforeEach(() => {
    mockReaddir.mockReset();
    mockRedisSet.mockClear();
  });

  it('records a failed drill when backups are missing', async () => {
    mockReaddir.mockRejectedValue(new Error('missing'));

    const service = new DisasterRecoveryService();
    const result = await service.runDrill('postgres');

    expect(result).toBe(false);
    expect(mockRedisSet).toHaveBeenCalled();
    const recorded = JSON.parse(mockRedisSet.mock.calls[0][1]);
    expect(recorded.success).toBe(false);
  });

  it('records a successful drill when backups are available', async () => {
    mockReaddir
      .mockResolvedValueOnce(['2026-01-01'])
      .mockResolvedValueOnce(['backup.sql']);

    const service = new DisasterRecoveryService();
    jest
      .spyOn(service as any, 'verifyPostgresRestore')
      .mockResolvedValue(undefined);

    const result = await service.runDrill('postgres');

    expect(result).toBe(true);
    expect(mockRedisSet).toHaveBeenCalled();
    const recorded = JSON.parse(mockRedisSet.mock.calls[0][1]);
    expect(recorded.success).toBe(true);
  });
});

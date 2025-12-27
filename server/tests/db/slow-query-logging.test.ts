import { jest } from '@jest/globals';

const mockLogger = {
  warn: jest.fn(),
  info: jest.fn(),
  error: jest.fn(),
  debug: jest.fn(),
  child: jest.fn().mockReturnThis(),
};

const mockCorrelationStorage = {
  getStore: jest.fn(() => new Map([
    ['traceId', 'trace-123'],
    ['tenantId', 'tenant-abc'],
  ])),
};

jest.mock('../../src/config/logger.js', () => ({
  logger: mockLogger,
  correlationStorage: mockCorrelationStorage,
}));

import { __private } from '../../src/db/postgres';

describe('slow query logging', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('emits a structured log for slow queries', () => {
    __private.recordSlowQuery(
      'stmt_test',
      312,
      'write',
      'SELECT * FROM users',
    );

    expect(mockLogger.warn).toHaveBeenCalledWith(
      expect.objectContaining({
        pool: 'write',
        durationMs: 312,
        queryName: 'stmt_test',
        traceId: 'trace-123',
        tenantId: 'tenant-abc',
      }),
      'Slow PostgreSQL query detected',
    );
  });
});

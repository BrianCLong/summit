import { jest } from '@jest/globals';

describe('slow query logging', () => {
  let baseLogger: any;
  let correlationStorage: any;
  let __private: any;
  let mockLogger: any;

  beforeAll(async () => {
    jest.resetModules();
    // @ts-ignore - dynamic import for test harness
    ({ logger: baseLogger, correlationStorage } = (await import('../../src/config/logger')) as any);
    mockLogger = {
      warn: jest.fn(),
      info: jest.fn(),
      error: jest.fn(),
      child: jest.fn(),
    };
    baseLogger.child.mockReturnValue(mockLogger);
    // @ts-ignore - dynamic import for test harness
    ({ __private } = (await import('../../src/db/postgres')) as any);
  });

  beforeEach(() => {
    jest.clearAllMocks();
    baseLogger.child.mockReturnValue(mockLogger);
  });

  it('emits a structured log for slow queries', () => {
    const store = new Map([
      ['traceId', 'trace-123'],
      ['tenantId', 'tenant-abc'],
    ]);
    correlationStorage.getStore.mockReturnValue(store);
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

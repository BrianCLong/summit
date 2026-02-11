import { jest } from '@jest/globals';
const mockGetPostgresPool = jest.fn();
const mockGenerateAndExportReport = jest.fn();

jest.unstable_mockModule('../../config/database.js', () => ({
  getPostgresPool: mockGetPostgresPool,
}));

jest.unstable_mockModule('../../config/logger.js', () => ({
  __esModule: true,
  default: {
    info: jest.fn(),
    warn: jest.fn(),
    error: jest.fn(),
  },
}));

jest.unstable_mockModule('../BillingService.js', () => ({
  billingService: {
    generateAndExportReport: mockGenerateAndExportReport,
  },
}));

const { BillingJobService } = await import('../BillingJobService.js');
const { getPostgresPool } = await import('../../config/database.js');
const { billingService } = await import('../BillingService.js');

describe('BillingJobService', () => {
  let jobService: InstanceType<typeof BillingJobService>;
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

    jobService = new BillingJobService();
  });

  it('processes billing when advisory lock is acquired', async () => {
    mockQuery
      .mockResolvedValueOnce({ rows: [{ acquired: true }] })
      .mockResolvedValueOnce({ rows: [{ tenant_id: 'tenant-1' }, { tenant_id: 'tenant-2' }] })
      .mockResolvedValue({ rows: [] });

    await jobService.processBillingClose();

    expect(mockConnect).toHaveBeenCalled();
    expect(mockQuery.mock.calls[0][0]).toMatch(/pg_try_advisory_lock/i);
    expect(mockQuery.mock.calls[0][1]).toEqual(expect.any(Array));
    expect(billingService.generateAndExportReport).toHaveBeenCalledTimes(2);
    const hasUnlock = mockQuery.mock.calls.some(
      (call: unknown[]) => /pg_advisory_unlock/i.test(call[0] as string),
    );
    expect(hasUnlock).toBe(true);
    expect(mockRelease).toHaveBeenCalled();
  });

  it('skips processing when advisory lock is held elsewhere', async () => {
    mockQuery.mockResolvedValueOnce({ rows: [{ acquired: false }] });

    await jobService.processBillingClose({ lockTimeoutMs: 1 });

    expect(billingService.generateAndExportReport).not.toHaveBeenCalled();
    expect(mockQuery).toHaveBeenCalled();
    const hasUnlock = mockQuery.mock.calls.some(
      (call: unknown[]) => /pg_advisory_unlock/i.test(call[0] as string),
    );
    expect(hasUnlock).toBe(false);
    expect(mockRelease).toHaveBeenCalled();
  });
});

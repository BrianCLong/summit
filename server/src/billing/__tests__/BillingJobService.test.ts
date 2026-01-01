import { jest } from '@jest/globals';
import { BillingJobService } from '../BillingJobService';
import { getPostgresPool } from '../../config/database.js';
import { billingService } from '../BillingService.js';

jest.mock('../../config/database.js', () => ({
  getPostgresPool: jest.fn(),
}));

jest.mock('../../config/logger.js', () => ({
  __esModule: true,
  default: {
    info: jest.fn(),
    warn: jest.fn(),
    error: jest.fn(),
  },
}));

jest.mock('../BillingService.js', () => ({
  billingService: {
    generateAndExportReport: jest.fn(),
  },
}));

describe('BillingJobService', () => {
  let jobService: BillingJobService;
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
    expect(mockQuery).toHaveBeenCalledWith(
      'SELECT pg_try_advisory_lock($1) as acquired',
      expect.any(Array),
    );
    expect(billingService.generateAndExportReport).toHaveBeenCalledTimes(2);
    expect(mockQuery).toHaveBeenCalledWith('SELECT pg_advisory_unlock($1)', expect.any(Array));
    expect(mockRelease).toHaveBeenCalled();
  });

  it('skips processing when advisory lock is held elsewhere', async () => {
    mockQuery.mockResolvedValueOnce({ rows: [{ acquired: false }] });

    await jobService.processBillingClose();

    expect(billingService.generateAndExportReport).not.toHaveBeenCalled();
    expect(mockQuery).toHaveBeenCalledTimes(1);
    expect(mockRelease).toHaveBeenCalled();
  });
});

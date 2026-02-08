import { jest, beforeAll, afterEach, describe, it, expect } from '@jest/globals';

describe('recordPoolSelectionAudit', () => {
  let recordPoolSelectionAudit: typeof import('../pool-selection-audit.js').recordPoolSelectionAudit;
  let queryMock: jest.Mock;

  afterEach(() => {
    jest.resetModules();
    delete process.env.DATABASE_URL;
  });

  it('skips gracefully when DATABASE_URL is missing', async () => {
    const warnSpy = jest.spyOn(console, 'warn').mockImplementation(() => {});
    ({ recordPoolSelectionAudit } = await import('../pool-selection-audit.js'));

    await expect(
      recordPoolSelectionAudit({
        tenantId: 'tenant-1',
        requestId: 'req-1',
        est: { cpuSec: 1 },
      }),
    ).resolves.toBeUndefined();

    expect(warnSpy).toHaveBeenCalled();
    warnSpy.mockRestore();
  });

  it('inserts an audit row when database is configured', async () => {
    process.env.DATABASE_URL = 'postgres://test-db';
    queryMock = jest.fn();

    jest.unstable_mockModule('pg', () => ({
      Pool: jest.fn(() => ({ query: queryMock })),
    }));

    ({ recordPoolSelectionAudit } = await import('../pool-selection-audit.js'));

    await recordPoolSelectionAudit({
      tenantId: 'tenant-2',
      requestId: 'req-2',
      poolId: 'pool-1',
      poolPriceUsd: 1.23,
      residency: 'us-east-1',
      est: { cpuSec: 2, gbSec: 3, egressGb: 1 },
      purpose: 'test-purpose',
    });

    expect(queryMock).toHaveBeenCalledWith(
      expect.stringContaining('pool_selection_audit'),
      [
        'tenant-2',
        'req-2',
        'pool-1',
        1.23,
        'us-east-1',
        JSON.stringify({ cpuSec: 2, gbSec: 3, egressGb: 1 }),
        'test-purpose',
      ],
    );
  });
});

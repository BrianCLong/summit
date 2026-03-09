import { describe, it, expect, jest, beforeEach } from '@jest/globals';

const readMock = jest.fn() as jest.MockedFunction<
  (...args: any[]) => Promise<{ rows: any[] }>
>;

jest.mock('../../config/database.js', () => ({
  getPostgresPool: () => ({
    read: readMock,
  }),
}));

jest.mock('../../utils/logger.js', () => ({
  default: {
    error: jest.fn(),
  },
}));

import { TenantUsageService } from '../TenantUsageService.js';

describe('TenantUsageService', () => {
  beforeEach(() => {
    readMock.mockReset();
  });

  it('aggregates totals and breakdowns by workflow and environment', async () => {
    readMock
      .mockResolvedValueOnce({
        rows: [
          { kind: 'maestro.runs', unit: 'runs', total_quantity: '5' },
          { kind: 'external_api.requests', unit: 'requests', total_quantity: '12' },
        ],
      })
      .mockResolvedValueOnce({
        rows: [
          { workflow: 'ingest', kind: 'maestro.runs', unit: 'runs', total_quantity: '3' },
          { workflow: 'ingest', kind: 'external_api.requests', unit: 'requests', total_quantity: '8' },
          { workflow: 'review', kind: 'maestro.runs', unit: 'runs', total_quantity: '2' },
        ],
      })
      .mockResolvedValueOnce({
        rows: [
          { environment: 'prod', kind: 'maestro.runs', unit: 'runs', total_quantity: '4' },
          { environment: 'prod', kind: 'external_api.requests', unit: 'requests', total_quantity: '10' },
          { environment: 'staging', kind: 'external_api.requests', unit: 'requests', total_quantity: '2' },
        ],
      })
      .mockResolvedValueOnce({
        rows: [
          { workflow: 'ingest', environment: 'prod', kind: 'maestro.runs', unit: 'runs', total_quantity: '3' },
          { workflow: 'ingest', environment: 'prod', kind: 'external_api.requests', unit: 'requests', total_quantity: '8' },
          { workflow: 'review', environment: 'prod', kind: 'maestro.runs', unit: 'runs', total_quantity: '1' },
          { workflow: 'review', environment: 'staging', kind: 'maestro.runs', unit: 'runs', total_quantity: '1' },
        ],
      });

    const service = new TenantUsageService();
    const result = await service.getTenantUsage('tenant-1', '7d');

    expect(result.tenantId).toBe('tenant-1');
    expect(result.totals).toEqual([
      { kind: 'maestro.runs', unit: 'runs', total: 5 },
      { kind: 'external_api.requests', unit: 'requests', total: 12 },
    ]);

    const ingestWorkflow = result.breakdown.byWorkflow.find(
      (entry) => entry.workflow === 'ingest',
    );
    expect(ingestWorkflow?.totals).toEqual([
      { kind: 'maestro.runs', unit: 'runs', total: 3 },
      { kind: 'external_api.requests', unit: 'requests', total: 8 },
    ]);

    const prodEnv = result.breakdown.byEnvironment.find(
      (entry) => entry.environment === 'prod',
    );
    expect(prodEnv?.totals).toEqual([
      { kind: 'maestro.runs', unit: 'runs', total: 4 },
      { kind: 'external_api.requests', unit: 'requests', total: 10 },
    ]);

    expect(result.breakdown.byWorkflowEnvironment).toEqual([
      {
        workflow: 'ingest',
        environment: 'prod',
        totals: [
          { kind: 'maestro.runs', unit: 'runs', total: 3 },
          { kind: 'external_api.requests', unit: 'requests', total: 8 },
        ],
      },
      {
        workflow: 'review',
        environment: 'prod',
        totals: [{ kind: 'maestro.runs', unit: 'runs', total: 1 }],
      },
      {
        workflow: 'review',
        environment: 'staging',
        totals: [{ kind: 'maestro.runs', unit: 'runs', total: 1 }],
      },
    ]);

    expect(readMock).toHaveBeenCalledTimes(4);
  });

  it('rejects invalid range keys', () => {
    const service = new TenantUsageService();

    expect(() => service.getUsageRange('invalid')).toThrow('Invalid range');
  });
});

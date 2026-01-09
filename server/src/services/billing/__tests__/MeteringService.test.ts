import { describe, it, expect, beforeEach, jest, beforeAll, afterAll } from '@jest/globals';
import { MeteringService } from '../MeteringService';
import { pool } from '../../../db/pg';
import { provenanceLedger } from '../../../provenance/ledger';
import { BillableEventType } from '../../../lib/billing/types';

// Mock dependencies
jest.mock('../../../db/pg', () => {
  const mPool = {
    connect: jest.fn(),
    query: jest.fn(),
  };
  return { pool: mPool };
});

jest.mock('../../../provenance/ledger', () => ({
  provenanceLedger: {
    appendEntry: jest.fn(),
  },
}));

jest.mock('../../../lib/resources/quota-manager', () => ({
  __esModule: true,
  default: {
    getQuotaForTenant: jest.fn().mockReturnValue({}),
  },
}));

describe('MeteringService', () => {
  let meteringService: MeteringService;
  let mockClient: any;

  beforeAll(() => {
    mockClient = {
      query: jest.fn(),
      release: jest.fn(),
    };
    (pool.connect as jest.Mock).mockImplementation(async () => mockClient);
    meteringService = MeteringService.getInstance();
  });

  beforeEach(() => {
    jest.clearAllMocks();
    (pool.connect as jest.Mock).mockImplementation(async () => mockClient);
  });

  it('should record usage and log to provenance ledger', async () => {
    const event = {
      tenantId: 'tenant-123',
      eventType: BillableEventType.READ_QUERY,
      quantity: 1,
      unit: 'query' as any,
      timestamp: new Date(),
      idempotencyKey: 'key-1',
      actorId: 'user-1'
    };

    // Mock DB insert success
    mockClient.query.mockImplementation((sql: string) => {
      if (sql.includes('INSERT')) {
        return Promise.resolve({ rows: [{ id: 'evt-1' }] });
      }
      return Promise.resolve({ rows: [] });
    });

    const receipt = await meteringService.recordUsage(event);

    expect(receipt.eventId).toBe('evt-1');
    expect(receipt.status).toBe('recorded');
    expect(provenanceLedger.appendEntry).toHaveBeenCalledWith(expect.objectContaining({
      actionType: 'BILLABLE_EVENT',
      resourceId: 'evt-1'
    }));
    expect(mockClient.query).toHaveBeenCalledWith('COMMIT');
  });

  it('should handle duplicates idempotently', async () => {
    const event = {
      tenantId: 'tenant-123',
      eventType: BillableEventType.READ_QUERY,
      quantity: 1,
      unit: 'query' as any,
      timestamp: new Date(),
      idempotencyKey: 'key-1',
    };

    // BEGIN succeeds, INSERT throws unique violation, ROLLBACK succeeds
    mockClient.query
      .mockResolvedValueOnce(undefined as any)
      .mockRejectedValueOnce({ code: '23505' })
      .mockResolvedValueOnce(undefined as any);
    // Mock fetch existing
    (pool.query as jest.Mock).mockImplementation(async () => ({ rows: [{ id: 'evt-existing' }] }));

    const receipt = await meteringService.recordUsage(event);

    expect(receipt.eventId).toBe('evt-existing');
    expect(receipt.status).toBe('duplicate');
    expect(mockClient.query).toHaveBeenCalledWith('ROLLBACK');
    // Should NOT log to provenance again for duplicate
    expect(provenanceLedger.appendEntry).not.toHaveBeenCalled();
  });

  it('should generate usage preview', async () => {
    const rows = [
      { kind: 'read_query', total_quantity: '100', unit: 'query' },
      { kind: 'planning_run', total_quantity: '5', unit: 'run' }
    ];
    (pool.query as jest.Mock).mockImplementation(async () => ({ rows }));

    const preview = await meteringService.getUsagePreview('tenant-1', new Date(), new Date());

    expect(preview.breakdown['read_query'].quantity).toBe(100);
    expect(preview.breakdown['planning_run'].quantity).toBe(5);
    expect(preview.totalCost).toBeGreaterThan(0);
  });
});

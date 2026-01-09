import { describe, it, expect, jest, beforeEach } from '@jest/globals';
import { RunCreateInput } from '../runs-repo.js';

// Define mock Query function
const mockQuery = jest.fn();

// Mock database module BEFORE importing the repo
jest.mock('../../../config/database.js', () => ({
  getPostgresPool: jest.fn(() => ({
    query: mockQuery,
  })),
}));

// Helper to import runsRepo dynamically inside tests or `beforeAll` if needed,
// but typically jest.mock works if hoisted.
// The issue previously was 'await import' at top level.
// We can rely on the fact that jest.mock is hoisted.

describe('RunsRepo', () => {
  let runsRepo: any;

  beforeEach(async () => {
    mockQuery.mockReset();
    // Re-import to ensure clean state if needed, or just import once at top if mock persists
    const module = await import('../runs-repo.js');
    runsRepo = module.runsRepo;
  });

  it('should create a new run', async () => {
    const input: RunCreateInput = {
      pipeline_id: 'p-123',
      pipeline_name: 'Test Pipeline',
      tenant_id: 'tenant-1',
      idempotency_key: 'uniq-key-2',
    };

    (mockQuery as jest.Mock).mockResolvedValueOnce({
      rows: [
        {
          id: 'new-id',
          pipeline_id: 'p-123',
          pipeline_name: 'Test Pipeline',
          status: 'queued',
          created_at: new Date(),
          updated_at: new Date(),
          tenant_id: 'tenant-1',
          idempotency_key: 'uniq-key-2',
        },
      ],
    } as never);

    const result = await runsRepo.create(input);

    expect(result.id).toBe('new-id');
    expect(result.idempotency_key).toBe('uniq-key-2');
    expect(mockQuery).toHaveBeenCalledTimes(1); // Insert only
  });
});

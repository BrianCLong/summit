
import { describe, it, expect, jest, beforeEach } from '@jest/globals';
import { InventionService } from '../services/InventionService';
import * as db from '../../config/database';

// Mock dependencies
const mockSession = {
  run: jest.fn().mockResolvedValue({
    records: [{ get: () => 'mock-uuid-123' }]
  } as never),
  close: jest.fn().mockResolvedValue(undefined as never)
};
const mockDriver = {
  session: jest.fn(() => mockSession)
};

// Use spyOn for database mock to ensure it's picked up
jest.spyOn(db, 'getNeo4jDriver').mockReturnValue(mockDriver as any);

// Create the mock function outside so we can reference it
const mockFindSimilar = jest.fn();

jest.mock('../services/PriorArtService', () => {
  return {
    PriorArtService: {
      getInstance: () => ({
        findSimilar: mockFindSimilar
      })
    }
  };
});

describe('InventionService', () => {
  let service: InventionService;

  beforeEach(() => {
    // Reset instance to force constructor to run again with fresh mocks
    (InventionService as any).instance = undefined;
    service = InventionService.getInstance();
    mockFindSimilar.mockReset();
  });

  it('should reject invention if too similar to prior art', async () => {
    // Override mock for this test to return high similarity
    mockFindSimilar.mockResolvedValueOnce([{ title: 'Exact Match', score: 0.95 }] as never);

    await expect(
      service.generateInvention(['AI'], 'Solve everything', 'tenant-1')
    ).rejects.toThrow('Proposed idea is too similar');
  });

  it('should generate invention draft if novel', async () => {
    // Override mock to return low similarity (novel)
    mockFindSimilar.mockResolvedValueOnce([{ title: 'Distant Art', score: 0.3 }] as never);

    const result = await service.generateInvention(
      ['Quantum Computing', 'Coffee'],
      'Make better coffee using qubits',
      'tenant-1'
    );

    expect(result).toHaveProperty('id');
    expect(result.title).toContain('Novel System');
    expect(result.noveltyScore).toBeGreaterThan(0.5);
    expect(result.priorArtUsed).toContain('Distant Art');
  });
});

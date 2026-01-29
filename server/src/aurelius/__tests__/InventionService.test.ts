
import { describe, it, expect, jest, beforeEach, beforeAll } from '@jest/globals';

const mockSession = {
  run: jest.fn(),
  close: jest.fn().mockResolvedValue(undefined as never),
};
const mockDriver = {
  session: jest.fn(() => mockSession),
};
const mockFindSimilar = jest.fn();

let InventionService: typeof import('../services/InventionService.ts').InventionService;
let dbModule: typeof import('../../config/database.ts');
let priorArtModule: typeof import('../services/PriorArtService.ts');

describe('InventionService', () => {
  let service: ReturnType<typeof InventionService.getInstance>;

  beforeAll(async () => {
    dbModule = await import('../../config/database.ts');
    priorArtModule = await import('../services/PriorArtService.ts');
    ({ InventionService } = await import('../services/InventionService.ts'));
  });

  beforeEach(() => {
    jest.spyOn(dbModule, 'getNeo4jDriver').mockReturnValue(mockDriver as any);
    jest
      .spyOn(priorArtModule.PriorArtService, 'getInstance')
      .mockReturnValue({ findSimilar: mockFindSimilar } as any);
    // Reset instance to force constructor to run again with fresh mocks
    (InventionService as any).instance = undefined;
    service = InventionService.getInstance();
    mockDriver.session.mockImplementation(() => mockSession);
    mockSession.run.mockReset();
    mockFindSimilar.mockReset();
  });

  it('should reject invention if too similar to prior art', async () => {
    mockFindSimilar.mockResolvedValueOnce([{ title: 'Exact Match', score: 0.95 }] as never);
    mockSession.run.mockResolvedValueOnce({
      records: [{ get: () => 'mock-uuid-123' }],
    } as never);

    await expect(
      service.generateInvention(['AI'], 'Solve everything', 'tenant-1')
    ).rejects.toThrow('Proposed idea is too similar');
  });

  it('should generate invention draft if novel', async () => {
    mockFindSimilar.mockResolvedValueOnce([{ title: 'Distant Art', score: 0.3 }] as never);
    mockSession.run.mockResolvedValueOnce({
      records: [{ get: () => 'mock-uuid-123' }],
    } as never);

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

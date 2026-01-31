import { jest } from '@jest/globals';
import { NarrativePrioritizationService } from '../NarrativePrioritizationService';

// Mock dependencies
const mockRun = jest.fn() as jest.Mock;
const mockSession = {
  run: mockRun,
  close: jest.fn(),
};
const mockDriver = {
  session: () => mockSession,
};

jest.mock('../../db/neo4j.js', () => ({
  getNeo4jDriver: () => mockDriver,
}));

describe('NarrativePrioritizationService', () => {
  let service: NarrativePrioritizationService;

  beforeAll(() => {
    service = NarrativePrioritizationService.getInstance();
  });

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should prioritize a critical narrative correctly', async () => {
    // Mock Neo4j response for high graph score
    (mockRun as any).mockResolvedValueOnce({
      records: [
        {
          get: (key: string) => (key === 'graphScore' ? 4.5 : null),
        },
      ],
    });

    const input = {
      text: 'Urgent attack on infrastructure',
      entities: ['TargetA', 'TargetB'],
      source: 'high_value_source',
    };

    const result = await service.prioritize(input);

    expect(result).toBeDefined();
    expect(result.priority).toBeDefined();
    expect(result.score).toBeGreaterThan(0);
    // Text score should be high due to "urgent", "attack", "infrastructure"
    // Graph score should be high (4.5/5 -> 0.9)
    // History score is deterministic 0-1
    expect(mockRun).toHaveBeenCalledTimes(1);
  });

  it('should handle empty entities gracefully', async () => {
    const input = {
      text: 'Just some random chatter',
      entities: [],
      source: 'random_source',
    };

    const result = await service.prioritize(input);

    expect(result).toBeDefined();
    expect(mockRun).not.toHaveBeenCalled(); // Should not query graph if no entities
  });

  it('should handle graph query errors gracefully', async () => {
    (mockRun as any).mockRejectedValueOnce(new Error('Neo4j error'));

    const input = {
      text: 'Test',
      entities: ['E1'],
      source: 'src',
    };

    const result = await service.prioritize(input);

    expect(result).toBeDefined();
    expect(result.breakdown.graphScore).toBe(0.1); // Fallback value
  });
});


import { GraphDetector } from '../GraphDetector';
import { Driver, Session, Result } from 'neo4j-driver';

// Mock types needed
const mockRun = jest.fn();
const mockClose = jest.fn();
const mockSession = jest.fn(() => ({
  run: mockRun,
  close: mockClose,
}));

// Mock the driver
const mockDriver = {
  session: mockSession,
} as unknown as Driver;

describe('GraphDetector', () => {
  let detector: GraphDetector;

  beforeEach(() => {
    detector = new GraphDetector(mockDriver);
    mockRun.mockClear();
    mockClose.mockClear();
  });

  it('should detect coordinated cliques', async () => {
    // Mock Neo4j result
    mockRun.mockResolvedValueOnce({
      records: [
        {
          get: (key: string) => {
            if (key === 'internalInteractions') return { toNumber: () => 30 }; // High interactions
            if (key === 'actorCount') return { toNumber: () => 6 };
            return null;
          }
        }
      ]
    });

    const result = await detector.detectCoordinatedCliques(['u1', 'u2', 'u3', 'u4', 'u5', 'u6']);
    expect(result.isAnomalous).toBe(true);
    expect(result.score).toBeGreaterThan(0.5); // 30 / (6*5) = 1.0 density
    expect(mockRun).toHaveBeenCalled();
    expect(mockClose).toHaveBeenCalled();
  });

  it('should analyze influence cascade', async () => {
    // Mock Neo4j result for depth
    mockRun.mockResolvedValueOnce({
      records: [{ get: () => ({ toNumber: () => 5 }) }] // Depth 5
    });
    // Mock Neo4j result for breadth
    mockRun.mockResolvedValueOnce({
        records: [{ get: () => ({ toNumber: () => 100 }) }] // Breadth 100
    });

    const metrics = await detector.analyzeInfluenceCascade('post1');
    expect(metrics.depth).toBe(5);
    expect(metrics.breadth).toBe(100);
  });
});

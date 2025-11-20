import { NetworkAnalyzer } from '../src/analysis/network_analyzer';
import * as neo4j from '../src/graph/neo4j';

// Mock the neo4j module
jest.mock('../src/graph/neo4j', () => ({
  runCypher: jest.fn(),
  getDriver: jest.fn(),
}));

describe('Network Analysis', () => {
  let analyzer: NetworkAnalyzer;
  const mockRunCypher = neo4j.runCypher as jest.Mock;

  beforeEach(() => {
    analyzer = new NetworkAnalyzer();
    jest.clearAllMocks();
  });

  describe('analyzeNodeRisk', () => {
    it('should calculate high risk for direct connection to bad actor', async () => {
      // Mock Centrality Result
      mockRunCypher.mockImplementation((query, params) => {
        if (query.includes('SIZE((n)')) {
           // Centrality query for single node
           // Returns [{ score: 10 }]
           return Promise.resolve([
             { score: 10 }
           ]);
        }
        if (query.includes('shortestPath')) {
          // Shortest Path query
          return Promise.resolve([{
            p: {
              start: { identity: 1 },
              end: { identity: 2 },
              segments: [{}], // 1 segment = direct connection
              length: 1
            }
          }]);
        }
        return Promise.resolve([]);
      });

      const result = await analyzer.analyzeNodeRisk('suspect1', 'badActor1');

      expect(result.riskScore).toBeGreaterThanOrEqual(80); // 20 (centrality) + 80 (direct) = 100
      expect(result.factors).toContain('Directly connected to bad actor');
      expect(result.factors).toContain('High Connectivity');
      expect(mockRunCypher).toHaveBeenCalledTimes(2);
    });

    it('should calculate moderate risk for indirect connection', async () => {
       // Mock Centrality Result
       mockRunCypher.mockImplementation((query, params) => {
        if (query.includes('SIZE((n)')) {
           return Promise.resolve([
             { score: 2 }
           ]);
        }
        if (query.includes('shortestPath')) {
          return Promise.resolve([{
            p: {
              length: 2,
              segments: [{}, {}]
            }
          }]);
        }
        return Promise.resolve([]);
      });

      const result = await analyzer.analyzeNodeRisk('suspect2', 'badActor1');

      expect(result.riskScore).toBe(50); // 0 (low centrality) + 50 (2 hops)
      expect(result.factors).toContain('2 hops from bad actor');
    });
  });

  describe('findCommunityInfluencers', () => {
    it('should return top influencers', async () => {
      mockRunCypher.mockResolvedValue([
        { nodeId: 'inf1', score: 100 },
        { nodeId: 'inf2', score: 90 }
      ]);

      const result = await analyzer.findCommunityInfluencers();
      expect(result).toHaveLength(2);
      expect(result[0].nodeId).toBe('inf1');
    });
  });
});

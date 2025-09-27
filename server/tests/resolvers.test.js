const resolvers = require('../src/graphql/resolvers');

describe('GraphQL resolvers', () => {
  test('runGraphAnalysis returns array', async () => {
    const user = { id: 'u1' };
    const services = {
      graphAnalytics: {
        calculatePageRank: jest.fn().mockResolvedValue([{ nodeId: '1', pageRank: 0.1 }]),
        calculateCentralityMeasures: jest.fn().mockResolvedValue({ degreeCentrality: [] }),
        detectCommunities: jest.fn().mockResolvedValue([]),
        analyzeRelationshipPatterns: jest.fn().mockResolvedValue({ patterns: [] }),
        detectAnomalies: jest.fn().mockResolvedValue({}),
        calculateBasicMetrics: jest.fn().mockResolvedValue({ nodeCount: 0, edgeCount: 0 })
      }
    };
    const input = { investigationId: 'inv1', algorithms: ['pagerank','centrality'], includeMetrics: true };
    const out = await resolvers.Mutation.runGraphAnalysis(null, { input }, { user, services, logger: console });
    expect(Array.isArray(out)).toBe(true);
    expect(out.length).toBeGreaterThan(0);
  });

  test('geointTimeSeries returns array', async () => {
    const user = { id: 'u1' };
    const services = {
      geoint: { buildTimeSeries: jest.fn().mockReturnValue([{ start: 't', end: 't2', distanceKm: 1 }]) }
    };
    const out = await resolvers.Query.geointTimeSeries(null, { points: [], intervalMinutes: 60 }, { user, services });
    expect(Array.isArray(out)).toBe(true);
    expect(out[0]).toHaveProperty('distanceKm');
  });
});


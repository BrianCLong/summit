import graphAnalyticsResolvers = require('../src/graphql/resolvers.graphAnalytics');

describe('graph analytics GraphQL resolvers', () => {
  const baseUser = { id: 'analyst-1', role: 'ANALYST' };

  it('delegates to the service for PageRank', async () => {
    const calculatePageRank = jest
      .fn()
      .mockResolvedValue([{ nodeId: 'n1', label: 'Node 1', score: 0.42 }]);
    const context = {
      user: baseUser,
      services: {
        graphAnalytics: {
          calculatePageRank,
          detectCommunities: jest.fn(),
        },
      },
    } as any;

    const result = await graphAnalyticsResolvers.Query.graphPageRank(
      null,
      { limit: 25, forceRefresh: true },
      context,
    );

    expect(calculatePageRank).toHaveBeenCalledWith(
      expect.objectContaining({ limit: 25, forceRefresh: true }),
    );
    expect(result).toEqual([
      expect.objectContaining({ nodeId: 'n1', score: 0.42, pageRank: 0.42 }),
    ]);
  });

  it('delegates to the service for community detection', async () => {
    const detectCommunities = jest
      .fn()
      .mockResolvedValue([
        {
          communityId: 7,
          size: 12,
          algorithm: 'LOUVAIN',
          nodes: [{ nodeId: 'n1', label: 'Node 1' }],
        },
      ]);
    const context = {
      user: baseUser,
      services: {
        graphAnalytics: {
          calculatePageRank: jest.fn(),
          detectCommunities,
        },
      },
    } as any;

    const result = await graphAnalyticsResolvers.Query.graphCommunities(
      null,
      { limit: 10, algorithm: 'LABEL_PROPAGATION' },
      context,
    );

    expect(detectCommunities).toHaveBeenCalledWith(
      expect.objectContaining({ limit: 10, algorithm: 'LABEL_PROPAGATION' }),
    );
    expect(result).toEqual([
      expect.objectContaining({
        communityId: 7,
        size: 12,
        nodes: [expect.any(Object)],
      }),
    ]);
  });

  it('throws when the user is missing', async () => {
    await expect(
      graphAnalyticsResolvers.Query.graphPageRank(null, { limit: 5 }, {
        services: {},
      } as any),
    ).rejects.toThrow('Not authenticated');
  });

  it('throws when the user lacks the required role', async () => {
    const context = {
      user: { id: 'viewer', role: 'VIEWER' },
      services: {
        graphAnalytics: {
          calculatePageRank: jest.fn(),
          detectCommunities: jest.fn(),
        },
      },
    } as any;

    await expect(
      graphAnalyticsResolvers.Query.graphCommunities(
        null,
        { limit: 1 },
        context,
      ),
    ).rejects.toThrow('Forbidden');
  });
});

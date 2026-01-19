import {
  mapNarrativeCascades,
  PathwayMotif,
  SocialGraph,
} from '../graph-neural/gnn-analyzer';

describe('mapNarrativeCascades', () => {
  it('builds cascade metrics and typologies from message hops', () => {
    const graph: SocialGraph = {
      nodes: [
        {
          id: 'account-elite',
          degree: 3,
          inDegree: 1,
          outDegree: 2,
          clusteringCoefficient: 0.2,
          activityLevel: 0.9,
          postFrequency: 12,
          engagementRate: 0.7,
          profileCompleteness: 0.95,
          accountAge: 1200,
          verificationStatus: true,
          audienceSize: 200000,
          accountType: 'elite',
        },
        {
          id: 'account-mass-1',
          degree: 2,
          inDegree: 1,
          outDegree: 1,
          clusteringCoefficient: 0.1,
          activityLevel: 0.6,
          postFrequency: 6,
          engagementRate: 0.3,
          profileCompleteness: 0.8,
          accountAge: 300,
          verificationStatus: false,
          audienceSize: 5000,
          accountType: 'mass',
        },
        {
          id: 'account-mass-2',
          degree: 1,
          inDegree: 1,
          outDegree: 0,
          clusteringCoefficient: 0.05,
          activityLevel: 0.5,
          postFrequency: 4,
          engagementRate: 0.25,
          profileCompleteness: 0.7,
          accountAge: 200,
          verificationStatus: false,
          audienceSize: 3000,
          accountType: 'mass',
        },
      ],
      getNeighbors: () => [],
      getEdgeWeight: () => 1,
      getEdgeWeights: () => [],
      channels: [
        {
          id: 'channel-fringe',
          name: 'Fringe Board',
          platform: 'forum',
          tier: 'fringe',
        },
        {
          id: 'channel-mainstream',
          name: 'Mainstream Feed',
          platform: 'social',
          tier: 'mainstream',
        },
      ],
      messages: [
        {
          id: 'message-1',
          accountId: 'account-elite',
          channelId: 'channel-fringe',
          platform: 'forum',
          timestamp: new Date('2024-01-01T00:00:00Z'),
          reach: 20000,
          engagement: 200,
          narrativeId: 'narrative-1',
        },
        {
          id: 'message-2',
          accountId: 'account-mass-1',
          channelId: 'channel-fringe',
          platform: 'forum',
          timestamp: new Date('2024-01-01T00:05:00Z'),
          reach: 2000,
          engagement: 40,
          parentMessageId: 'message-1',
          narrativeId: 'narrative-1',
        },
        {
          id: 'message-3',
          accountId: 'account-mass-2',
          channelId: 'channel-mainstream',
          platform: 'social',
          timestamp: new Date('2024-01-01T00:10:00Z'),
          reach: 1500,
          engagement: 30,
          parentMessageId: 'message-2',
          narrativeId: 'narrative-1',
        },
      ],
    };

    const cascades = mapNarrativeCascades(graph);

    expect(cascades).toHaveLength(1);
    const cascade = cascades[0];
    const motifs = cascade.typologies.map(typology => typology.motif);

    expect(cascade.metrics.totalReach).toBe(23500);
    expect(cascade.pathways[0].metrics.hopCount).toBe(3);
    expect(motifs).toEqual(
      expect.arrayContaining([
        PathwayMotif.ELITE_MASS_RELAY,
        PathwayMotif.FRINGE_TO_MAINSTREAM,
      ])
    );
  });
});

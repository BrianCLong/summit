import { InfluenceNetworkExtractor } from '../src/InfluenceNetworkExtractor.js';
import { SourceData } from '../src/types.js';

describe('InfluenceNetworkExtractor', () => {
  const buildExtractor = () => new InfluenceNetworkExtractor();

  it('extracts relationships and builds a weighted graph', () => {
    const dataset: SourceData[] = [
      {
        kind: 'social',
        posts: [
          {
            id: 'p1',
            author: 'Alice',
            text: 'Working with @Bob on the latest report',
            timestamp: '2024-01-01T00:00:00Z',
          },
          {
            id: 'p2',
            author: 'Alice',
            text: 'Follow up with @Bob ASAP',
            timestamp: '2024-01-01T00:01:00Z',
          },
          {
            id: 'p3',
            author: 'Bob',
            text: 'Replying to Alice',
            timestamp: '2024-01-01T00:02:00Z',
            inReplyTo: 'Alice',
          },
          {
            id: 'p4',
            author: 'Carol',
            text: 'Sharing Alice update',
            timestamp: '2024-01-01T00:03:00Z',
            sharedFrom: 'Alice',
          },
        ],
      },
    ];

    const extractor = buildExtractor();
    const network = extractor.extract(dataset);

    const mentionRel = network.relationships.find(
      (rel) =>
        rel.type === 'mention' && rel.from === 'alice' && rel.to === 'bob',
    );
    expect(mentionRel?.weight).toBe(2);

    const replyRel = network.relationships.find(
      (rel) => rel.type === 'reply' && rel.from === 'bob' && rel.to === 'alice',
    );
    expect(replyRel).toBeDefined();

    const shareRel = network.relationships.find(
      (rel) =>
        rel.type === 'share' && rel.from === 'carol' && rel.to === 'alice',
    );
    expect(shareRel).toBeDefined();

    const aliceEdges = network.graph.edges.filter(
      (edge) => edge.from === 'alice',
    );
    expect(aliceEdges[0]?.weight).toBeGreaterThanOrEqual(2);
  });

  it('enriches the network with motif analytics', () => {
    const dataset: SourceData[] = [
      {
        kind: 'social',
        posts: [
          {
            id: 'b1',
            author: 'bot1',
            text: 'Boost @target',
            timestamp: '2024-01-02T00:00:00Z',
            sharedFrom: 'target',
          },
          {
            id: 'b2',
            author: 'bot1',
            text: 'Boost again @target',
            timestamp: '2024-01-02T00:05:00Z',
            sharedFrom: 'target',
          },
          {
            id: 'b3',
            author: 'bot2',
            text: 'Boost @target',
            timestamp: '2024-01-02T00:01:00Z',
            sharedFrom: 'target',
          },
          {
            id: 'b4',
            author: 'bot2',
            text: 'Boost again',
            timestamp: '2024-01-02T00:06:00Z',
            sharedFrom: 'target',
          },
          {
            id: 'b5',
            author: 'bot3',
            text: 'Boost',
            timestamp: '2024-01-02T00:02:00Z',
            sharedFrom: 'target',
          },
          {
            id: 'b6',
            author: 'bot3',
            text: 'Boost again',
            timestamp: '2024-01-02T00:07:00Z',
            sharedFrom: 'target',
          },
          {
            id: 'c1',
            author: 'analyst1',
            text: '@target interesting',
            timestamp: '2024-01-02T00:03:00Z',
          },
          {
            id: 'c2',
            author: 'analyst2',
            text: '@target insights',
            timestamp: '2024-01-02T00:04:00Z',
          },
        ],
      },
    ];

    const extractor = buildExtractor();
    const enriched = extractor.enrich(extractor.extract(dataset));

    expect(enriched.motifs.botNetworks.length).toBeGreaterThan(0);
    expect(enriched.motifs.amplifierClusters[0]?.nodes).toContain('bot1');
    expect(enriched.motifs.coordinatedBehaviors.length).toBeGreaterThanOrEqual(
      0,
    );
  });

  it('ranks nodes by weighted influence', () => {
    const dataset: SourceData[] = [
      {
        kind: 'social',
        posts: [
          {
            id: 'r1',
            author: 'AnalystA',
            text: '@Leader sharing update',
            timestamp: '2024-01-03T00:00:00Z',
            sharedFrom: 'Leader',
          },
          {
            id: 'r2',
            author: 'Leader',
            text: 'Thanks @AnalystA',
            timestamp: '2024-01-03T00:01:00Z',
          },
          {
            id: 'r3',
            author: 'Leader',
            text: 'Reply to AnalystA',
            timestamp: '2024-01-03T00:02:00Z',
            inReplyTo: 'AnalystA',
          },
        ],
      },
    ];

    const extractor = buildExtractor();
    const ranked = extractor.rankNodes(extractor.extract(dataset));

    expect(ranked.rankings[0]?.score).toBeGreaterThanOrEqual(
      ranked.rankings[1]?.score ?? 0,
    );
    expect(
      ranked.rankings.find((item) => item.entity.id === 'leader'),
    ).toBeDefined();
  });
});

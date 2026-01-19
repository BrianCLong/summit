import {
  Actor,
  SocialPost,
  NarrativeTechnique,
  ProtectiveNarrative,
  MessengerProfile,
} from '../types';
import { AudienceSegmentModeler } from '../AudienceSegmentModeler';

describe('AudienceSegmentModeler', () => {
  const modeler = new AudienceSegmentModeler();
  const actors: Actor[] = [
    {
      id: 'actor-1',
      username: 'user1',
      platform: 'x',
      createdAt: new Date('2024-01-01T00:00:00Z'),
      metadata: {
        identityCluster: 'youth',
        mediaDiet: ['tiktok', 'youtube'],
        priorBeliefs: ['anti-establishment'],
        cognitiveVulnerabilities: ['confirmation-bias'],
        resilienceSignals: ['critical-thinking'],
        trustedMessengers: ['messenger-1'],
        trustRelationships: [{ targetActorId: 'actor-2', trustScore: 0.7 }],
      },
    },
    {
      id: 'actor-2',
      username: 'user2',
      platform: 'x',
      createdAt: new Date('2023-11-01T00:00:00Z'),
      metadata: {
        identityCluster: 'youth',
        mediaDiet: ['tiktok'],
        priorBeliefs: ['anti-establishment'],
        cognitiveVulnerabilities: ['scarcity'],
        resilienceSignals: ['community'],
        trustedMessengers: ['messenger-1'],
        trustRelationships: [{ targetActorId: 'actor-1', trustScore: 0.5 }],
      },
    },
    {
      id: 'actor-3',
      username: 'user3',
      platform: 'facebook',
      createdAt: new Date('2020-01-01T00:00:00Z'),
      metadata: {
        identityCluster: 'local-parents',
        mediaDiet: ['facebook'],
        priorBeliefs: ['public-safety'],
        cognitiveVulnerabilities: ['fear'],
        resilienceSignals: ['local-trust'],
        trustedMessengers: ['messenger-2'],
      },
    },
  ];

  const posts: SocialPost[] = [
    {
      id: 'post-1',
      content: 'Narrative A',
      authorId: 'actor-1',
      timestamp: new Date('2024-05-01T12:00:00Z'),
      platform: 'x',
      metadata: {
        narrativeId: 'narrative-a',
        likes: 10,
        comments: 2,
        shares: 3,
        sentimentScore: 0.6,
      },
    },
    {
      id: 'post-2',
      content: 'Narrative A',
      authorId: 'actor-2',
      timestamp: new Date('2024-05-01T12:05:00Z'),
      platform: 'x',
      metadata: {
        narrativeId: 'narrative-a',
        likes: 8,
        comments: 1,
        shares: 1,
        sentimentScore: 0.4,
      },
    },
    {
      id: 'post-3',
      content: 'Narrative B',
      authorId: 'actor-3',
      timestamp: new Date('2024-05-01T12:10:00Z'),
      platform: 'facebook',
      metadata: {
        narrativeId: 'narrative-b',
        likes: 3,
        comments: 0,
        shares: 0,
        sentimentScore: 0.2,
      },
    },
  ];

  it('builds audience segment graph with uptake metrics and trust edges', () => {
    const graph = modeler.buildAudienceSegmentGraph(actors, posts);

    expect(graph.segments).toHaveLength(2);
    const youthSegment = graph.segments.find(
      (segment) => segment.identityCluster === 'youth',
    );
    expect(youthSegment).toBeDefined();
    expect(youthSegment?.size).toBe(2);
    expect(youthSegment?.narrativeUptake[0].narrativeId).toBe('narrative-a');
    expect(graph.trustEdges.length).toBeGreaterThan(0);
  });

  it('scores vulnerability and resilience per segment and technique', () => {
    const graph = modeler.buildAudienceSegmentGraph(actors, posts);
    const techniques: NarrativeTechnique[] = [
      {
        id: 'tech-1',
        name: 'Scarcity Pressure',
        cognitiveBiases: ['scarcity'],
        emotionalTriggers: ['fear'],
        channelPreferences: ['tiktok'],
        potency: 0.8,
      },
    ];
    const protectiveNarratives: ProtectiveNarrative[] = [
      {
        id: 'protect-1',
        themes: ['critical-thinking', 'community'],
        messengerIds: ['messenger-1'],
        targetTechniqueIds: ['tech-1'],
      },
    ];
    const messengers: MessengerProfile[] = [
      {
        id: 'messenger-1',
        name: 'Community Mentor',
        credibilityScore: 0.9,
        themes: ['critical-thinking', 'community'],
      },
      {
        id: 'messenger-2',
        name: 'Local Official',
        credibilityScore: 0.7,
        themes: ['public-safety'],
      },
    ];

    const profiles = modeler.scoreSegmentRisks(
      graph.segments,
      techniques,
      protectiveNarratives,
      messengers,
    );

    expect(profiles).toHaveLength(2);
    const youthProfile = profiles.find(
      (profile) =>
        graph.segments.find((segment) => segment.id === profile.segmentId)
          ?.identityCluster === 'youth',
    );
    const parentProfile = profiles.find(
      (profile) =>
        graph.segments.find((segment) => segment.id === profile.segmentId)
          ?.identityCluster === 'local-parents',
    );

    expect(youthProfile?.vulnerabilityScore).toBeGreaterThan(
      parentProfile?.vulnerabilityScore ?? 0,
    );
    expect(youthProfile?.resilienceScore).toBeGreaterThan(0);
    expect(youthProfile?.recommendedProtectiveNarratives).toContain('protect-1');
    expect(youthProfile?.recommendedMessengers).toContain('messenger-1');
  });
});


import { jest, describe, it, expect, beforeEach, afterEach, beforeAll, afterAll } from '@jest/globals';
import { BehavioralAnalyzer } from '../BehavioralAnalyzer';
import { Actor, SocialPost } from '../types';

describe('BehavioralAnalyzer', () => {
  let analyzer: BehavioralAnalyzer;

  beforeEach(() => {
    analyzer = new BehavioralAnalyzer();
  });

  it('should generate a valid fingerprint', () => {
    const actor: Actor = {
      id: 'user1',
      username: 'user1',
      platform: 'twitter',
      createdAt: new Date(Date.now() - 1000 * 60 * 60 * 24 * 30), // 30 days old
      metadata: {},
    };
    const posts: SocialPost[] = [
      { id: '1', content: 'test', authorId: 'user1', timestamp: new Date(), platform: 'twitter', metadata: {} },
      { id: '2', content: 'test2', authorId: 'user1', timestamp: new Date(Date.now() - 1000 * 60), platform: 'twitter', metadata: {} }
    ];

    const fp = analyzer.generateFingerprint(actor, posts);
    expect(fp.postFrequency).toBeGreaterThan(0);
    expect(fp.accountAgeDays).toBeCloseTo(30, 0);
  });

  it('should detect bot-like behavior', () => {
    const fp = {
      postFrequency: 100, // Very high
      burstiness: 0.9,
      contentRepetition: 0.8,
      sentimentVolatility: 0.5,
      accountAgeDays: 1,
    };
    const result = analyzer.detectBot(fp);
    expect(result.isAnomalous).toBe(true);
    expect(result.reason).toContain('High post frequency');
  });

  it('should detect temporal coordination', () => {
      const now = new Date();
      const postsByActor = new Map<string, SocialPost[]>();

      // Create 6 actors posting at the same time
      for(let i=0; i<6; i++) {
          postsByActor.set(`user${i}`, [{
              id: `p${i}`,
              content: 'msg',
              authorId: `user${i}`,
              timestamp: now,
              platform: 'twitter',
              metadata: {}
          }]);
      }

      const result = analyzer.detectTemporalCoordination(postsByActor);
      expect(result.isAnomalous).toBe(true);
      expect(result.reason).toContain('High temporal coordination');
  });

  it('should detect geo-temporal anomalies (impossible travel)', () => {
    const posts: SocialPost[] = [
      {
        id: 'p1', content: 'London', authorId: 'u1', timestamp: new Date('2024-01-01T10:00:00Z'),
        platform: 'x', metadata: {},
        location: { lat: 51.5074, lng: -0.1278 } // London
      },
      {
        id: 'p2', content: 'NYC', authorId: 'u1', timestamp: new Date('2024-01-01T11:00:00Z'),
        platform: 'x', metadata: {},
        location: { lat: 40.7128, lng: -74.0060 } // NYC
      }
    ];
    // London to NYC in 1 hour is impossible
    const result = analyzer.detectGeoTemporalAnomalies(posts);
    expect(result.isAnomalous).toBe(true);
    expect(result.reason).toContain('impossible travel');
  });
});

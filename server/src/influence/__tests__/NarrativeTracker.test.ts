
import { jest, describe, it, expect, beforeEach, afterEach, beforeAll, afterAll } from '@jest/globals';
import { NarrativeTracker } from '../NarrativeTracker.js';
import { SocialPost } from '../types.js';

describe('NarrativeTracker', () => {
  let tracker: NarrativeTracker;

  beforeEach(() => {
    tracker = new NarrativeTracker();
  });

  it('should cluster similar posts', () => {
    const posts: SocialPost[] = [
      { id: '1', content: 'The azure sky is bright today', authorId: 'u1', timestamp: new Date(), platform: 'x', metadata: {} },
      { id: '2', content: 'The azure sky looks bright', authorId: 'u2', timestamp: new Date(), platform: 'x', metadata: {} },
      { id: '3', content: 'Look how bright the azure sky is', authorId: 'u3', timestamp: new Date(), platform: 'x', metadata: {} },
      { id: '4', content: 'I like apples', authorId: 'u4', timestamp: new Date(), platform: 'x', metadata: {} },
    ];

    const clusters = tracker.clusterNarratives(posts);
    expect(clusters.length).toBe(1); // Should cluster the 3 sky posts
    expect(clusters[0].volume).toBe(3);
    expect(clusters[0].keywords).toContain('azure');
  });

  it('should detect linguistic anomalies (copypasta)', () => {
      const posts: SocialPost[] = [];
      for(let i=0; i<10; i++) {
          posts.push({
              id: `${i}`,
              content: 'Exact same message',
              authorId: `u${i}`,
              timestamp: new Date(),
              platform: 'x',
              metadata: {}
          });
      }

      const result = tracker.detectLinguisticAnomalies(posts);
      expect(result.isAnomalous).toBe(true);
      expect(result.reason).toContain('Identical content repeated');
  });
});

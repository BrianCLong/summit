
import { SwarmDetector } from '../detection/swarm_signature';
import { NarrativeEvent, NarrativeEventType } from '../../narrative/types';
import { SocialPost, Actor } from '../types';
import { ActorClass } from '../../narrative/primitives';

describe('SwarmDetector', () => {
  let detector: SwarmDetector;

  beforeEach(() => {
    detector = new SwarmDetector();
  });

  describe('detectTemporalCoordination', () => {
    it('should detect high coordination (low CV) in swarm-like events', () => {
      // Create events with exact 100ms spacing (robotic)
      const events: NarrativeEvent[] = [];
      for (let i = 0; i < 10; i++) {
        events.push({
          id: `evt_${i}`,
          type: 'social' as NarrativeEventType,
          theme: 'test',
          intensity: 1,
          description: 'test',
          scheduledTick: 1000 + (i * 100), // 1000, 1100, 1200...
        });
      }

      const score = detector.detectTemporalCoordination(events);
      // Perfect spacing -> variance=0 -> CV=0 -> Score=1.0
      expect(score).toBeGreaterThan(0.9);
    });

    it('should detect low coordination in random organic events', () => {
      // Create events with random spacing
      const events: NarrativeEvent[] = [];
      let time = 1000;
      for (let i = 0; i < 10; i++) {
        time += Math.random() * 1000; // Random spacing 0-1000
        events.push({
          id: `evt_${i}`,
          type: 'social' as NarrativeEventType,
          theme: 'test',
          intensity: 1,
          description: 'test',
          scheduledTick: time,
        });
      }

      const score = detector.detectTemporalCoordination(events);
      expect(score).toBeLessThan(0.8);
    });
  });

  describe('detectSemanticDivergence', () => {
    it('should detect low divergence (high similarity) for copy-paste bots', () => {
      const posts: SocialPost[] = [
        { id: '1', content: 'Vote for Pedro', authorId: 'a', timestamp: new Date(), platform: 'x', metadata: {} },
        { id: '2', content: 'Vote for Pedro', authorId: 'b', timestamp: new Date(), platform: 'x', metadata: {} },
        { id: '3', content: 'Vote for Pedro', authorId: 'c', timestamp: new Date(), platform: 'x', metadata: {} },
      ];

      const divergence = detector.detectSemanticDivergence(posts);
      // Similarity = 1.0, Divergence = 0.0
      expect(divergence).toBeCloseTo(0, 1);
    });

    it('should detect high divergence for AI rewritten content', () => {
      const posts: SocialPost[] = [
        { id: '1', content: 'The economy is crashing hard right now.', authorId: 'a', timestamp: new Date(), platform: 'x', metadata: {} },
        { id: '2', content: 'Financial markets are in a total freefall.', authorId: 'b', timestamp: new Date(), platform: 'x', metadata: {} },
        { id: '3', content: 'Money is becoming worthless rapidly.', authorId: 'c', timestamp: new Date(), platform: 'x', metadata: {} },
      ];

      const divergence = detector.detectSemanticDivergence(posts);
      // These share very few 2-grams, so Jaccard sim is low, divergence high.
      expect(divergence).toBeGreaterThan(0.5);
    });
  });

  describe('assessCollectiveBehavior', () => {
    it('should identify an AI Swarm', () => {
      // High Coord (Robotic time) + High Divergence (Different text)
      const events: NarrativeEvent[] = [];
      for (let i = 0; i < 10; i++) {
        events.push({ id: `e${i}`, type: 'social', theme: 'x', intensity: 1, description: 'x', scheduledTick: i * 100 });
      }

      const posts: SocialPost[] = [
         { id: '1', content: 'Sky is blue', authorId: 'a', timestamp: new Date(), platform: 'x', metadata: {} },
         { id: '2', content: 'Roses are red', authorId: 'b', timestamp: new Date(), platform: 'x', metadata: {} },
         { id: '3', content: 'Sugar is sweet', authorId: 'c', timestamp: new Date(), platform: 'x', metadata: {} },
      ];

      const actors: Actor[] = []; // Not used in current stub

      const result = detector.assessCollectiveBehavior(actors, posts, events);

      expect(result.isSwarm).toBe(true);
      expect(result.reason).toContain('AI Swarm');
      expect(result.metrics.temporalCoordination).toBeGreaterThan(0.7);
      expect(result.metrics.semanticDivergence).toBeGreaterThan(0.5);
    });
  });
});

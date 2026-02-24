import { describe, it, expect } from 'vitest';
import { calculateAttentionLoad } from './attention-load';
import { calculateTrustShock } from './trust-shock';
import { calculateCohesionFracture } from './cohesion-fracture';
import { MessageNode } from '../features/variant-graph';

describe('Cognitive Infrastructure Metrics', () => {
  const dummyMessages: MessageNode[] = [
    { id: '1', content: 'Normal message', timestamp: 1000, authorId: 'a' },
    { id: '2', content: 'Another normal message', timestamp: 2000, authorId: 'b' },
  ];

  describe('Attention Load', () => {
    it('should be low for calm content', () => {
      const load = calculateAttentionLoad(dummyMessages, 1000);
      expect(load).toBeLessThan(0.1);
    });

    it('should be high for urgent content', () => {
      const urgentMessages = [
        { id: '1', content: 'URGENT: BREAKING NEWS NOW!', timestamp: 1000, authorId: 'a' },
        { id: '2', content: 'PANIC IN THE STREETS!', timestamp: 2000, authorId: 'b' },
        { id: '3', content: 'CRISIS ALERT!', timestamp: 3000, authorId: 'c' }
      ];
      // 3 messages in 2 seconds. Rate = 1.5 msg/sec = 90 msg/min.
      // Load logic divides by duration in minutes.
      // Score logic: 1 point per keyword + 0.5 for caps.
      // Msg 1: urgent, breaking, now (3) + caps (0.5) = 3.5?
      // Wait, let's check implementation.

      const load = calculateAttentionLoad(urgentMessages, 2000);
      expect(load).toBeGreaterThan(0.5);
    });
  });

  describe('Trust Shock', () => {
    it('should be zero for neutral content', () => {
      const score = calculateTrustShock(dummyMessages);
      expect(score).toBe(0);
    });

    it('should detect attacks on institutions', () => {
      const attackMessages = [
        { id: '1', content: 'The government is corrupt.', timestamp: 1000, authorId: 'a' }, // 'government' + 'corrupt'
        { id: '2', content: 'Media is fake news.', timestamp: 2000, authorId: 'b' },       // 'media' + 'fake'
        { id: '3', content: 'CDC is lying to us.', timestamp: 3000, authorId: 'c' }        // 'cdc' + 'lying' (lying not in list? 'liar' is)
      ];
      // 'lying' is not in NEGATIVE_MARKERS ['liar', 'fake', 'corrupt', 'coverup', 'scam', 'hoax', 'fraud', 'rigged', 'stolen']
      // So msg 3 might not count.

      const score = calculateTrustShock(attackMessages);
      expect(score).toBeGreaterThan(0);
      // 2 out of 3 messages match. Ratio = 0.66. Result = min(0.66 * 2, 1.0) = 1.0.
      expect(score).toBe(1.0);
    });
  });

  describe('Cohesion Fracture', () => {
    it('should be zero for neutral content', () => {
      const score = calculateCohesionFracture(dummyMessages);
      expect(score).toBe(0);
    });

    it('should detect polarizing language', () => {
      const polarizingMessages = [
        { id: '1', content: 'They want to destroy our country.', timestamp: 1000, authorId: 'a' }, // 'they want', 'our country'
        { id: '2', content: 'Those people are sheep.', timestamp: 2000, authorId: 'b' },           // 'sheep'
        { id: '3', content: 'Enemy of the people.', timestamp: 3000, authorId: 'c' }               // 'enemy'
      ];

      const score = calculateCohesionFracture(polarizingMessages);
      expect(score).toBeGreaterThan(0);
      // 3 out of 3 match. Ratio = 1.0. Result = min(3.0, 1.0) = 1.0.
      expect(score).toBe(1.0);
    });
  });
});

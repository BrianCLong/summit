/**
 * Rollout Utilities Tests
 */

import {
  evaluateRollout,
  validateRollout,
  createGradualRollout,
  createABTest,
} from '../utils/rollout';

describe('Rollout Utilities', () => {
  describe('evaluateRollout', () => {
    it('should consistently assign users to variations', () => {
      const rollout = createGradualRollout('enabled', 'disabled', 50);

      const user1Result1 = evaluateRollout(rollout, { userId: 'user-1' });
      const user1Result2 = evaluateRollout(rollout, { userId: 'user-1' });

      expect(user1Result1).toBe(user1Result2);
    });

    it('should distribute users approximately evenly', () => {
      const rollout = createGradualRollout('enabled', 'disabled', 50);

      const results: Record<string, number> = { enabled: 0, disabled: 0 };

      for (let i = 0; i < 1000; i++) {
        const variation = evaluateRollout(rollout, { userId: `user-${i}` });
        if (variation) {
          results[variation]++;
        }
      }

      const enabledPercentage = (results.enabled / 1000) * 100;
      expect(enabledPercentage).toBeGreaterThan(45);
      expect(enabledPercentage).toBeLessThan(55);
    });

    it('should return null when no bucket value', () => {
      const rollout = createGradualRollout('enabled', 'disabled', 50);
      const variation = evaluateRollout(rollout, {});
      expect(variation).toBeNull();
    });
  });

  describe('validateRollout', () => {
    it('should validate correct rollout', () => {
      const rollout = createGradualRollout('enabled', 'disabled', 50);
      const result = validateRollout(rollout);

      expect(result.valid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it('should detect invalid total percentage', () => {
      const rollout = {
        type: 'percentage' as const,
        variations: [
          { variation: 'a', percentage: 60 },
          { variation: 'b', percentage: 60 },
        ],
      };

      const result = validateRollout(rollout);
      expect(result.valid).toBe(false);
      expect(result.errors.length).toBeGreaterThan(0);
    });

    it('should detect missing variations', () => {
      const rollout = {
        type: 'percentage' as const,
        variations: [],
      };

      const result = validateRollout(rollout);
      expect(result.valid).toBe(false);
      expect(result.errors).toContain('Rollout must have at least one variation');
    });
  });

  describe('createGradualRollout', () => {
    it('should create valid gradual rollout', () => {
      const rollout = createGradualRollout('enabled', 'disabled', 25);

      expect(rollout.type).toBe('percentage');
      expect(rollout.variations).toHaveLength(2);
      expect(rollout.variations[0].percentage).toBe(25);
      expect(rollout.variations[1].percentage).toBe(75);
    });
  });

  describe('createABTest', () => {
    it('should create valid A/B test', () => {
      const abTest = createABTest('variant-a', 'variant-b', 50);

      expect(abTest.type).toBe('ab_test');
      expect(abTest.variations).toHaveLength(2);
      expect(abTest.variations[0].percentage).toBe(50);
      expect(abTest.variations[1].percentage).toBe(50);
    });

    it('should handle custom percentages', () => {
      const abTest = createABTest('variant-a', 'variant-b', 30);

      expect(abTest.variations[0].percentage).toBe(30);
      expect(abTest.variations[1].percentage).toBe(70);
    });
  });
});

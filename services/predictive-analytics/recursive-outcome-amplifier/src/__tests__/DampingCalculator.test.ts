/**
 * Tests for DampingCalculator
 */

import {
  DampingCalculator,
  calculateAverageDampening,
  findOptimalInterventionOrder,
} from '../algorithms/DampingCalculator.js';
import type { CausalLink } from '../algorithms/PropagationEngine.js';

describe('DampingCalculator', () => {
  let calculator: DampingCalculator;

  beforeEach(() => {
    calculator = new DampingCalculator();
  });

  describe('calculateDampening', () => {
    it('should calculate dampening for first order', () => {
      const link: CausalLink = {
        targetEvent: 'Event',
        domain: 'ECONOMIC',
        baseProbability: 0.8,
        baseMagnitude: 5.0,
        timeDelay: 24,
        evidenceQuality: 0.9,
        strength: 0.9,
      };

      const dampening = calculator.calculateDampening(1, link);

      // For order 1, baseDecay^0 = 1.0
      expect(dampening).toBeGreaterThan(0.9);
      expect(dampening).toBeLessThanOrEqual(1.0);
    });

    it('should decrease dampening with higher orders', () => {
      const link: CausalLink = {
        targetEvent: 'Event',
        domain: 'ECONOMIC',
        baseProbability: 0.8,
        baseMagnitude: 5.0,
        timeDelay: 24,
        evidenceQuality: 0.7,
        strength: 0.7,
      };

      const dampening1 = calculator.calculateDampening(1, link);
      const dampening2 = calculator.calculateDampening(2, link);
      const dampening3 = calculator.calculateDampening(3, link);

      expect(dampening2).toBeLessThan(dampening1);
      expect(dampening3).toBeLessThan(dampening2);
    });

    it('should apply minimum dampening floor', () => {
      const link: CausalLink = {
        targetEvent: 'Event',
        domain: 'ECONOMIC',
        baseProbability: 0.1,
        baseMagnitude: 1.0,
        timeDelay: 100,
        evidenceQuality: 0.1,
        strength: 0.1,
      };

      const dampening = calculator.calculateDampening(10, link);

      expect(dampening).toBeGreaterThanOrEqual(0.1);
    });

    it('should consider evidence quality', () => {
      const highQualityLink: CausalLink = {
        targetEvent: 'Event',
        domain: 'ECONOMIC',
        baseProbability: 0.8,
        baseMagnitude: 5.0,
        timeDelay: 24,
        evidenceQuality: 0.9,
        strength: 0.9,
      };

      const lowQualityLink: CausalLink = {
        ...highQualityLink,
        evidenceQuality: 0.3,
        strength: 0.3,
      };

      const highQualityDampening = calculator.calculateDampening(
        2,
        highQualityLink,
      );
      const lowQualityDampening = calculator.calculateDampening(
        2,
        lowQualityLink,
      );

      expect(highQualityDampening).toBeGreaterThan(lowQualityDampening);
    });
  });

  describe('calculateMagnitudeDampening', () => {
    it('should calculate magnitude-specific dampening', () => {
      const link: CausalLink = {
        targetEvent: 'Event',
        domain: 'ECONOMIC',
        baseProbability: 0.8,
        baseMagnitude: 5.0,
        timeDelay: 24,
        evidenceQuality: 0.7,
        strength: 0.6,
      };

      const magnitudeDampening = calculator.calculateMagnitudeDampening(
        2,
        link,
      );

      expect(magnitudeDampening).toBeGreaterThan(0);
      expect(magnitudeDampening).toBeLessThanOrEqual(1.0);
    });
  });

  describe('calculateTimeDampening', () => {
    it('should dampen by half at half-life', () => {
      const halfLife = 24;
      const dampening = calculator.calculateTimeDampening(halfLife, halfLife);

      expect(dampening).toBeCloseTo(0.5, 2);
    });

    it('should dampen more with longer time', () => {
      const halfLife = 24;
      const dampening1 = calculator.calculateTimeDampening(12, halfLife);
      const dampening2 = calculator.calculateTimeDampening(24, halfLife);
      const dampening3 = calculator.calculateTimeDampening(48, halfLife);

      expect(dampening2).toBeLessThan(dampening1);
      expect(dampening3).toBeLessThan(dampening2);
    });
  });

  describe('calculateConfidenceDampening', () => {
    it('should decrease confidence with higher orders', () => {
      const baseConfidence = 0.9;

      const confidence1 = calculator.calculateConfidenceDampening(
        1,
        baseConfidence,
      );
      const confidence2 = calculator.calculateConfidenceDampening(
        2,
        baseConfidence,
      );
      const confidence3 = calculator.calculateConfidenceDampening(
        3,
        baseConfidence,
      );

      expect(confidence2).toBeLessThan(confidence1);
      expect(confidence3).toBeLessThan(confidence2);
    });
  });

  describe('calculateDomainDampening', () => {
    it('should return 1.0 for same domain', () => {
      const dampening = calculator.calculateDomainDampening(
        'ECONOMIC',
        'ECONOMIC',
      );

      expect(dampening).toBe(1.0);
    });

    it('should return < 1.0 for cross-domain transitions', () => {
      const dampening = calculator.calculateDomainDampening(
        'ECONOMIC',
        'SOCIAL',
      );

      expect(dampening).toBeLessThan(1.0);
      expect(dampening).toBeGreaterThan(0);
    });

    it('should have higher affinity for related domains', () => {
      const economicToSocial = calculator.calculateDomainDampening(
        'ECONOMIC',
        'SOCIAL',
      );
      const economicToUnknown = calculator.calculateDomainDampening(
        'ECONOMIC',
        'UNKNOWN',
      );

      expect(economicToSocial).toBeGreaterThan(economicToUnknown);
    });
  });

  describe('calculateCombinedDampening', () => {
    it('should combine multiple dampening factors', () => {
      const link: CausalLink = {
        targetEvent: 'Event',
        domain: 'SOCIAL',
        baseProbability: 0.8,
        baseMagnitude: 5.0,
        timeDelay: 24,
        evidenceQuality: 0.7,
        strength: 0.7,
      };

      const dampening = calculator.calculateCombinedDampening(2, link, {
        timeElapsed: 12,
        timeHalfLife: 24,
        sourceDomain: 'ECONOMIC',
      });

      expect(dampening).toBeGreaterThan(0);
      expect(dampening).toBeLessThanOrEqual(1.0);
    });
  });

  describe('calculateAverageDampening', () => {
    it('should calculate average across multiple links', () => {
      const links = [
        {
          order: 1,
          link: {
            targetEvent: 'Event1',
            domain: 'ECONOMIC',
            baseProbability: 0.8,
            baseMagnitude: 5.0,
            timeDelay: 24,
            evidenceQuality: 0.9,
            strength: 0.9,
          },
        },
        {
          order: 2,
          link: {
            targetEvent: 'Event2',
            domain: 'SOCIAL',
            baseProbability: 0.6,
            baseMagnitude: 3.0,
            timeDelay: 48,
            evidenceQuality: 0.6,
            strength: 0.6,
          },
        },
      ];

      const avgDampening = calculateAverageDampening(links);

      expect(avgDampening).toBeGreaterThan(0);
      expect(avgDampening).toBeLessThanOrEqual(1.0);
    });

    it('should return 0 for empty array', () => {
      const avgDampening = calculateAverageDampening([]);
      expect(avgDampening).toBe(0);
    });
  });

  describe('findOptimalInterventionOrder', () => {
    it('should find optimal intervention order', () => {
      const link: CausalLink = {
        targetEvent: 'Event',
        domain: 'ECONOMIC',
        baseProbability: 0.8,
        baseMagnitude: 5.0,
        timeDelay: 24,
        evidenceQuality: 0.7,
        strength: 0.7,
      };

      const optimalOrder = findOptimalInterventionOrder(5, link);

      expect(optimalOrder).toBeGreaterThan(0);
      expect(optimalOrder).toBeLessThanOrEqual(5);
    });
  });

  describe('custom configuration', () => {
    it('should use custom dampening config', () => {
      const customCalculator = new DampingCalculator({
        baseDecay: 0.9, // Less dampening
        evidenceWeight: 0.5,
      });

      const link: CausalLink = {
        targetEvent: 'Event',
        domain: 'ECONOMIC',
        baseProbability: 0.8,
        baseMagnitude: 5.0,
        timeDelay: 24,
        evidenceQuality: 0.7,
        strength: 0.7,
      };

      const defaultDampening = calculator.calculateDampening(3, link);
      const customDampening = customCalculator.calculateDampening(3, link);

      // Custom config with higher baseDecay should result in less dampening
      expect(customDampening).toBeGreaterThan(defaultDampening);
    });
  });
});

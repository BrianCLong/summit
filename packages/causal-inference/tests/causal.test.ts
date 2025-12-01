/**
 * Tests for Causal Inference
 */

import { PropensityScoreMatcher } from '../src/methods/propensity-score-matching.js';
import { DifferenceInDifferences } from '../src/methods/difference-in-differences.js';

describe('PropensityScoreMatcher', () => {
  const generateData = (n: number): {
    covariates: number[][];
    treatment: boolean[];
    outcomes: number[];
  } => {
    const covariates: number[][] = [];
    const treatment: boolean[] = [];
    const outcomes: number[] = [];

    for (let i = 0; i < n; i++) {
      const x1 = Math.random();
      const x2 = Math.random();
      covariates.push([x1, x2]);

      // Treatment assignment based on covariates
      const treatmentProb = 0.3 + 0.4 * x1;
      const isTreated = Math.random() < treatmentProb;
      treatment.push(isTreated);

      // Outcome with treatment effect
      const baseOutcome = 10 + 5 * x1 + 3 * x2;
      const treatmentEffect = isTreated ? 2 : 0;
      outcomes.push(baseOutcome + treatmentEffect + (Math.random() - 0.5) * 2);
    }

    return { covariates, treatment, outcomes };
  };

  describe('estimateEffect', () => {
    it('should estimate treatment effect', () => {
      const matcher = new PropensityScoreMatcher();
      const { covariates, treatment, outcomes } = generateData(200);

      const effect = matcher.estimateEffect(covariates, treatment, outcomes);

      expect(typeof effect.ate).toBe('number');
      expect(typeof effect.att).toBe('number');
      expect(effect.confidence).toHaveLength(2);
      expect(effect.confidence[0]).toBeLessThan(effect.confidence[1]);
      expect(typeof effect.pValue).toBe('number');
      expect(effect.pValue).toBeGreaterThanOrEqual(0);
      expect(effect.pValue).toBeLessThanOrEqual(1);
    });

    it('should detect positive treatment effect', () => {
      const matcher = new PropensityScoreMatcher();

      // Create data with clear treatment effect
      const n = 200;
      const covariates = Array.from({ length: n }, () => [Math.random(), Math.random()]);
      const treatment = covariates.map(() => Math.random() > 0.5);
      const outcomes = treatment.map((t, i) =>
        covariates[i][0] * 10 + (t ? 5 : 0) + Math.random()
      );

      const effect = matcher.estimateEffect(covariates, treatment, outcomes);

      // Effect should be positive (treatment adds ~5)
      expect(effect.ate).toBeGreaterThan(0);
    });

    it('should handle unbalanced treatment groups', () => {
      const matcher = new PropensityScoreMatcher();

      const n = 150;
      const covariates = Array.from({ length: n }, () => [Math.random()]);
      const treatment = covariates.map(() => Math.random() > 0.8); // 20% treated
      const outcomes = treatment.map(t => (t ? 15 : 10) + Math.random());

      const effect = matcher.estimateEffect(covariates, treatment, outcomes);

      expect(effect.ate).toBeDefined();
    });
  });
});

describe('DifferenceInDifferences', () => {
  describe('estimate', () => {
    it('should estimate DiD effect', () => {
      const did = new DifferenceInDifferences();

      const treatmentPre = Array.from({ length: 50 }, () => 100 + Math.random() * 10);
      const treatmentPost = Array.from({ length: 50 }, () => 120 + Math.random() * 10);
      const controlPre = Array.from({ length: 50 }, () => 100 + Math.random() * 10);
      const controlPost = Array.from({ length: 50 }, () => 105 + Math.random() * 10);

      const effect = did.estimate(treatmentPre, treatmentPost, controlPre, controlPost);

      expect(typeof effect.ate).toBe('number');
      expect(typeof effect.att).toBe('number');
      expect(effect.confidence).toHaveLength(2);
      expect(effect.confidence[0]).toBeLessThan(effect.confidence[1]);
    });

    it('should detect treatment effect correctly', () => {
      const did = new DifferenceInDifferences();

      // Treatment group increases by 20, control by 5
      // DiD effect should be ~15
      const treatmentPre = Array(30).fill(100);
      const treatmentPost = Array(30).fill(120);
      const controlPre = Array(30).fill(100);
      const controlPost = Array(30).fill(105);

      const effect = did.estimate(treatmentPre, treatmentPost, controlPre, controlPost);

      expect(effect.ate).toBeCloseTo(15, 0);
    });

    it('should return zero effect when parallel trends', () => {
      const did = new DifferenceInDifferences();

      // Both groups change by same amount
      const treatmentPre = Array.from({ length: 30 }, () => 100 + Math.random());
      const treatmentPost = Array.from({ length: 30 }, () => 110 + Math.random());
      const controlPre = Array.from({ length: 30 }, () => 100 + Math.random());
      const controlPost = Array.from({ length: 30 }, () => 110 + Math.random());

      const effect = did.estimate(treatmentPre, treatmentPost, controlPre, controlPost);

      expect(Math.abs(effect.ate)).toBeLessThan(2);
    });

    it('should calculate confidence intervals', () => {
      const did = new DifferenceInDifferences();

      const treatmentPre = Array.from({ length: 100 }, () => 100 + Math.random() * 20);
      const treatmentPost = Array.from({ length: 100 }, () => 150 + Math.random() * 20);
      const controlPre = Array.from({ length: 100 }, () => 100 + Math.random() * 20);
      const controlPost = Array.from({ length: 100 }, () => 110 + Math.random() * 20);

      const effect = did.estimate(treatmentPre, treatmentPost, controlPre, controlPost);

      // Confidence interval should contain the point estimate
      expect(effect.ate).toBeGreaterThanOrEqual(effect.confidence[0]);
      expect(effect.ate).toBeLessThanOrEqual(effect.confidence[1]);
    });
  });
});

/**
 * Tests for Risk Scoring
 */

import { LogisticRiskScorer } from '../src/models/logistic-risk.js';
import { PSICalculator } from '../src/monitoring/psi-calculator.js';

describe('LogisticRiskScorer', () => {
  const generateTrainingData = (n: number): { features: number[][]; labels: number[] } => {
    const features: number[][] = [];
    const labels: number[] = [];

    for (let i = 0; i < n; i++) {
      const creditScore = Math.random() * 400 + 400;
      const income = Math.random() * 100000 + 20000;
      const debtRatio = Math.random();

      features.push([creditScore / 850, income / 150000, debtRatio]);
      labels.push(creditScore < 600 && debtRatio > 0.5 ? 1 : 0);
    }

    return { features, labels };
  };

  describe('fit', () => {
    it('should fit logistic risk model', () => {
      const scorer = new LogisticRiskScorer();
      const { features, labels } = generateTrainingData(200);

      expect(() => scorer.fit(features, labels)).not.toThrow();
    });

    it('should fit with feature names', () => {
      const scorer = new LogisticRiskScorer();
      const { features, labels } = generateTrainingData(200);
      const featureNames = ['credit_score', 'income', 'debt_ratio'];

      expect(() => scorer.fit(features, labels, featureNames)).not.toThrow();
    });
  });

  describe('score', () => {
    it('should return risk score with all components', () => {
      const scorer = new LogisticRiskScorer();
      const { features, labels } = generateTrainingData(200);

      scorer.fit(features, labels, ['credit_score', 'income', 'debt_ratio']);

      const riskScore = scorer.score('entity_1', [0.7, 0.5, 0.3]);

      expect(riskScore.entityId).toBe('entity_1');
      expect(typeof riskScore.score).toBe('number');
      expect(riskScore.score).toBeGreaterThanOrEqual(0);
      expect(riskScore.score).toBeLessThanOrEqual(1000);
      expect(typeof riskScore.probability).toBe('number');
      expect(riskScore.probability).toBeGreaterThanOrEqual(0);
      expect(riskScore.probability).toBeLessThanOrEqual(1);
      expect(['low', 'medium', 'high', 'critical']).toContain(riskScore.riskLevel);
      expect(riskScore.factors).toHaveLength(3);
      expect(riskScore.timestamp).toBeInstanceOf(Date);
    });

    it('should return factors with contributions', () => {
      const scorer = new LogisticRiskScorer();
      const { features, labels } = generateTrainingData(200);

      scorer.fit(features, labels, ['f1', 'f2', 'f3']);

      const riskScore = scorer.score('entity_2', [0.5, 0.5, 0.5]);

      riskScore.factors.forEach(factor => {
        expect(typeof factor.name).toBe('string');
        expect(typeof factor.weight).toBe('number');
        expect(typeof factor.value).toBe('number');
        expect(typeof factor.contribution).toBe('number');
      });
    });
  });

  describe('scoreBatch', () => {
    it('should score multiple entities', () => {
      const scorer = new LogisticRiskScorer();
      const { features, labels } = generateTrainingData(200);

      scorer.fit(features, labels);

      const entityIds = ['e1', 'e2', 'e3'];
      const entityFeatures = [[0.8, 0.6, 0.2], [0.4, 0.3, 0.8], [0.6, 0.5, 0.5]];

      const scores = scorer.scoreBatch(entityIds, entityFeatures);

      expect(scores).toHaveLength(3);
      expect(scores[0].entityId).toBe('e1');
      expect(scores[1].entityId).toBe('e2');
      expect(scores[2].entityId).toBe('e3');
    });
  });

  describe('risk levels', () => {
    it('should assign correct risk levels', () => {
      const scorer = new LogisticRiskScorer();
      const features = Array.from({ length: 200 }, () => [Math.random()]);
      const labels = features.map(f => f[0] > 0.5 ? 1 : 0);

      scorer.fit(features, labels);

      // High risk input (high probability of default)
      const highRiskScore = scorer.score('high', [0.9]);
      // Low risk input
      const lowRiskScore = scorer.score('low', [0.1]);

      expect(highRiskScore.score).not.toBe(lowRiskScore.score);
    });
  });
});

describe('PSICalculator', () => {
  describe('calculatePSI', () => {
    it('should calculate PSI between distributions', () => {
      const calculator = new PSICalculator();

      const baseline = Array.from({ length: 1000 }, () => Math.random() * 100);
      const current = Array.from({ length: 1000 }, () => Math.random() * 100);

      const psi = calculator.calculatePSI(baseline, current);

      expect(psi.variable).toBe('score');
      expect(typeof psi.psi).toBe('number');
      expect(psi.psi).toBeGreaterThanOrEqual(0);
      expect(['stable', 'warning', 'unstable']).toContain(psi.status);
    });

    it('should return stable for similar distributions', () => {
      const calculator = new PSICalculator();

      const data = Array.from({ length: 1000 }, () => Math.random() * 100);
      // Use same distribution
      const psi = calculator.calculatePSI(data, data);

      expect(psi.psi).toBeLessThan(0.1);
      expect(psi.status).toBe('stable');
    });

    it('should detect significant drift', () => {
      const calculator = new PSICalculator();

      const baseline = Array.from({ length: 1000 }, () => Math.random() * 50);
      const current = Array.from({ length: 1000 }, () => Math.random() * 50 + 50);

      const psi = calculator.calculatePSI(baseline, current);

      expect(psi.psi).toBeGreaterThan(0.1);
    });

    it('should work with different bin counts', () => {
      const calculator = new PSICalculator();

      const baseline = Array.from({ length: 500 }, () => Math.random() * 100);
      const current = Array.from({ length: 500 }, () => Math.random() * 100);

      const psi5 = calculator.calculatePSI(baseline, current, 5);
      const psi20 = calculator.calculatePSI(baseline, current, 20);

      expect(psi5.psi).toBeDefined();
      expect(psi20.psi).toBeDefined();
    });
  });
});

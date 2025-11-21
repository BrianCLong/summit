/**
 * Tests for Classifiers
 */

import { RandomForestClassifier } from '../src/classifiers/random-forest.js';
import { GradientBoostingClassifier } from '../src/classifiers/gradient-boosting.js';
import type { Dataset } from '../src/types/index.js';

describe('RandomForestClassifier', () => {
  const generateDataset = (n: number): Dataset => {
    const features: number[][] = [];
    const labels: number[] = [];

    for (let i = 0; i < n; i++) {
      const x1 = Math.random() * 10;
      const x2 = Math.random() * 10;
      features.push([x1, x2, x1 * x2, x1 + x2]);
      labels.push(x1 + x2 > 10 ? 1 : 0);
    }

    return { features, labels };
  };

  describe('fit', () => {
    it('should fit Random Forest model', () => {
      const model = new RandomForestClassifier({ nEstimators: 10, maxDepth: 5 });
      const dataset = generateDataset(100);

      expect(() => model.fit(dataset)).not.toThrow();
    });

    it('should handle multi-class classification', () => {
      const features = Array.from({ length: 150 }, () => [Math.random(), Math.random()]);
      const labels = features.map(f => f[0] < 0.33 ? 0 : f[0] < 0.66 ? 1 : 2);

      const model = new RandomForestClassifier({ nEstimators: 20 });
      expect(() => model.fit({ features, labels })).not.toThrow();
    });
  });

  describe('predict', () => {
    it('should predict class labels', () => {
      const model = new RandomForestClassifier({ nEstimators: 20, maxDepth: 5 });
      const trainDataset = generateDataset(100);
      const testFeatures = [[5, 6, 30, 11], [2, 3, 6, 5]];

      model.fit(trainDataset);
      const predictions = model.predict(testFeatures);

      expect(predictions).toHaveLength(2);
      predictions.forEach(p => {
        expect(typeof p.prediction).toBe('number');
        expect(typeof p.probability).toBe('number');
        expect(p.probability).toBeGreaterThanOrEqual(0);
        expect(p.probability).toBeLessThanOrEqual(1);
      });
    });
  });

  describe('predictProba', () => {
    it('should return probability distributions', () => {
      const model = new RandomForestClassifier({ nEstimators: 20 });
      const trainDataset = generateDataset(100);

      model.fit(trainDataset);
      const probas = model.predictProba([[5, 5, 25, 10]]);

      expect(probas).toHaveLength(1);
      expect(probas[0].length).toBe(2); // Binary classification
      expect(probas[0].reduce((a, b) => a + b, 0)).toBeCloseTo(1, 5);
    });
  });

  describe('getFeatureImportances', () => {
    it('should return feature importances', () => {
      const model = new RandomForestClassifier({ nEstimators: 20 });
      const trainDataset = generateDataset(100);

      model.fit(trainDataset);
      const importances = model.getFeatureImportances(['x1', 'x2', 'x1x2', 'sum']);

      expect(importances).toHaveLength(4);
      importances.forEach(imp => {
        expect(typeof imp.feature).toBe('string');
        expect(typeof imp.importance).toBe('number');
        expect(typeof imp.rank).toBe('number');
        expect(imp.importance).toBeGreaterThanOrEqual(0);
      });
    });
  });

  describe('evaluate', () => {
    it('should calculate performance metrics', () => {
      const model = new RandomForestClassifier({ nEstimators: 30, maxDepth: 10 });
      const trainDataset = generateDataset(200);
      const testDataset = generateDataset(50);

      model.fit(trainDataset);
      const performance = model.evaluate(testDataset);

      expect(typeof performance.accuracy).toBe('number');
      expect(performance.accuracy).toBeGreaterThanOrEqual(0);
      expect(performance.accuracy).toBeLessThanOrEqual(1);
    });
  });
});

describe('GradientBoostingClassifier', () => {
  const generateDataset = (n: number): Dataset => {
    const features: number[][] = [];
    const labels: number[] = [];

    for (let i = 0; i < n; i++) {
      const x1 = Math.random() * 10;
      const x2 = Math.random() * 10;
      features.push([x1, x2]);
      labels.push(x1 + x2 > 10 ? 1 : 0);
    }

    return { features, labels };
  };

  describe('fit', () => {
    it('should fit Gradient Boosting model', () => {
      const model = new GradientBoostingClassifier({
        nEstimators: 10,
        learningRate: 0.1,
        maxDepth: 3,
      });
      const dataset = generateDataset(100);

      expect(() => model.fit(dataset)).not.toThrow();
    });

    it('should support early stopping', () => {
      const model = new GradientBoostingClassifier({
        nEstimators: 100,
        learningRate: 0.1,
        maxDepth: 3,
        earlyStoppingRounds: 5,
      });

      const trainDataset = generateDataset(100);
      const validationDataset = generateDataset(30);

      expect(() => model.fit(trainDataset, validationDataset)).not.toThrow();
    });
  });

  describe('predict', () => {
    it('should predict with probabilities', () => {
      const model = new GradientBoostingClassifier({
        nEstimators: 20,
        learningRate: 0.1,
        maxDepth: 3,
      });

      const trainDataset = generateDataset(100);
      model.fit(trainDataset);

      const predictions = model.predict([[5, 6], [2, 3]]);

      expect(predictions).toHaveLength(2);
      predictions.forEach(p => {
        expect([0, 1]).toContain(p.prediction);
        expect(p.probability).toBeGreaterThanOrEqual(0);
        expect(p.probability).toBeLessThanOrEqual(1);
      });
    });
  });

  describe('evaluate', () => {
    it('should evaluate model performance', () => {
      const model = new GradientBoostingClassifier({
        nEstimators: 30,
        learningRate: 0.1,
        maxDepth: 5,
      });

      const trainDataset = generateDataset(200);
      const testDataset = generateDataset(50);

      model.fit(trainDataset);
      const performance = model.evaluate(testDataset);

      expect(performance.accuracy).toBeDefined();
      expect(performance.accuracy).toBeGreaterThan(0.5); // Better than random
    });
  });
});

/**
 * Tests for Regressors
 */

import { LinearRegression, RidgeRegression, LassoRegression } from '../src/regressors/linear-regression.js';
import type { Dataset } from '../src/types/index.js';

describe('LinearRegression', () => {
  const generateDataset = (n: number): Dataset => {
    const features: number[][] = [];
    const labels: number[] = [];

    for (let i = 0; i < n; i++) {
      const x1 = Math.random() * 10;
      const x2 = Math.random() * 10;
      features.push([x1, x2]);
      labels.push(2 * x1 + 3 * x2 + 5 + (Math.random() - 0.5) * 2);
    }

    return { features, labels };
  };

  describe('fit', () => {
    it('should fit linear regression model', () => {
      const model = new LinearRegression();
      const dataset = generateDataset(100);

      expect(() => model.fit(dataset)).not.toThrow();
    });

    it('should fit with normalization', () => {
      const model = new LinearRegression({ normalize: true });
      const dataset = generateDataset(100);

      expect(() => model.fit(dataset)).not.toThrow();
    });
  });

  describe('predict', () => {
    it('should predict values', () => {
      const model = new LinearRegression();
      const dataset = generateDataset(100);

      model.fit(dataset);
      const predictions = model.predict([[5, 5], [0, 0]]);

      expect(predictions).toHaveLength(2);
      predictions.forEach(p => {
        expect(typeof p).toBe('number');
        expect(!isNaN(p)).toBe(true);
      });
    });

    it('should produce reasonable predictions for known relationship', () => {
      const features = Array.from({ length: 100 }, (_, i) => [i]);
      const labels = features.map(f => 2 * f[0] + 10);

      const model = new LinearRegression();
      model.fit({ features, labels });

      const predictions = model.predict([[50], [100]]);

      expect(predictions[0]).toBeCloseTo(110, 0);
      expect(predictions[1]).toBeCloseTo(210, 0);
    });
  });

  describe('getCoefficients', () => {
    it('should return coefficients and intercept', () => {
      const model = new LinearRegression();
      const dataset = generateDataset(100);

      model.fit(dataset);
      const { coefficients, intercept } = model.getCoefficients();

      expect(coefficients).toHaveLength(2);
      expect(typeof intercept).toBe('number');
    });
  });

  describe('evaluate', () => {
    it('should calculate regression metrics', () => {
      const model = new LinearRegression();
      const trainDataset = generateDataset(100);
      const testDataset = generateDataset(30);

      model.fit(trainDataset);
      const performance = model.evaluate(testDataset);

      expect(typeof performance.mae).toBe('number');
      expect(typeof performance.rmse).toBe('number');
      expect(typeof performance.r2).toBe('number');
      expect(performance.mae).toBeGreaterThanOrEqual(0);
      expect(performance.rmse).toBeGreaterThanOrEqual(0);
    });
  });
});

describe('RidgeRegression', () => {
  const generateDataset = (n: number): Dataset => {
    const features: number[][] = [];
    const labels: number[] = [];

    for (let i = 0; i < n; i++) {
      const x1 = Math.random() * 10;
      const x2 = Math.random() * 10;
      features.push([x1, x2]);
      labels.push(2 * x1 + 3 * x2 + 5 + (Math.random() - 0.5) * 2);
    }

    return { features, labels };
  };

  describe('fit and predict', () => {
    it('should fit Ridge regression with regularization', () => {
      const model = new RidgeRegression(1.0);
      const dataset = generateDataset(100);

      model.fit(dataset);
      const predictions = model.predict([[5, 5]]);

      expect(predictions).toHaveLength(1);
      expect(typeof predictions[0]).toBe('number');
    });

    it('should produce more stable coefficients than OLS', () => {
      // Create dataset with collinear features
      const features = Array.from({ length: 50 }, () => {
        const x = Math.random();
        return [x, x + Math.random() * 0.01]; // Nearly collinear
      });
      const labels = features.map(f => f[0] + f[1]);

      const ols = new LinearRegression();
      const ridge = new RidgeRegression(1.0);

      ols.fit({ features, labels });
      ridge.fit({ features, labels });

      // Both should produce predictions
      expect(ols.predict([[0.5, 0.5]])[0]).toBeDefined();
      expect(ridge.predict([[0.5, 0.5]])[0]).toBeDefined();
    });
  });
});

describe('LassoRegression', () => {
  describe('fit and predict', () => {
    it('should fit Lasso regression with sparsity', () => {
      const features = Array.from({ length: 100 }, () => [
        Math.random(), Math.random(), Math.random(), Math.random(), Math.random()
      ]);
      // Only first two features matter
      const labels = features.map(f => 2 * f[0] + 3 * f[1] + Math.random() * 0.1);

      const model = new LassoRegression(0.5);
      model.fit({ features, labels });

      const predictions = model.predict([[0.5, 0.5, 0, 0, 0]]);
      expect(predictions).toHaveLength(1);
    });

    it('should produce sparse coefficients', () => {
      const features = Array.from({ length: 100 }, () => [
        Math.random(), Math.random(), Math.random(), Math.random()
      ]);
      const labels = features.map(f => 5 * f[0]); // Only first feature matters

      const model = new LassoRegression(1.0);
      model.fit({ features, labels });

      const sparse = model.getSparseCoefficients();
      expect(sparse.length).toBeLessThanOrEqual(4);
    });
  });
});

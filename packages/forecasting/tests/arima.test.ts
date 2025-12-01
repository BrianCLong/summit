/**
 * Tests for ARIMA Forecaster
 */

import { ARIMAForecaster, AutoARIMA } from '../src/core/arima.js';
import type { TimeSeriesData } from '../src/types/index.js';

describe('ARIMAForecaster', () => {
  const generateTestData = (n: number): TimeSeriesData[] => {
    const data: TimeSeriesData[] = [];
    let value = 100;

    for (let i = 0; i < n; i++) {
      value = value + Math.sin(i / 10) * 5 + (Math.random() - 0.5) * 2;
      data.push({
        timestamp: new Date(2025, 0, i + 1),
        value,
      });
    }

    return data;
  };

  describe('fit', () => {
    it('should fit ARIMA(1,1,1) model without errors', () => {
      const forecaster = new ARIMAForecaster({ p: 1, d: 1, q: 1 });
      const data = generateTestData(100);

      expect(() => forecaster.fit(data)).not.toThrow();
    });

    it('should fit ARIMA(2,1,0) model without errors', () => {
      const forecaster = new ARIMAForecaster({ p: 2, d: 1, q: 0 });
      const data = generateTestData(100);

      expect(() => forecaster.fit(data)).not.toThrow();
    });

    it('should fit SARIMA model with seasonal components', () => {
      const forecaster = new ARIMAForecaster({
        p: 1, d: 1, q: 1,
        P: 1, D: 1, Q: 1, s: 12
      });
      const data = generateTestData(150);

      expect(() => forecaster.fit(data)).not.toThrow();
    });
  });

  describe('forecast', () => {
    it('should generate forecasts with confidence intervals', () => {
      const forecaster = new ARIMAForecaster({ p: 1, d: 1, q: 1 });
      const data = generateTestData(100);

      forecaster.fit(data);
      const forecasts = forecaster.forecast(10, 0.95);

      expect(forecasts).toHaveLength(10);
      forecasts.forEach(f => {
        expect(f.timestamp).toBeInstanceOf(Date);
        expect(typeof f.forecast).toBe('number');
        expect(typeof f.lowerBound).toBe('number');
        expect(typeof f.upperBound).toBe('number');
        expect(f.lowerBound).toBeLessThan(f.forecast);
        expect(f.upperBound).toBeGreaterThan(f.forecast);
        expect(f.confidence).toBe(0.95);
      });
    });

    it('should throw error if model not fitted', () => {
      const forecaster = new ARIMAForecaster({ p: 1, d: 1, q: 1 });

      expect(() => forecaster.forecast(10)).toThrow('Model must be fitted');
    });

    it('should generate monotonically increasing timestamps', () => {
      const forecaster = new ARIMAForecaster({ p: 1, d: 1, q: 1 });
      const data = generateTestData(100);

      forecaster.fit(data);
      const forecasts = forecaster.forecast(10);

      for (let i = 1; i < forecasts.length; i++) {
        expect(forecasts[i].timestamp.getTime()).toBeGreaterThan(
          forecasts[i - 1].timestamp.getTime()
        );
      }
    });
  });

  describe('evaluate', () => {
    it('should calculate performance metrics', () => {
      const forecaster = new ARIMAForecaster({ p: 1, d: 1, q: 1 });
      const trainData = generateTestData(80);
      const testData = generateTestData(20).map((d, i) => ({
        ...d,
        timestamp: new Date(2025, 2, i + 21),
      }));

      forecaster.fit(trainData);
      const performance = forecaster.evaluate(testData);

      expect(typeof performance.mae).toBe('number');
      expect(typeof performance.rmse).toBe('number');
      expect(typeof performance.mape).toBe('number');
      expect(typeof performance.r2).toBe('number');
      expect(performance.mae).toBeGreaterThanOrEqual(0);
      expect(performance.rmse).toBeGreaterThanOrEqual(0);
    });
  });
});

describe('AutoARIMA', () => {
  const generateTestData = (n: number): TimeSeriesData[] => {
    const data: TimeSeriesData[] = [];
    let value = 100;

    for (let i = 0; i < n; i++) {
      value = value + Math.sin(i / 10) * 5 + (Math.random() - 0.5) * 2;
      data.push({
        timestamp: new Date(2025, 0, i + 1),
        value,
      });
    }

    return data;
  };

  describe('selectBestModel', () => {
    it('should select optimal ARIMA parameters', () => {
      const autoArima = new AutoARIMA(3, 2, 3, false);
      const data = generateTestData(100);

      const result = autoArima.selectBestModel(data, 0.2);

      expect(result.params).toBeDefined();
      expect(typeof result.params.p).toBe('number');
      expect(typeof result.params.d).toBe('number');
      expect(typeof result.params.q).toBe('number');
      expect(result.params.p).toBeGreaterThanOrEqual(0);
      expect(result.params.d).toBeGreaterThanOrEqual(0);
      expect(result.params.q).toBeGreaterThanOrEqual(0);
      expect(result.performance).toBeDefined();
    });
  });
});

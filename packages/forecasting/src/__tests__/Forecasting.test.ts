/**
 * Forecasting Package Tests
 * Basic unit tests for forecasting algorithms
 */

import { ARIMA } from '../algorithms/ARIMA.js';
import { ExponentialSmoothing } from '../algorithms/ExponentialSmoothing.js';

describe('ARIMA', () => {
  // Generate sample time series data
  const generateSampleData = (n: number, trend: number = 0.1, noise: number = 0.5): number[] => {
    const data: number[] = [];
    for (let i = 0; i < n; i++) {
      data.push(100 + trend * i + (Math.random() - 0.5) * noise * 10);
    }
    return data;
  };

  it('should fit ARIMA model to data', async () => {
    const data = generateSampleData(100);
    const model = new ARIMA({ p: 1, d: 1, q: 1 });

    await model.fit(data);

    // Model should be fitted without errors
    expect(true).toBe(true);
  });

  it('should generate forecasts with confidence intervals', async () => {
    const data = generateSampleData(100);
    const model = new ARIMA({ p: 1, d: 1, q: 1 });

    await model.fit(data);
    const forecast = await model.forecast(10, 0.95);

    expect(forecast).toHaveLength(10);
    forecast.forEach(point => {
      expect(point.predicted_value).toBeDefined();
      expect(point.lower_bound).toBeDefined();
      expect(point.upper_bound).toBeDefined();
      expect(point.lower_bound).toBeLessThan(point.predicted_value);
      expect(point.upper_bound).toBeGreaterThan(point.predicted_value);
    });
  });

  it('should calculate forecast metrics', async () => {
    const data = generateSampleData(100);
    const model = new ARIMA({ p: 1, d: 1, q: 1 });

    await model.fit(data.slice(0, 80));
    const forecast = await model.forecast(20);
    const predicted = forecast.map(f => f.predicted_value);
    const actual = data.slice(80);

    const metrics = model.calculateMetrics(actual, predicted);

    expect(metrics.mae).toBeGreaterThanOrEqual(0);
    expect(metrics.rmse).toBeGreaterThanOrEqual(0);
    expect(metrics.mape).toBeGreaterThanOrEqual(0);
  });
});

describe('ExponentialSmoothing', () => {
  const generateSeasonalData = (n: number, period: number = 12): number[] => {
    const data: number[] = [];
    for (let i = 0; i < n; i++) {
      const trend = 0.5 * i;
      const seasonal = 20 * Math.sin(2 * Math.PI * i / period);
      const noise = (Math.random() - 0.5) * 5;
      data.push(100 + trend + seasonal + noise);
    }
    return data;
  };

  it('should fit Holt-Winters model to seasonal data', async () => {
    const data = generateSeasonalData(100, 12);
    const model = new ExponentialSmoothing({
      trend: 'add',
      seasonal: 'add',
      seasonal_periods: 12
    });

    await model.fit(data);

    // Model should be fitted without errors
    expect(true).toBe(true);
  });

  it('should generate forecasts', async () => {
    const data = generateSeasonalData(100, 12);
    const model = new ExponentialSmoothing({
      trend: 'add',
      seasonal: 'add',
      seasonal_periods: 12
    });

    await model.fit(data);
    const forecast = await model.forecast(24);

    expect(forecast).toHaveLength(24);
    forecast.forEach(point => {
      expect(point.predicted_value).toBeDefined();
      expect(typeof point.predicted_value).toBe('number');
      expect(isNaN(point.predicted_value)).toBe(false);
    });
  });

  it('should calculate metrics correctly', async () => {
    const actual = [100, 110, 120, 130, 140];
    const predicted = [102, 108, 122, 128, 142];

    const model = new ExponentialSmoothing({ trend: 'add' });
    const metrics = model.calculateMetrics(actual, predicted);

    expect(metrics.mae).toBeCloseTo(2.8, 1);
    expect(metrics.rmse).toBeGreaterThan(0);
    expect(metrics.mape).toBeGreaterThan(0);
  });
});

/**
 * Tests for Prophet-style Forecaster
 */

import { ProphetForecaster } from '../src/core/prophet.js';
import type { TimeSeriesData, ForecastConfig } from '../src/types/index.js';

describe('ProphetForecaster', () => {
  const generateSeasonalData = (n: number): TimeSeriesData[] => {
    const data: TimeSeriesData[] = [];

    for (let i = 0; i < n; i++) {
      const trend = 100 + i * 0.5;
      const seasonal = Math.sin(2 * Math.PI * i / 7) * 10; // Weekly seasonality
      const noise = (Math.random() - 0.5) * 5;

      data.push({
        timestamp: new Date(2025, 0, i + 1),
        value: trend + seasonal + noise,
      });
    }

    return data;
  };

  describe('fit', () => {
    it('should fit Prophet model with default config', () => {
      const config: ForecastConfig = {
        horizon: 30,
        confidenceLevel: 0.95,
      };

      const forecaster = new ProphetForecaster(config);
      const data = generateSeasonalData(100);

      expect(() => forecaster.fit(data)).not.toThrow();
    });

    it('should fit Prophet model with seasonality', () => {
      const config: ForecastConfig = {
        horizon: 30,
        confidenceLevel: 0.95,
        seasonality: {
          period: 7,
          fourierOrder: 3,
          mode: 'additive',
        },
      };

      const forecaster = new ProphetForecaster(config);
      const data = generateSeasonalData(100);

      expect(() => forecaster.fit(data)).not.toThrow();
    });

    it('should fit Prophet model with holidays', () => {
      const config: ForecastConfig = {
        horizon: 30,
        confidenceLevel: 0.95,
        holidays: [
          {
            name: 'new_year',
            dates: [new Date(2025, 0, 1)],
            lowerWindow: -1,
            upperWindow: 1,
          },
        ],
      };

      const forecaster = new ProphetForecaster(config);
      const data = generateSeasonalData(100);

      expect(() => forecaster.fit(data)).not.toThrow();
    });
  });

  describe('forecast', () => {
    it('should generate forecasts with confidence intervals', () => {
      const config: ForecastConfig = {
        horizon: 14,
        confidenceLevel: 0.95,
      };

      const forecaster = new ProphetForecaster(config);
      const data = generateSeasonalData(100);

      forecaster.fit(data);
      const forecasts = forecaster.forecast();

      expect(forecasts).toHaveLength(14);
      forecasts.forEach(f => {
        expect(f.timestamp).toBeInstanceOf(Date);
        expect(typeof f.forecast).toBe('number');
        expect(f.lowerBound).toBeLessThanOrEqual(f.forecast);
        expect(f.upperBound).toBeGreaterThanOrEqual(f.forecast);
      });
    });

    it('should allow custom horizon in forecast', () => {
      const config: ForecastConfig = {
        horizon: 14,
        confidenceLevel: 0.95,
      };

      const forecaster = new ProphetForecaster(config);
      const data = generateSeasonalData(100);

      forecaster.fit(data);
      const forecasts = forecaster.forecast(7);

      expect(forecasts).toHaveLength(7);
    });
  });

  describe('decompose', () => {
    it('should decompose time series into components', () => {
      const config: ForecastConfig = {
        horizon: 14,
        confidenceLevel: 0.95,
        seasonality: {
          period: 7,
          mode: 'additive',
        },
      };

      const forecaster = new ProphetForecaster(config);
      const data = generateSeasonalData(100);

      forecaster.fit(data);
      const decomposition = forecaster.decompose();

      expect(decomposition.trend).toHaveLength(data.length);
      expect(decomposition.seasonal).toHaveLength(data.length);
      expect(decomposition.residual).toHaveLength(data.length);
      expect(decomposition.timestamps).toHaveLength(data.length);
    });
  });
});

/**
 * Tests for Ensemble Forecasting
 */

import { EnsembleForecaster, OptimalEnsemble } from '../src/models/ensemble.js';
import { MonteCarloSimulator, ScenarioAnalyzer, Backtester } from '../src/utils/scenario-simulation.js';
import type { TimeSeriesData, ForecastResult } from '../src/types/index.js';

describe('EnsembleForecaster', () => {
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

  describe('fit and forecast', () => {
    it('should fit ensemble with multiple model types', () => {
      const ensemble = new EnsembleForecaster({
        models: [
          { type: 'arima', params: { p: 1, d: 1, q: 1 } },
          { type: 'exponential', params: { alpha: 0.3 } },
        ],
        method: 'average',
      });

      const data = generateTestData(100);

      expect(() => ensemble.fit(data)).not.toThrow();
    });

    it('should generate weighted ensemble forecasts', () => {
      const ensemble = new EnsembleForecaster({
        models: [
          { type: 'arima', params: { p: 1, d: 1, q: 1 } },
          { type: 'exponential', params: { alpha: 0.3 } },
        ],
        weights: [0.6, 0.4],
        method: 'weighted',
      });

      const data = generateTestData(100);
      ensemble.fit(data);

      const forecasts = ensemble.forecast(10);

      expect(forecasts).toHaveLength(10);
      forecasts.forEach(f => {
        expect(typeof f.forecast).toBe('number');
        expect(!isNaN(f.forecast)).toBe(true);
      });
    });
  });
});

describe('MonteCarloSimulator', () => {
  const createBaseForecast = (): ForecastResult[] => {
    return Array.from({ length: 10 }, (_, i) => ({
      timestamp: new Date(2025, 0, i + 1),
      forecast: 100 + i * 2,
      lowerBound: 95 + i * 2,
      upperBound: 105 + i * 2,
      confidence: 0.95,
    }));
  };

  describe('simulate', () => {
    it('should run Monte Carlo simulation', () => {
      const simulator = new MonteCarloSimulator(100);
      const baseForecast = createBaseForecast();

      const result = simulator.simulate(baseForecast, 0.1, 0.01);

      expect(result.scenarios).toBeDefined();
      expect(result.percentiles).toBeDefined();
      expect(result.mean).toHaveLength(baseForecast.length);
      expect(result.median).toHaveLength(baseForecast.length);
    });

    it('should calculate correct percentiles', () => {
      const simulator = new MonteCarloSimulator(1000);
      const baseForecast = createBaseForecast();

      const result = simulator.simulate(baseForecast, 0.1);

      expect(result.percentiles.get(5)).toBeDefined();
      expect(result.percentiles.get(50)).toBeDefined();
      expect(result.percentiles.get(95)).toBeDefined();
    });
  });
});

describe('ScenarioAnalyzer', () => {
  describe('compareScenarios', () => {
    it('should rank scenarios by impact', () => {
      const analyzer = new ScenarioAnalyzer();

      const scenarios = [
        { name: 'optimistic', assumptions: new Map([['growth', 1.2]]) },
        { name: 'pessimistic', assumptions: new Map([['growth', 0.8]]) },
        { name: 'baseline', assumptions: new Map([['growth', 1.0]]) },
      ];

      const results = analyzer.compareScenarios(scenarios);

      expect(results).toHaveLength(3);
      results.forEach(r => {
        expect(typeof r.impact).toBe('number');
        expect(typeof r.ranking).toBe('number');
      });
    });
  });

  describe('stressTest', () => {
    it('should apply stress factors to forecasts', () => {
      const analyzer = new ScenarioAnalyzer();

      const forecasts: ForecastResult[] = [
        { timestamp: new Date(), forecast: 100, lowerBound: 90, upperBound: 110, confidence: 0.95 },
      ];

      const stressFactors = new Map([['market_crash', 0.7]]);
      const stressed = analyzer.stressTest(forecasts, stressFactors);

      expect(stressed[0].forecast).toBe(70);
    });
  });
});

describe('Backtester', () => {
  const generateTestData = (n: number): TimeSeriesData[] => {
    return Array.from({ length: n }, (_, i) => ({
      timestamp: new Date(2025, 0, i + 1),
      value: 100 + i + (Math.random() - 0.5) * 10,
    }));
  };

  describe('backtest', () => {
    it('should run backtesting on forecasting model', () => {
      const backtester = new Backtester();
      const data = generateTestData(100);

      const forecastFn = (trainData: TimeSeriesData[], horizon: number): ForecastResult[] => {
        const lastValue = trainData[trainData.length - 1].value;
        return Array.from({ length: horizon }, (_, i) => ({
          timestamp: new Date(),
          forecast: lastValue,
          lowerBound: lastValue * 0.9,
          upperBound: lastValue * 1.1,
          confidence: 0.95,
        }));
      };

      const result = backtester.backtest(data, forecastFn, 5, 50);

      expect(typeof result.accuracy).toBe('number');
      expect(result.forecasts.length).toBeGreaterThan(0);
      expect(result.actuals.length).toBe(result.forecasts.length);
      expect(result.errors.length).toBe(result.forecasts.length);
    });
  });
});

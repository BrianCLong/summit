import { EventEmitter } from 'events';
import { PrometheusMetrics } from '../utils/metrics';
import logger from '../utils/logger';

interface ForecastPoint {
  timestamp: Date;
  value: number;
  confidenceLow: number;
  confidenceHigh: number;
  isForecast: boolean;
}

interface ForecastResult {
  signal: string;
  horizon: string;
  points: ForecastPoint[];
  metadata: {
    model: string;
    confidenceLevel: number;
    lastUpdated: Date;
  };
}

interface SimulationResult {
  scenarioId: string;
  originalForecast: ForecastPoint[];
  adjustedForecast: ForecastPoint[];
  impact: {
    delta: number;
    percentageChange: number;
  };
}

export class PredictiveThreatService extends EventEmitter {
  private metrics: PrometheusMetrics;

  // Mock historical data storage for Alpha
  private historicalData: Map<string, Array<{ timestamp: Date; value: number }>> = new Map();

  constructor() {
    super();
    this.metrics = new PrometheusMetrics('predictive_suite');
    this.initializeMetrics();
    this.seedMockData(); // Seed some data for Alpha demo
    this.startBackgroundUpdate(); // Update metrics periodically so dashboard has data
  }

  private initializeMetrics(): void {
    this.metrics.createGauge(
      'predictive_forecast_value',
      'Forecasted value for a signal at a specific horizon',
      ['signal', 'horizon']
    );
    this.metrics.createGauge(
      'predictive_model_confidence',
      'Confidence score of the predictive model',
      ['signal', 'model']
    );
  }

  private startBackgroundUpdate(): void {
    // Initial update
    this.updateMetrics();

    // Update every 1 minute
    setInterval(() => {
      this.updateMetrics();
    }, 60000);
  }

  private async updateMetrics(): Promise<void> {
    try {
      const signals = ['threat_events', 'anomaly_score'];
      const horizon = 24;

      for (const signal of signals) {
        // Just run forecast to update metrics as side effect
        await this.forecastSignal(signal, horizon);
      }
    } catch (error) {
      logger.error('Failed to update predictive metrics', error);
    }
  }

  private seedMockData(): void {
    // Seed 'threat_events' with some noisy linear trend
    const now = Date.now();
    const points = [];
    for (let i = 24 * 7; i >= 0; i--) { // Last 7 days
      const timestamp = new Date(now - i * 3600000);
      // Base value 100, increasing by 1 every hour, plus random noise
      const value = 100 + (24 * 7 - i) * 1 + (Math.random() * 20 - 10);
      points.push({ timestamp, value: Math.max(0, value) });
    }
    this.historicalData.set('threat_events', points);

    // Seed 'anomaly_score' with a sine wave
    const anomalyPoints = [];
    for (let i = 24 * 7; i >= 0; i--) {
        const timestamp = new Date(now - i * 3600000);
        const value = 50 + Math.sin(i / 12) * 30 + (Math.random() * 10 - 5);
        anomalyPoints.push({ timestamp, value: Math.max(0, value) });
    }
    this.historicalData.set('anomaly_score', anomalyPoints);
  }

  /**
   * Forecasts a signal over a given horizon
   * @param signal The name of the signal (e.g., 'threat_events')
   * @param horizonHours Number of hours to forecast
   */
  public async forecastSignal(signal: string, horizonHours: number = 24): Promise<ForecastResult> {
    const history = this.historicalData.get(signal) || [];
    if (history.length === 0) {
      throw new Error(`No historical data for signal: ${signal}`);
    }

    // Simple Linear Regression for Alpha
    // y = mx + b
    const n = history.length;
    let sumX = 0;
    let sumY = 0;
    let sumXY = 0;
    let sumXX = 0;

    // Use index as X to avoid large timestamp numbers issues
    const xValues = history.map((_, i) => i);
    const yValues = history.map(p => p.value);

    for (let i = 0; i < n; i++) {
      sumX += xValues[i];
      sumY += yValues[i];
      sumXY += xValues[i] * yValues[i];
      sumXX += xValues[i] * xValues[i];
    }

    const slope = (n * sumXY - sumX * sumY) / (n * sumXX - sumX * sumX);
    const intercept = (sumY - slope * sumX) / n;

    // Calculate standard error for confidence bands
    let sumSquaredResiduals = 0;
    for (let i = 0; i < n; i++) {
      const predicted = slope * xValues[i] + intercept;
      sumSquaredResiduals += Math.pow(yValues[i] - predicted, 2);
    }
    const stdError = Math.sqrt(sumSquaredResiduals / (n - 2));

    // Generate forecast points
    const forecastPoints: ForecastPoint[] = [];
    const lastTimestamp = history[history.length - 1].timestamp.getTime();

    // Add historical points first (for context in chart)
    // We limit to last 24 hours of history for the response to keep payload small
    const historySubset = history.slice(-24);
    historySubset.forEach(p => {
        forecastPoints.push({
            timestamp: p.timestamp,
            value: p.value,
            confidenceLow: p.value, // No uncertainty for history in this simple view
            confidenceHigh: p.value,
            isForecast: false
        });
    });

    // Future points
    for (let i = 1; i <= horizonHours; i++) {
      const futureX = n + i; // index
      const predictedValue = slope * futureX + intercept;
      const timestamp = new Date(lastTimestamp + i * 3600000);

      // Confidence interval expands as we go further (simplified)
      const confidenceMargin = stdError * 1.96 * (1 + i/10);

      forecastPoints.push({
        timestamp,
        value: Math.max(0, predictedValue),
        confidenceLow: Math.max(0, predictedValue - confidenceMargin),
        confidenceHigh: predictedValue + confidenceMargin,
        isForecast: true
      });
    }

    // Update metrics
    const lastForecast = forecastPoints[forecastPoints.length - 1];
    this.metrics.setGauge('predictive_forecast_value', lastForecast.value, {
      signal,
      horizon: `${horizonHours}h`
    });

    return {
      signal,
      horizon: `${horizonHours}h`,
      points: forecastPoints,
      metadata: {
        model: 'linear_regression_alpha',
        confidenceLevel: 0.95,
        lastUpdated: new Date()
      }
    };
  }

  /**
   * Simulates a counterfactual scenario (e.g. "What if we block traffic from Country X?")
   * For Alpha, this applies a simple multiplier or additive effect.
   */
  public async simulateCounterfactual(signal: string, scenario: { action: string, impactFactor: number }): Promise<SimulationResult> {
    const forecast = await this.forecastSignal(signal, 24);

    const adjustedPoints = forecast.points.map(p => {
      if (!p.isForecast) return p;

      // Apply impact (e.g., reduce threat events by 30%)
      const newValue = p.value * (1 + scenario.impactFactor);
      return {
        ...p,
        value: Math.max(0, newValue),
        confidenceLow: Math.max(0, p.confidenceLow * (1 + scenario.impactFactor)),
        confidenceHigh: p.confidenceHigh * (1 + scenario.impactFactor)
      };
    });

    const originalTotal = forecast.points.filter(p => p.isForecast).reduce((sum, p) => sum + p.value, 0);
    const newTotal = adjustedPoints.filter(p => p.isForecast).reduce((sum, p) => sum + p.value, 0);
    const delta = newTotal - originalTotal;
    const percentageChange = (delta / originalTotal) * 100;

    return {
      scenarioId: `${scenario.action}_${Date.now()}`,
      originalForecast: forecast.points,
      adjustedForecast: adjustedPoints,
      impact: {
        delta,
        percentageChange
      }
    };
  }
}

export const predictiveThreatService = new PredictiveThreatService();

// @ts-nocheck
import { TimeSeriesIntelligenceService } from './TimeSeriesIntelligenceService.js';
import logger from '../utils/logger.js';

interface ForecastResult {
  metric: string;
  horizon: number; // days
  predictions: { date: string; value: number }[];
  confidence: number;
}

interface StrategicWarning {
  level: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
  score: number; // 0-100
  indicators: string[];
  generatedAt: Date;
}

/**
 * PredictiveThreatAnalyticsService
 *
 * Implements the "Predictive Analytics Engine" for threat emergence and strategic warning.
 * Uses statistical methods (Linear Regression, Moving Average) to forecast trends
 * without heavy ML dependencies for this MVP.
 */
export class PredictiveThreatAnalyticsService {
  private tsService: TimeSeriesIntelligenceService;

  constructor() {
    this.tsService = new TimeSeriesIntelligenceService();
  }

  /**
   * Forecasts a metric for a given horizon (in days).
   */
  async forecast(metric: string, horizon: number = 30): Promise<ForecastResult> {
    const history = await this.tsService.getHistory(metric, 90); // Get last 90 points

    if (history.length < 5) {
      logger.warn(`Insufficient data for forecasting metric: ${metric}`);
      return {
        metric,
        horizon,
        predictions: [],
        confidence: 0
      };
    }

    // Prepare data for Linear Regression
    const x = history.map((_, i) => i);
    const y = history.map(p => p.value);

    const { slope, intercept } = this.linearRegression(x, y);

    const predictions = [];
    const lastDate = new Date();

    for (let i = 1; i <= horizon; i++) {
      const predictedValue = slope * (x.length + i) + intercept;
      const date = new Date(lastDate);
      date.setDate(date.getDate() + i);

      predictions.push({
        date: date.toISOString().split('T')[0],
        value: Math.max(0, predictedValue) // Clamp to 0
      });
    }

    return {
      metric,
      horizon,
      predictions,
      confidence: 0.85 // Heuristic confidence for simple linear model on short term
    };
  }

  /**
   * Assess Strategic Warning level based on aggregated indicators.
   * This corresponds to "Strategic warning indicators (early warning signals)".
   */
  async assessStrategicWarning(): Promise<StrategicWarning> {
    const indicators: string[] = [];
    let score = 0;

    // 1. Check for anomalies in key metrics
    const metricsToCheck = ['threat_mentions', 'cve_exploits', 'darkweb_chatter'];

    for (const metric of metricsToCheck) {
      const anomalies = await this.tsService.detectAnomalies(metric, 2.5); // 2.5 sigma
      if (anomalies.length > 0) {
        score += 20 * anomalies.length;
        indicators.push(`Anomaly detected in ${metric} (${anomalies.length} recent spikes)`);
      }
    }

    // 2. Check for "precursor" events (Mocked logic, would query Graph in real impl)
    // E.g., increased scanning activity often precedes attacks
    const scanningSpike = await this.tsService.detectAnomalies('network_scanning', 2.0);
    if (scanningSpike.length > 0) {
      score += 15;
      indicators.push('Increased network scanning activity detected');
    }

    // Normalize score
    score = Math.min(100, score);

    let level: StrategicWarning['level'] = 'LOW';
    if (score > 80) {level = 'CRITICAL';}
    else if (score > 50) {level = 'HIGH';}
    else if (score > 20) {level = 'MEDIUM';}

    return {
      level,
      score,
      indicators,
      generatedAt: new Date()
    };
  }

  /**
   * Simple Linear Regression (Least Squares)
   */
  private linearRegression(x: number[], y: number[]) {
    const n = x.length;
    let sumX = 0, sumY = 0, sumXY = 0, sumXX = 0;

    for (let i = 0; i < n; i++) {
      sumX += x[i];
      sumY += y[i];
      sumXY += x[i] * y[i];
      sumXX += x[i] * x[i];
    }

    const slope = (n * sumXY - sumX * sumY) / (n * sumXX - sumX * sumX);
    const intercept = (sumY - slope * sumX) / n;

    return { slope, intercept };
  }
}

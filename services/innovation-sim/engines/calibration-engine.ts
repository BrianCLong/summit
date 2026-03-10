/**
 * Calibration and CI Governance Engine
 *
 * Backtesting, confidence calibration, and release gates.
 */

import type { SimulationResult } from "./simulation-core.js";
import type { StrategyRecommendation } from "./strategy-engine.js";

export interface CalibrationResult {
  metric: string;
  predicted: number;
  actual: number;
  error: number;
  percentError: number;
}

export interface BacktestResult {
  testPeriod: {
    start: string;
    end: string;
  };
  predictions: CalibrationResult[];
  overallAccuracy: number;
  calibrationScore: number;
  confidenceIntervals: {
    p50: { lower: number; upper: number };
    p90: { lower: number; upper: number };
    p95: { lower: number; upper: number };
  };
}

export interface ReleaseGate {
  id: string;
  name: string;
  condition: string;
  threshold: number;
  currentValue: number;
  passed: boolean;
  severity: "blocking" | "warning" | "info";
}

export interface GovernanceReport {
  version: string;
  releaseGates: ReleaseGate[];
  backtestResults: BacktestResult[];
  confidenceCalibration: {
    expectedAccuracy: number;
    actualAccuracy: number;
    calibrationGap: number;
  };
  approved: boolean;
  approvedAt?: string;
  notes: string[];
}

export class CalibrationEngine {
  /**
   * Run backtest on historical data
   */
  backtest(
    historicalData: any[],
    predictions: SimulationResult[]
  ): BacktestResult {
    const calibrationResults: CalibrationResult[] = [];

    // Simplified: compare predicted vs actual adoption rates
    for (let i = 0; i < Math.min(historicalData.length, predictions.length); i++) {
      const actual = historicalData[i];
      const predicted = predictions[i];

      const error = predicted.finalMetrics.avgAdoption - actual.avgAdoption;
      const percentError = Math.abs(error / actual.avgAdoption) * 100;

      calibrationResults.push({
        metric: "avgAdoption",
        predicted: predicted.finalMetrics.avgAdoption,
        actual: actual.avgAdoption,
        error,
        percentError
      });
    }

    const overallAccuracy = this.calculateAccuracy(calibrationResults);
    const calibrationScore = this.calculateCalibrationScore(calibrationResults);

    return {
      testPeriod: {
        start: historicalData[0]?.timestamp || new Date().toISOString(),
        end: historicalData[historicalData.length - 1]?.timestamp || new Date().toISOString()
      },
      predictions: calibrationResults,
      overallAccuracy,
      calibrationScore,
      confidenceIntervals: this.calculateConfidenceIntervals(calibrationResults)
    };
  }

  /**
   * Calibrate confidence scores
   */
  calibrateConfidence(
    recommendations: StrategyRecommendation[],
    backtestResults: BacktestResult[]
  ): StrategyRecommendation[] {
    const calibrationFactor = backtestResults.length > 0
      ? backtestResults[0].calibrationScore
      : 1.0;

    return recommendations.map(rec => ({
      ...rec,
      confidence: Math.max(0, Math.min(1, rec.confidence * calibrationFactor))
    }));
  }

  /**
   * Evaluate release gates
   */
  evaluateReleaseGates(
    backtestResults: BacktestResult[],
    recommendations: StrategyRecommendation[]
  ): ReleaseGate[] {
    const gates: ReleaseGate[] = [];

    // Gate 1: Overall accuracy
    const avgAccuracy = backtestResults.reduce((sum, r) => sum + r.overallAccuracy, 0) / Math.max(1, backtestResults.length);

    gates.push({
      id: "gate-accuracy",
      name: "Prediction Accuracy",
      condition: "Average accuracy >= 70%",
      threshold: 0.70,
      currentValue: avgAccuracy,
      passed: avgAccuracy >= 0.70,
      severity: "blocking"
    });

    // Gate 2: Calibration score
    const avgCalibration = backtestResults.reduce((sum, r) => sum + r.calibrationScore, 0) / Math.max(1, backtestResults.length);

    gates.push({
      id: "gate-calibration",
      name: "Confidence Calibration",
      condition: "Calibration score >= 0.80",
      threshold: 0.80,
      currentValue: avgCalibration,
      passed: avgCalibration >= 0.80,
      severity: "warning"
    });

    // Gate 3: Minimum recommendations
    gates.push({
      id: "gate-recommendations",
      name: "Recommendation Coverage",
      condition: "At least 5 recommendations",
      threshold: 5,
      currentValue: recommendations.length,
      passed: recommendations.length >= 5,
      severity: "warning"
    });

    // Gate 4: High confidence recommendations
    const highConfRecs = recommendations.filter(r => r.confidence > 0.7).length;

    gates.push({
      id: "gate-confidence",
      name: "High Confidence Recommendations",
      condition: "At least 3 recommendations with >70% confidence",
      threshold: 3,
      currentValue: highConfRecs,
      passed: highConfRecs >= 3,
      severity: "info"
    });

    return gates;
  }

  /**
   * Generate governance report
   */
  generateGovernanceReport(
    version: string,
    backtestResults: BacktestResult[],
    recommendations: StrategyRecommendation[]
  ): GovernanceReport {
    const releaseGates = this.evaluateReleaseGates(backtestResults, recommendations);

    const blockingGatesPassed = releaseGates
      .filter(g => g.severity === "blocking")
      .every(g => g.passed);

    const expectedAccuracy = recommendations.reduce((sum, r) => sum + r.confidence, 0) / Math.max(1, recommendations.length);

    const actualAccuracy = backtestResults.length > 0
      ? backtestResults[0].overallAccuracy
      : 0;

    const calibrationGap = Math.abs(expectedAccuracy - actualAccuracy);

    const notes: string[] = [];

    if (!blockingGatesPassed) {
      notes.push("BLOCKED: One or more blocking gates failed");
    }

    if (calibrationGap > 0.15) {
      notes.push("WARNING: Large calibration gap detected - confidence scores may be inaccurate");
    }

    return {
      version,
      releaseGates,
      backtestResults,
      confidenceCalibration: {
        expectedAccuracy,
        actualAccuracy,
        calibrationGap
      },
      approved: blockingGatesPassed,
      approvedAt: blockingGatesPassed ? new Date().toISOString() : undefined,
      notes
    };
  }

  /**
   * Calculate overall accuracy
   */
  private calculateAccuracy(results: CalibrationResult[]): number {
    if (results.length === 0) return 0;

    const avgPercentError = results.reduce((sum, r) => sum + r.percentError, 0) / results.length;

    return Math.max(0, 1 - avgPercentError / 100);
  }

  /**
   * Calculate calibration score
   */
  private calculateCalibrationScore(results: CalibrationResult[]): number {
    // Simplified: measure how well predictions match actuals
    if (results.length === 0) return 1.0;

    const mse = results.reduce((sum, r) => sum + r.error * r.error, 0) / results.length;
    const rmse = Math.sqrt(mse);

    return Math.max(0, 1 - rmse);
  }

  /**
   * Calculate confidence intervals
   */
  private calculateConfidenceIntervals(results: CalibrationResult[]): any {
    if (results.length === 0) {
      return {
        p50: { lower: 0, upper: 1 },
        p90: { lower: 0, upper: 1 },
        p95: { lower: 0, upper: 1 }
      };
    }

    const errors = results.map(r => Math.abs(r.error)).sort((a, b) => a - b);

    const p50_index = Math.floor(errors.length * 0.50);
    const p90_index = Math.floor(errors.length * 0.90);
    const p95_index = Math.floor(errors.length * 0.95);

    const p50_error = errors[p50_index] || 0;
    const p90_error = errors[p90_index] || 0;
    const p95_error = errors[p95_index] || 0;

    return {
      p50: { lower: -p50_error, upper: p50_error },
      p90: { lower: -p90_error, upper: p90_error },
      p95: { lower: -p95_error, upper: p95_error }
    };
  }
}

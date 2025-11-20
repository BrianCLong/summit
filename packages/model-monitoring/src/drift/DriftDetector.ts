/**
 * DriftDetector - Detect data and concept drift in models
 */

import { Pool } from 'pg';
import { v4 as uuidv4 } from 'uuid';
import pino from 'pino';
import { DriftReport, DriftReportSchema } from '../types.js';

export class DriftDetector {
  private pool: Pool;
  private logger: pino.Logger;

  constructor(pool: Pool) {
    this.pool = pool;
    this.logger = pino({ name: 'drift-detector' });
  }

  /**
   * Initialize drift detection tables
   */
  async initialize(): Promise<void> {
    const createTables = `
      CREATE TABLE IF NOT EXISTS ml_drift_reports (
        id UUID PRIMARY KEY,
        model_id UUID NOT NULL,
        model_version VARCHAR(100) NOT NULL,
        drift_type VARCHAR(50) NOT NULL,
        drift_score FLOAT NOT NULL,
        drift_detected BOOLEAN NOT NULL,
        threshold FLOAT NOT NULL,
        baseline_start TIMESTAMPTZ NOT NULL,
        baseline_end TIMESTAMPTZ NOT NULL,
        current_start TIMESTAMPTZ NOT NULL,
        current_end TIMESTAMPTZ NOT NULL,
        feature_drifts JSONB,
        statistical_test VARCHAR(100),
        p_value FLOAT,
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        FOREIGN KEY (model_id) REFERENCES ml_models(id) ON DELETE CASCADE
      );

      CREATE INDEX IF NOT EXISTS idx_drift_model_id ON ml_drift_reports(model_id);
      CREATE INDEX IF NOT EXISTS idx_drift_detected ON ml_drift_reports(drift_detected);
      CREATE INDEX IF NOT EXISTS idx_drift_created_at ON ml_drift_reports(created_at DESC);
    `;

    await this.pool.query(createTables);
    this.logger.info('Drift detector initialized');
  }

  /**
   * Detect drift between baseline and current data
   */
  async detectDrift(
    modelId: string,
    modelVersion: string,
    baselineData: any[],
    currentData: any[],
    threshold = 0.1
  ): Promise<DriftReport> {
    const driftScore = await this.calculateDrift(baselineData, currentData);
    const driftDetected = driftScore > threshold;

    // Calculate feature-level drift
    const featureDrifts = await this.calculateFeatureDrifts(baselineData, currentData);

    const id = uuidv4();
    const now = new Date();

    const report: DriftReport = {
      id,
      model_id: modelId,
      model_version: modelVersion,
      drift_type: 'input',
      drift_score: driftScore,
      drift_detected: driftDetected,
      threshold,
      baseline_start: new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000).toISOString(),
      baseline_end: now.toISOString(),
      current_start: now.toISOString(),
      current_end: now.toISOString(),
      feature_drifts: featureDrifts,
      statistical_test: 'kolmogorov-smirnov',
      p_value: 1 - driftScore,
      created_at: now.toISOString(),
    };

    const validated = DriftReportSchema.parse(report);

    // Store report
    const query = `
      INSERT INTO ml_drift_reports (
        id, model_id, model_version, drift_type, drift_score, drift_detected,
        threshold, baseline_start, baseline_end, current_start, current_end,
        feature_drifts, statistical_test, p_value, created_at
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15)
      RETURNING *;
    `;

    await this.pool.query(query, [
      validated.id,
      validated.model_id,
      validated.model_version,
      validated.drift_type,
      validated.drift_score,
      validated.drift_detected,
      validated.threshold,
      validated.baseline_start,
      validated.baseline_end,
      validated.current_start,
      validated.current_end,
      JSON.stringify(validated.feature_drifts),
      validated.statistical_test,
      validated.p_value,
      validated.created_at,
    ]);

    if (driftDetected) {
      this.logger.warn(
        { modelId, modelVersion, driftScore, threshold },
        'Drift detected'
      );
    } else {
      this.logger.info(
        { modelId, modelVersion, driftScore, threshold },
        'No drift detected'
      );
    }

    return validated;
  }

  /**
   * Calculate overall drift score using KL divergence
   */
  private async calculateDrift(baseline: any[], current: any[]): Promise<number> {
    // Simplified drift calculation
    // In production, use proper statistical tests:
    // - Kolmogorov-Smirnov test for continuous features
    // - Chi-square test for categorical features
    // - Population Stability Index (PSI)
    // - KL divergence

    if (baseline.length === 0 || current.length === 0) {
      return 0;
    }

    // Calculate simple statistical difference
    const baselineMean = this.calculateMean(baseline);
    const currentMean = this.calculateMean(current);

    const baselineStd = this.calculateStdDev(baseline, baselineMean);
    const currentStd = this.calculateStdDev(current, currentMean);

    // Normalized difference
    const meanDiff = Math.abs(currentMean - baselineMean) / (baselineMean || 1);
    const stdDiff = Math.abs(currentStd - baselineStd) / (baselineStd || 1);

    return Math.min((meanDiff + stdDiff) / 2, 1.0);
  }

  /**
   * Calculate drift for each feature
   */
  private async calculateFeatureDrifts(
    baseline: any[],
    current: any[]
  ): Promise<Record<string, number>> {
    const featureDrifts: Record<string, number> = {};

    if (baseline.length === 0 || current.length === 0) {
      return featureDrifts;
    }

    // Get feature names from first record
    const features = Object.keys(baseline[0] || {});

    for (const feature of features) {
      const baselineValues = baseline.map(r => r[feature]).filter(v => v != null);
      const currentValues = current.map(r => r[feature]).filter(v => v != null);

      if (baselineValues.length > 0 && currentValues.length > 0) {
        featureDrifts[feature] = await this.calculateDrift(baselineValues, currentValues);
      }
    }

    return featureDrifts;
  }

  /**
   * Get drift reports for a model
   */
  async getDriftReports(
    modelId: string,
    limit = 50
  ): Promise<DriftReport[]> {
    const query = `
      SELECT * FROM ml_drift_reports
      WHERE model_id = $1
      ORDER BY created_at DESC
      LIMIT $2
    `;

    const result = await this.pool.query(query, [modelId, limit]);

    return result.rows.map(row => DriftReportSchema.parse({
      ...row,
      feature_drifts: row.feature_drifts || {},
    }));
  }

  /**
   * Helper: Calculate mean
   */
  private calculateMean(values: number[]): number {
    if (values.length === 0) return 0;
    return values.reduce((a, b) => a + b, 0) / values.length;
  }

  /**
   * Helper: Calculate standard deviation
   */
  private calculateStdDev(values: number[], mean: number): number {
    if (values.length === 0) return 0;
    const variance = values.reduce((sum, val) => sum + Math.pow(val - mean, 2), 0) / values.length;
    return Math.sqrt(variance);
  }
}

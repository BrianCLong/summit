/**
 * Summit Data Quality Management Platform
 *
 * Enterprise data quality management with automated validation, profiling, and quality metrics
 */

export * from './types.js';
export { DataProfiler } from './profiling/profiler.js';
export { DataValidator } from './validation/validator.js';
export { QualityScorer } from './metrics/quality-scorer.js';
export { AnomalyDetector } from './anomaly/anomaly-detector.js';
export { DataRemediator } from './remediation/remediator.js';
export { DataSteward } from './stewardship/data-steward.js';
export * from './stewardship/data-steward.js';
export { StreamQualityMonitor } from './streaming/stream-quality-monitor.js';
export * from './streaming/stream-quality-monitor.js';

// Main orchestrator class
import { Pool } from 'pg';
import { DataProfiler } from './profiling/profiler.js';
import { DataValidator } from './validation/validator.js';
import { QualityScorer } from './metrics/quality-scorer.js';
import { AnomalyDetector } from './anomaly/anomaly-detector.js';
import { DataRemediator } from './remediation/remediator.js';
import {
  QualityRule,
  DataProfile,
  ValidationResult,
  QualityScore,
  DataAnomaly,
  RemediationPlan,
  ProfilingConfig,
  ValidationConfig,
} from './types.js';

export class DataQualityEngine {
  private profiler: DataProfiler;
  private validator: DataValidator;
  private scorer: QualityScorer;
  private anomalyDetector: AnomalyDetector;
  private remediator: DataRemediator;

  constructor(private pool: Pool) {
    this.profiler = new DataProfiler(pool);
    this.validator = new DataValidator(pool);
    this.scorer = new QualityScorer(pool);
    this.anomalyDetector = new AnomalyDetector(pool);
    this.remediator = new DataRemediator(pool);
  }

  /**
   * Run comprehensive quality assessment
   */
  async assessDataQuality(
    tableName: string,
    rules: QualityRule[],
    config: ProfilingConfig & ValidationConfig = {}
  ): Promise<{
    profiles: DataProfile[];
    validationResults: ValidationResult[];
    qualityScore: QualityScore;
    anomalies: DataAnomaly[];
  }> {
    // Register rules
    rules.forEach(rule => this.validator.registerRule(rule));

    // Profile dataset
    const profiles = await this.profiler.profileDataset(tableName, config);

    // Validate data
    const validationResults = await this.validator.validate(tableName, config);

    // Calculate quality score
    const qualityScore = await this.scorer.calculateScore(tableName, profiles, validationResults);

    // Save score
    await this.scorer.saveScore(qualityScore);

    // Detect anomalies
    const anomalies: DataAnomaly[] = [];
    for (const profile of profiles) {
      const profileAnomalies = await this.anomalyDetector.detectAnomalies(
        tableName,
        profile,
        []
      );
      anomalies.push(...profileAnomalies);
    }

    return {
      profiles,
      validationResults,
      qualityScore,
      anomalies,
    };
  }

  /**
   * Create and execute remediation plan
   */
  async remediateQualityIssues(
    validationResult: ValidationResult,
    strategy: 'cleanse' | 'standardize' | 'deduplicate' | 'impute' | 'quarantine'
  ): Promise<RemediationPlan> {
    const plan = this.remediator.createRemediationPlan(validationResult, strategy);
    await this.remediator.executeRemediationPlan(plan);
    return plan;
  }

  /**
   * Get quality dashboard data
   */
  async getQualityDashboard(datasetId: string): Promise<{
    score: QualityScore;
    profiles: DataProfile[];
    recentAnomalies: DataAnomaly[];
  }> {
    const profiles = await this.profiler.profileDataset(datasetId);
    const validationResults = await this.validator.validate(datasetId);
    const score = await this.scorer.calculateScore(datasetId, profiles, validationResults);

    const recentAnomalies: DataAnomaly[] = [];
    for (const profile of profiles) {
      const anomalies = await this.anomalyDetector.detectAnomalies(datasetId, profile, []);
      recentAnomalies.push(...anomalies);
    }

    return {
      score,
      profiles,
      recentAnomalies: recentAnomalies.slice(0, 10),
    };
  }

  // Expose individual components
  getProfiler(): DataProfiler {
    return this.profiler;
  }

  getValidator(): DataValidator {
    return this.validator;
  }

  getScorer(): QualityScorer {
    return this.scorer;
  }

  getAnomalyDetector(): AnomalyDetector {
    return this.anomalyDetector;
  }

  getRemediator(): DataRemediator {
    return this.remediator;
  }
}

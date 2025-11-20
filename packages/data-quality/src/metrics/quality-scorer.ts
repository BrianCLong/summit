/**
 * Data quality scoring and metrics calculation
 */

import { Pool } from 'pg';
import {
  QualityScore,
  QualityDimensions,
  TrendAnalysis,
  Recommendation,
  HistoricalScore,
  DataProfile,
  ValidationResult,
} from '../types.js';

export class QualityScorer {
  constructor(private pool: Pool) {}

  /**
   * Calculate overall quality score for a dataset
   */
  async calculateScore(
    datasetId: string,
    profiles: DataProfile[],
    validationResults: ValidationResult[]
  ): Promise<QualityScore> {
    const dimensions = this.calculateDimensions(profiles, validationResults);
    const overallScore = this.calculateOverallScore(dimensions);
    const trendAnalysis = await this.analyzeTrends(datasetId);
    const recommendations = this.generateRecommendations(dimensions, validationResults);

    return {
      datasetId,
      overallScore,
      dimensions,
      trendAnalysis,
      recommendations,
      timestamp: new Date(),
    };
  }

  /**
   * Calculate quality dimensions
   */
  private calculateDimensions(
    profiles: DataProfile[],
    validationResults: ValidationResult[]
  ): QualityDimensions {
    const completeness = this.calculateCompletenessScore(profiles);
    const uniqueness = this.calculateUniquenessScore(profiles);
    const validity = this.calculateValidityScore(profiles, validationResults);
    const consistency = this.calculateConsistencyScore(validationResults);
    const accuracy = this.calculateAccuracyScore(validationResults);
    const timeliness = this.calculateTimelinessScore();

    return {
      completeness,
      uniqueness,
      validity,
      consistency,
      accuracy,
      timeliness,
    };
  }

  private calculateCompletenessScore(profiles: DataProfile[]): number {
    if (profiles.length === 0) return 100;

    const totalCompleteness = profiles.reduce((sum, profile) => sum + profile.completeness, 0);
    return totalCompleteness / profiles.length;
  }

  private calculateUniquenessScore(profiles: DataProfile[]): number {
    if (profiles.length === 0) return 100;

    const totalUniqueness = profiles.reduce((sum, profile) => sum + profile.uniqueness, 0);
    return totalUniqueness / profiles.length;
  }

  private calculateValidityScore(
    profiles: DataProfile[],
    validationResults: ValidationResult[]
  ): number {
    if (validationResults.length === 0) return 100;

    const passedRules = validationResults.filter(r => r.passed).length;
    return (passedRules / validationResults.length) * 100;
  }

  private calculateConsistencyScore(validationResults: ValidationResult[]): number {
    const consistencyRules = validationResults.filter(r => r.ruleName.includes('consistency'));
    if (consistencyRules.length === 0) return 100;

    const passedRules = consistencyRules.filter(r => r.passed).length;
    return (passedRules / consistencyRules.length) * 100;
  }

  private calculateAccuracyScore(validationResults: ValidationResult[]): number {
    const accuracyRules = validationResults.filter(r => r.ruleName.includes('accuracy'));
    if (accuracyRules.length === 0) return 100;

    const passedRules = accuracyRules.filter(r => r.passed).length;
    return (passedRules / accuracyRules.length) * 100;
  }

  private calculateTimelinessScore(): number {
    // Default timeliness score - would be enhanced with actual freshness checks
    return 95;
  }

  private calculateOverallScore(dimensions: QualityDimensions): number {
    const weights = {
      completeness: 0.2,
      uniqueness: 0.15,
      validity: 0.25,
      consistency: 0.2,
      accuracy: 0.15,
      timeliness: 0.05,
    };

    return (
      dimensions.completeness * weights.completeness +
      dimensions.uniqueness * weights.uniqueness +
      dimensions.validity * weights.validity +
      dimensions.consistency * weights.consistency +
      dimensions.accuracy * weights.accuracy +
      dimensions.timeliness * weights.timeliness
    );
  }

  private async analyzeTrends(datasetId: string): Promise<TrendAnalysis> {
    const client = await this.pool.connect();
    try {
      // Get historical scores from the last 30 days
      const query = `
        SELECT score, timestamp
        FROM data_quality_scores
        WHERE dataset_id = $1
          AND timestamp >= NOW() - INTERVAL '30 days'
        ORDER BY timestamp DESC
        LIMIT 30
      `;

      const result = await client.query(query, [datasetId]);
      const historicalScores: HistoricalScore[] = result.rows.map((row: any) => ({
        timestamp: new Date(row.timestamp),
        score: parseFloat(row.score),
      }));

      if (historicalScores.length < 2) {
        return {
          direction: 'stable',
          changeRate: 0,
          historicalScores,
        };
      }

      // Calculate trend
      const recentScore = historicalScores[0].score;
      const oldestScore = historicalScores[historicalScores.length - 1].score;
      const changeRate = ((recentScore - oldestScore) / oldestScore) * 100;

      let direction: 'improving' | 'stable' | 'declining';
      if (changeRate > 2) {
        direction = 'improving';
      } else if (changeRate < -2) {
        direction = 'declining';
      } else {
        direction = 'stable';
      }

      return {
        direction,
        changeRate,
        historicalScores,
      };
    } catch (error) {
      // Table might not exist yet
      return {
        direction: 'stable',
        changeRate: 0,
        historicalScores: [],
      };
    } finally {
      client.release();
    }
  }

  private generateRecommendations(
    dimensions: QualityDimensions,
    validationResults: ValidationResult[]
  ): Recommendation[] {
    const recommendations: Recommendation[] = [];

    if (dimensions.completeness < 90) {
      recommendations.push({
        priority: 'high',
        category: 'completeness',
        issue: 'Low data completeness detected',
        suggestion: 'Review data ingestion pipelines and add missing value handling',
        estimatedImpact: 90 - dimensions.completeness,
      });
    }

    if (dimensions.uniqueness < 80) {
      recommendations.push({
        priority: 'high',
        category: 'uniqueness',
        issue: 'High number of duplicate records',
        suggestion: 'Implement deduplication process and add unique constraints',
        estimatedImpact: 80 - dimensions.uniqueness,
      });
    }

    if (dimensions.validity < 85) {
      recommendations.push({
        priority: 'high',
        category: 'validity',
        issue: 'Validation rules failing',
        suggestion: 'Review and strengthen data validation at source',
        estimatedImpact: 85 - dimensions.validity,
      });
    }

    if (dimensions.consistency < 90) {
      recommendations.push({
        priority: 'medium',
        category: 'consistency',
        issue: 'Data consistency issues detected',
        suggestion: 'Implement cross-field validation and referential integrity checks',
        estimatedImpact: 90 - dimensions.consistency,
      });
    }

    // Add recommendations based on validation failures
    const criticalFailures = validationResults.filter(r => !r.passed && r.severity === 'critical');
    if (criticalFailures.length > 0) {
      recommendations.push({
        priority: 'high',
        category: 'critical-failures',
        issue: `${criticalFailures.length} critical validation rules failing`,
        suggestion: 'Address critical data quality issues immediately',
        estimatedImpact: 15,
      });
    }

    return recommendations.sort((a, b) => {
      const priorityOrder = { high: 0, medium: 1, low: 2 };
      return priorityOrder[a.priority] - priorityOrder[b.priority];
    });
  }

  /**
   * Save quality score to database
   */
  async saveScore(score: QualityScore): Promise<void> {
    const client = await this.pool.connect();
    try {
      await client.query(`
        CREATE TABLE IF NOT EXISTS data_quality_scores (
          id SERIAL PRIMARY KEY,
          dataset_id VARCHAR(255) NOT NULL,
          score DECIMAL(5, 2) NOT NULL,
          completeness DECIMAL(5, 2),
          uniqueness DECIMAL(5, 2),
          validity DECIMAL(5, 2),
          consistency DECIMAL(5, 2),
          accuracy DECIMAL(5, 2),
          timeliness DECIMAL(5, 2),
          timestamp TIMESTAMP NOT NULL DEFAULT NOW(),
          INDEX idx_dataset_timestamp (dataset_id, timestamp)
        )
      `);

      await client.query(
        `
        INSERT INTO data_quality_scores
          (dataset_id, score, completeness, uniqueness, validity, consistency, accuracy, timeliness, timestamp)
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
      `,
        [
          score.datasetId,
          score.overallScore,
          score.dimensions.completeness,
          score.dimensions.uniqueness,
          score.dimensions.validity,
          score.dimensions.consistency,
          score.dimensions.accuracy,
          score.dimensions.timeliness,
          score.timestamp,
        ]
      );
    } finally {
      client.release();
    }
  }
}

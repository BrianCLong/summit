import {
  ConfidenceReport,
  ConfidenceFactor,
  DataProfile,
  FusionResult,
  DiscoveredSource,
} from '../types.js';

interface ScoringWeights {
  sourceReliability: number;
  dataQuality: number;
  fusionConsistency: number;
  recency: number;
  coverage: number;
}

const DEFAULT_WEIGHTS: ScoringWeights = {
  sourceReliability: 0.25,
  dataQuality: 0.25,
  fusionConsistency: 0.20,
  recency: 0.15,
  coverage: 0.15,
};

/**
 * Confidence Scorer
 * Calculates and reports confidence scores for data fusion results
 */
export class ConfidenceScorer {
  private weights: ScoringWeights;
  private sourceReliabilityCache: Map<string, number> = new Map();

  constructor(weights: Partial<ScoringWeights> = {}) {
    this.weights = { ...DEFAULT_WEIGHTS, ...weights };
  }

  /**
   * Generate comprehensive confidence report
   */
  generateReport(
    fusionResult: FusionResult,
    profiles: Map<string, DataProfile>,
    sources: Map<string, DiscoveredSource>
  ): ConfidenceReport {
    const factors: ConfidenceFactor[] = [];

    // 1. Source reliability factor
    const sourceReliability = this.calculateSourceReliability(fusionResult, sources);
    factors.push({
      factor: 'source_reliability',
      weight: this.weights.sourceReliability,
      score: sourceReliability,
      explanation: this.explainSourceReliability(fusionResult, sources),
    });

    // 2. Data quality factor
    const dataQuality = this.calculateDataQuality(fusionResult, profiles);
    factors.push({
      factor: 'data_quality',
      weight: this.weights.dataQuality,
      score: dataQuality,
      explanation: this.explainDataQuality(profiles),
    });

    // 3. Fusion consistency factor
    const fusionConsistency = this.calculateFusionConsistency(fusionResult);
    factors.push({
      factor: 'fusion_consistency',
      weight: this.weights.fusionConsistency,
      score: fusionConsistency,
      explanation: this.explainFusionConsistency(fusionResult),
    });

    // 4. Recency factor
    const recency = this.calculateRecency(fusionResult);
    factors.push({
      factor: 'recency',
      weight: this.weights.recency,
      score: recency,
      explanation: 'Data freshness based on source timestamps',
    });

    // 5. Coverage factor
    const coverage = this.calculateCoverage(fusionResult);
    factors.push({
      factor: 'coverage',
      weight: this.weights.coverage,
      score: coverage,
      explanation: `${Object.keys(fusionResult.fusedRecord).length} fields populated`,
    });

    // Calculate overall score
    const overallScore = factors.reduce(
      (sum, f) => sum + f.score * f.weight,
      0
    );

    // Generate recommendations
    const recommendations = this.generateRecommendations(factors, fusionResult);

    // Build verifiable references
    const verifiableReferences = fusionResult.sourceRecords.map(sr => {
      const source = sources.get(sr.sourceId);
      return {
        sourceId: sr.sourceId,
        sourceType: source?.type || 'unknown',
        uri: source?.connectionUri || '',
        timestamp: fusionResult.lineage.createdAt,
      };
    });

    return {
      overallScore,
      factors,
      recommendations,
      verifiableReferences,
    };
  }

  /**
   * Quick confidence score without full report
   */
  quickScore(fusionResult: FusionResult): number {
    return fusionResult.confidenceScore;
  }

  /**
   * Calculate source reliability score
   */
  private calculateSourceReliability(
    fusionResult: FusionResult,
    sources: Map<string, DiscoveredSource>
  ): number {
    const sourceIds = fusionResult.lineage.sources;
    if (sourceIds.length === 0) return 0.5;

    let totalReliability = 0;
    for (const sourceId of sourceIds) {
      // Check cache first
      let reliability = this.sourceReliabilityCache.get(sourceId);

      if (reliability === undefined) {
        const source = sources.get(sourceId);
        if (source) {
          reliability = source.confidenceScore;
          // Boost for verified sources
          if (source.status === 'ready') reliability += 0.1;
        } else {
          reliability = 0.5;
        }
        this.sourceReliabilityCache.set(sourceId, reliability);
      }

      totalReliability += reliability;
    }

    return Math.min(1, totalReliability / sourceIds.length);
  }

  /**
   * Calculate data quality score from profiles
   */
  private calculateDataQuality(
    fusionResult: FusionResult,
    profiles: Map<string, DataProfile>
  ): number {
    const sourceIds = fusionResult.lineage.sources;
    if (sourceIds.length === 0) return 0.5;

    let totalQuality = 0;
    let count = 0;

    for (const sourceId of sourceIds) {
      const profile = profiles.get(sourceId);
      if (profile) {
        totalQuality += profile.overallQuality;
        count++;
      }
    }

    return count > 0 ? totalQuality / count : 0.5;
  }

  /**
   * Calculate fusion consistency score
   */
  private calculateFusionConsistency(fusionResult: FusionResult): number {
    const totalFields = Object.keys(fusionResult.fusedRecord).length;
    if (totalFields === 0) return 1;

    const conflictRatio = fusionResult.conflictsResolved.length / totalFields;
    return 1 - conflictRatio;
  }

  /**
   * Calculate recency score
   */
  private calculateRecency(fusionResult: FusionResult): number {
    const createdAt = fusionResult.lineage.createdAt;
    const ageMs = Date.now() - createdAt.getTime();
    const ageHours = ageMs / (1000 * 60 * 60);

    // Decay function: 1.0 at 0 hours, ~0.5 at 24 hours, ~0.1 at 72 hours
    return Math.exp(-ageHours / 24);
  }

  /**
   * Calculate field coverage score
   */
  private calculateCoverage(fusionResult: FusionResult): number {
    const record = fusionResult.fusedRecord;
    const fields = Object.keys(record);
    if (fields.length === 0) return 0;

    const nonNullFields = fields.filter(
      f => record[f] !== null && record[f] !== undefined && record[f] !== ''
    );

    return nonNullFields.length / fields.length;
  }

  /**
   * Generate explanation for source reliability
   */
  private explainSourceReliability(
    fusionResult: FusionResult,
    sources: Map<string, DiscoveredSource>
  ): string {
    const sourceCount = fusionResult.lineage.sources.length;
    const verifiedCount = fusionResult.lineage.sources.filter(id => {
      const source = sources.get(id);
      return source?.status === 'ready';
    }).length;

    return `${sourceCount} source(s) used, ${verifiedCount} verified`;
  }

  /**
   * Generate explanation for data quality
   */
  private explainDataQuality(profiles: Map<string, DataProfile>): string {
    const avgQuality = Array.from(profiles.values())
      .reduce((sum, p) => sum + p.overallQuality, 0) / Math.max(1, profiles.size);

    return `Average data quality: ${(avgQuality * 100).toFixed(0)}%`;
  }

  /**
   * Generate explanation for fusion consistency
   */
  private explainFusionConsistency(fusionResult: FusionResult): string {
    const conflicts = fusionResult.conflictsResolved.length;
    if (conflicts === 0) {
      return 'No conflicts detected during fusion';
    }
    return `${conflicts} field conflict(s) resolved`;
  }

  /**
   * Generate recommendations based on scores
   */
  private generateRecommendations(
    factors: ConfidenceFactor[],
    fusionResult: FusionResult
  ): string[] {
    const recommendations: string[] = [];

    for (const factor of factors) {
      if (factor.score < 0.6) {
        switch (factor.factor) {
          case 'source_reliability':
            recommendations.push('Consider adding more verified data sources');
            break;
          case 'data_quality':
            recommendations.push('Review source data for quality issues');
            break;
          case 'fusion_consistency':
            recommendations.push(
              `Review ${fusionResult.conflictsResolved.length} conflicting fields`
            );
            break;
          case 'recency':
            recommendations.push('Data may be stale, consider refreshing sources');
            break;
          case 'coverage':
            recommendations.push('Many fields are missing, add additional sources');
            break;
        }
      }
    }

    // Add specific field recommendations
    for (const conflict of fusionResult.conflictsResolved.slice(0, 3)) {
      recommendations.push(
        `Verify "${conflict.field}" value: ${String(conflict.resolvedValue)}`
      );
    }

    return recommendations;
  }

  /**
   * Update source reliability based on feedback
   */
  updateSourceReliability(sourceId: string, adjustment: number): void {
    const current = this.sourceReliabilityCache.get(sourceId) ?? 0.5;
    const updated = Math.max(0, Math.min(1, current + adjustment));
    this.sourceReliabilityCache.set(sourceId, updated);
  }

  /**
   * Format confidence score for display
   */
  formatScore(score: number): string {
    if (score >= 0.9) return 'Very High';
    if (score >= 0.7) return 'High';
    if (score >= 0.5) return 'Medium';
    if (score >= 0.3) return 'Low';
    return 'Very Low';
  }

  /**
   * Generate visualization data
   */
  generateVisualization(report: ConfidenceReport): object {
    return {
      type: 'confidence_chart',
      data: {
        overall: {
          score: report.overallScore,
          label: this.formatScore(report.overallScore),
        },
        factors: report.factors.map(f => ({
          name: f.factor.replace(/_/g, ' '),
          score: f.score,
          weighted: f.score * f.weight,
          explanation: f.explanation,
        })),
        sources: report.verifiableReferences.length,
        recommendations: report.recommendations.length,
      },
    };
  }
}

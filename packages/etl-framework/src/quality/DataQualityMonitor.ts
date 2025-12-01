/**
 * Data Quality Monitoring and Metrics Framework
 * Provides comprehensive data quality assessment across multiple dimensions
 */

import { Logger } from 'winston';
import {
  DataQualityReport,
  DataQualityIssue,
  DataStatistics,
  PipelineRun
} from '@intelgraph/data-integration/src/types';

export interface QualityRuleConfig {
  id: string;
  name: string;
  dimension: QualityDimension;
  rule: QualityRule;
  threshold: number;
  severity: 'critical' | 'high' | 'medium' | 'low';
  enabled: boolean;
}

export enum QualityDimension {
  COMPLETENESS = 'completeness',
  ACCURACY = 'accuracy',
  CONSISTENCY = 'consistency',
  TIMELINESS = 'timeliness',
  VALIDITY = 'validity',
  UNIQUENESS = 'uniqueness'
}

export interface QualityRule {
  type: string;
  config: Record<string, any>;
}

export class DataQualityMonitor {
  private logger: Logger;
  private rules: QualityRuleConfig[];

  constructor(logger: Logger, rules: QualityRuleConfig[] = []) {
    this.logger = logger;
    this.rules = rules;
  }

  /**
   * Generate comprehensive data quality report
   */
  async generateReport(
    pipelineRun: PipelineRun,
    data: any[]
  ): Promise<DataQualityReport> {
    this.logger.info(`Generating data quality report for pipeline run ${pipelineRun.id}`);

    const statistics = this.calculateStatistics(data);
    const issues: DataQualityIssue[] = [];

    // Calculate dimension scores
    const completeness = await this.assessCompleteness(data, statistics, issues);
    const accuracy = await this.assessAccuracy(data, statistics, issues);
    const consistency = await this.assessConsistency(data, statistics, issues);
    const timeliness = await this.assessTimeliness(data, pipelineRun, issues);
    const validity = await this.assessValidity(data, statistics, issues);
    const uniqueness = await this.assessUniqueness(data, statistics, issues);

    // Calculate overall quality score (weighted average)
    const overallScore = this.calculateOverallScore({
      completeness,
      accuracy,
      consistency,
      timeliness,
      validity,
      uniqueness
    });

    const report: DataQualityReport = {
      pipelineRunId: pipelineRun.id,
      timestamp: new Date(),
      overallScore,
      dimensions: {
        completeness,
        accuracy,
        consistency,
        timeliness,
        validity,
        uniqueness
      },
      issues,
      statistics
    };

    this.logger.info(`Data quality report generated - Overall score: ${overallScore.toFixed(2)}%`);

    return report;
  }

  /**
   * Calculate comprehensive data statistics
   */
  private calculateStatistics(data: any[]): DataStatistics {
    if (data.length === 0) {
      return {
        totalRecords: 0,
        nullCounts: {},
        distinctCounts: {},
        minValues: {},
        maxValues: {},
        averages: {},
        standardDeviations: {}
      };
    }

    const statistics: DataStatistics = {
      totalRecords: data.length,
      nullCounts: {},
      distinctCounts: {},
      minValues: {},
      maxValues: {},
      averages: {},
      standardDeviations: {}
    };

    // Get all fields from first record
    const fields = Object.keys(data[0]);

    for (const field of fields) {
      const values = data.map(record => record[field]).filter(val => val != null);
      const nullCount = data.length - values.length;

      statistics.nullCounts[field] = nullCount;
      statistics.distinctCounts[field] = new Set(values).size;

      // For numeric fields, calculate min/max/avg/stddev
      if (values.length > 0 && typeof values[0] === 'number') {
        statistics.minValues[field] = Math.min(...values);
        statistics.maxValues[field] = Math.max(...values);

        const sum = values.reduce((acc, val) => acc + val, 0);
        const avg = sum / values.length;
        statistics.averages[field] = avg;

        const variance = values.reduce((acc, val) => acc + Math.pow(val - avg, 2), 0) / values.length;
        statistics.standardDeviations[field] = Math.sqrt(variance);
      } else if (values.length > 0) {
        // For non-numeric fields, track min/max by string comparison
        const sorted = [...values].sort();
        statistics.minValues[field] = sorted[0];
        statistics.maxValues[field] = sorted[sorted.length - 1];
      }
    }

    return statistics;
  }

  /**
   * Assess data completeness (percentage of non-null values)
   */
  private async assessCompleteness(
    data: any[],
    statistics: DataStatistics,
    issues: DataQualityIssue[]
  ): Promise<number> {
    if (data.length === 0) return 100;

    const fields = Object.keys(statistics.nullCounts);
    let totalFields = 0;
    let completeFields = 0;

    for (const field of fields) {
      const nullCount = statistics.nullCounts[field];
      const completenessRatio = (data.length - nullCount) / data.length;

      totalFields++;
      completeFields += completenessRatio;

      // Flag fields with high null rates
      if (completenessRatio < 0.9 && nullCount > 0) {
        issues.push({
          severity: completenessRatio < 0.5 ? 'critical' : 'high',
          type: 'completeness',
          field,
          message: `Field "${field}" has ${((1 - completenessRatio) * 100).toFixed(1)}% null values`,
          affectedRecords: nullCount
        });
      }
    }

    return totalFields > 0 ? (completeFields / totalFields) * 100 : 100;
  }

  /**
   * Assess data accuracy (correctness of values)
   */
  private async assessAccuracy(
    data: any[],
    statistics: DataStatistics,
    issues: DataQualityIssue[]
  ): Promise<number> {
    // Apply custom accuracy rules
    const accuracyRules = this.rules.filter(r => r.dimension === QualityDimension.ACCURACY && r.enabled);

    if (accuracyRules.length === 0) {
      return 100; // No rules to check
    }

    let passedRules = 0;

    for (const rule of accuracyRules) {
      const passed = await this.evaluateRule(data, rule, issues);
      if (passed) passedRules++;
    }

    return (passedRules / accuracyRules.length) * 100;
  }

  /**
   * Assess data consistency (logical coherence)
   */
  private async assessConsistency(
    data: any[],
    statistics: DataStatistics,
    issues: DataQualityIssue[]
  ): Promise<number> {
    let consistencyScore = 100;
    let checksPerformed = 0;

    // Check for format consistency
    const fields = Object.keys(data[0] || {});

    for (const field of fields) {
      const values = data.map(r => r[field]).filter(v => v != null);

      if (values.length === 0) continue;

      checksPerformed++;

      // Type consistency check
      const types = new Set(values.map(v => typeof v));

      if (types.size > 1) {
        consistencyScore -= 10;
        issues.push({
          severity: 'medium',
          type: 'consistency',
          field,
          message: `Field "${field}" has mixed types: ${Array.from(types).join(', ')}`,
          affectedRecords: values.length,
          examples: values.slice(0, 5)
        });
      }
    }

    // Apply custom consistency rules
    const consistencyRules = this.rules.filter(
      r => r.dimension === QualityDimension.CONSISTENCY && r.enabled
    );

    for (const rule of consistencyRules) {
      checksPerformed++;
      const passed = await this.evaluateRule(data, rule, issues);
      if (!passed) consistencyScore -= 5;
    }

    return Math.max(0, consistencyScore);
  }

  /**
   * Assess data timeliness (freshness and latency)
   */
  private async assessTimeliness(
    data: any[],
    pipelineRun: PipelineRun,
    issues: DataQualityIssue[]
  ): Promise<number> {
    // Check pipeline execution time against SLA
    const executionTimeMinutes = pipelineRun.metrics.totalDurationMs / 1000 / 60;
    const slaMinutes = 30; // Default SLA

    if (executionTimeMinutes > slaMinutes) {
      issues.push({
        severity: 'medium',
        type: 'timeliness',
        message: `Pipeline execution time (${executionTimeMinutes.toFixed(1)}m) exceeded SLA (${slaMinutes}m)`,
        affectedRecords: data.length
      });

      return Math.max(0, 100 - ((executionTimeMinutes - slaMinutes) / slaMinutes) * 50);
    }

    // Check data freshness
    const timelinessRules = this.rules.filter(
      r => r.dimension === QualityDimension.TIMELINESS && r.enabled
    );

    if (timelinessRules.length === 0) {
      return 100;
    }

    let passedRules = 0;

    for (const rule of timelinessRules) {
      const passed = await this.evaluateRule(data, rule, issues);
      if (passed) passedRules++;
    }

    return (passedRules / timelinessRules.length) * 100;
  }

  /**
   * Assess data validity (conformance to rules and formats)
   */
  private async assessValidity(
    data: any[],
    statistics: DataStatistics,
    issues: DataQualityIssue[]
  ): Promise<number> {
    const validityRules = this.rules.filter(r => r.dimension === QualityDimension.VALIDITY && r.enabled);

    if (validityRules.length === 0) {
      return 100;
    }

    let passedRules = 0;

    for (const rule of validityRules) {
      const passed = await this.evaluateRule(data, rule, issues);
      if (passed) passedRules++;
    }

    return (passedRules / validityRules.length) * 100;
  }

  /**
   * Assess data uniqueness (duplicate detection)
   */
  private async assessUniqueness(
    data: any[],
    statistics: DataStatistics,
    issues: DataQualityIssue[]
  ): Promise<number> {
    if (data.length === 0) return 100;

    // Check for duplicates based on all fields
    const seen = new Set<string>();
    let duplicates = 0;

    for (const record of data) {
      const key = JSON.stringify(record);

      if (seen.has(key)) {
        duplicates++;
      } else {
        seen.add(key);
      }
    }

    if (duplicates > 0) {
      const duplicateRate = (duplicates / data.length) * 100;

      issues.push({
        severity: duplicateRate > 10 ? 'high' : 'medium',
        type: 'uniqueness',
        message: `Found ${duplicates} duplicate records (${duplicateRate.toFixed(1)}%)`,
        affectedRecords: duplicates
      });

      return Math.max(0, 100 - duplicateRate);
    }

    return 100;
  }

  /**
   * Evaluate a quality rule against the data
   */
  private async evaluateRule(
    data: any[],
    rule: QualityRuleConfig,
    issues: DataQualityIssue[]
  ): Promise<boolean> {
    try {
      let violationCount = 0;

      // Simple rule evaluation based on type
      for (const record of data) {
        if (!this.checkRuleCondition(record, rule.rule)) {
          violationCount++;
        }
      }

      const violationRate = (violationCount / data.length) * 100;
      const passed = violationRate <= (100 - rule.threshold);

      if (!passed && violationCount > 0) {
        issues.push({
          severity: rule.severity,
          type: rule.dimension,
          message: `Rule "${rule.name}" failed: ${violationCount} violations (${violationRate.toFixed(1)}%)`,
          affectedRecords: violationCount
        });
      }

      return passed;
    } catch (error) {
      this.logger.error(`Error evaluating rule ${rule.id}`, { error });
      return false;
    }
  }

  private checkRuleCondition(record: any, rule: QualityRule): boolean {
    // Simple rule condition checking
    // In production, this would be more sophisticated with rule engine
    return true; // Placeholder
  }

  /**
   * Calculate weighted overall quality score
   */
  private calculateOverallScore(dimensions: Record<string, number>): number {
    // Weight each dimension
    const weights = {
      completeness: 0.20,
      accuracy: 0.25,
      consistency: 0.15,
      timeliness: 0.15,
      validity: 0.15,
      uniqueness: 0.10
    };

    let weightedSum = 0;
    let totalWeight = 0;

    for (const [dimension, score] of Object.entries(dimensions)) {
      const weight = weights[dimension as keyof typeof weights] || 0;
      weightedSum += score * weight;
      totalWeight += weight;
    }

    return totalWeight > 0 ? weightedSum / totalWeight : 0;
  }

  /**
   * Add a quality rule
   */
  addRule(rule: QualityRuleConfig): void {
    this.rules.push(rule);
  }

  /**
   * Remove a quality rule
   */
  removeRule(ruleId: string): void {
    this.rules = this.rules.filter(r => r.id !== ruleId);
  }

  /**
   * Get all rules
   */
  getRules(): QualityRuleConfig[] {
    return [...this.rules];
  }
}

/**
 * IntelGraph Data Quality Package
 * Data validation, scoring, and quality checks
 */

import type {
  DataQualityDimension,
  DataQualityRule,
  DataQualityScore,
  DataQualityAssessment
} from '@intelgraph/etl';
import { v4 as uuidv4 } from 'uuid';

/**
 * Data Quality Validator
 * Validates data against quality rules
 */
export class DataQualityValidator {
  private rules: DataQualityRule[];

  constructor(rules: DataQualityRule[]) {
    this.rules = rules.filter(r => r.enabled);
  }

  /**
   * Validate a single record
   */
  async validate(record: Record<string, unknown>): Promise<{
    valid: boolean;
    violations: Array<{
      rule: DataQualityRule;
      message: string;
    }>;
  }> {
    const violations: Array<{
      rule: DataQualityRule;
      message: string;
    }> = [];

    for (const rule of this.rules) {
      const passed = this.evaluateRule(rule, record);

      if (!passed) {
        violations.push({
          rule,
          message: `Rule '${rule.name}' failed for field '${rule.field || 'record'}'`
        });
      }
    }

    return {
      valid: violations.filter(v => v.rule.severity === 'ERROR').length === 0,
      violations
    };
  }

  /**
   * Evaluate a single rule
   */
  private evaluateRule(rule: DataQualityRule, record: Record<string, unknown>): boolean {
    try {
      // Get field value if specified
      const value = rule.field ? this.getNestedValue(record, rule.field) : record;

      // Evaluate expression (simplified implementation)
      // In production, use a proper expression evaluator
      return this.evaluateExpression(rule.expression, value, record);
    } catch (error) {
      return false;
    }
  }

  /**
   * Evaluate expression (simplified)
   */
  private evaluateExpression(
    expression: string,
    value: unknown,
    record: Record<string, unknown>
  ): boolean {
    // Simple expression evaluation
    // Supported: 'required', 'email', 'url', 'minLength:N', 'maxLength:N', etc.

    if (expression === 'required') {
      return value !== null && value !== undefined && value !== '';
    }

    if (expression === 'email') {
      return typeof value === 'string' && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
    }

    if (expression === 'url') {
      try {
        new URL(String(value));
        return true;
      } catch {
        return false;
      }
    }

    if (expression.startsWith('minLength:')) {
      const minLength = parseInt(expression.split(':')[1]);
      return String(value).length >= minLength;
    }

    if (expression.startsWith('maxLength:')) {
      const maxLength = parseInt(expression.split(':')[1]);
      return String(value).length <= maxLength;
    }

    if (expression.startsWith('min:')) {
      const min = parseFloat(expression.split(':')[1]);
      return Number(value) >= min;
    }

    if (expression.startsWith('max:')) {
      const max = parseFloat(expression.split(':')[1]);
      return Number(value) <= max;
    }

    // Default: always pass
    return true;
  }

  /**
   * Get nested value from object
   */
  private getNestedValue(obj: Record<string, unknown>, path: string): unknown {
    const keys = path.split('.');
    let current: any = obj;

    for (const key of keys) {
      if (current && typeof current === 'object' && key in current) {
        current = current[key];
      } else {
        return undefined;
      }
    }

    return current;
  }
}

/**
 * Data Quality Scorer
 * Calculates quality scores for data
 */
export class DataQualityScorer {
  /**
   * Calculate quality assessment for a batch of records
   */
  async assess(
    records: Record<string, unknown>[],
    rules: DataQualityRule[],
    runId: string
  ): Promise<DataQualityAssessment> {
    const validator = new DataQualityValidator(rules);

    let validRecords = 0;
    const dimensionViolations = new Map<DataQualityDimension, number>();
    const dimensionTotals = new Map<DataQualityDimension, number>();

    // Initialize dimension counts
    for (const rule of rules) {
      if (!dimensionTotals.has(rule.dimension)) {
        dimensionTotals.set(rule.dimension, 0);
        dimensionViolations.set(rule.dimension, 0);
      }
    }

    // Validate all records
    for (const record of records) {
      const result = await validator.validate(record);

      if (result.valid) {
        validRecords++;
      }

      // Count violations by dimension
      for (const violation of result.violations) {
        const dimension = violation.rule.dimension;
        dimensionViolations.set(
          dimension,
          (dimensionViolations.get(dimension) || 0) + 1
        );
      }

      // Count total checks per dimension
      for (const rule of rules) {
        dimensionTotals.set(
          rule.dimension,
          (dimensionTotals.get(rule.dimension) || 0) + 1
        );
      }
    }

    // Calculate dimension scores
    const scores: DataQualityScore[] = [];
    for (const [dimension, total] of dimensionTotals.entries()) {
      const violations = dimensionViolations.get(dimension) || 0;
      const score = total > 0 ? ((total - violations) / total) * 100 : 100;

      scores.push({
        dimension,
        score,
        violations,
        details: `${violations} violations out of ${total} checks`
      });
    }

    // Calculate overall score
    const overallScore =
      scores.length > 0
        ? scores.reduce((sum, s) => sum + s.score, 0) / scores.length
        : 100;

    return {
      id: uuidv4(),
      runId,
      overallScore,
      scores,
      totalRecords: records.length,
      validRecords,
      invalidRecords: records.length - validRecords,
      assessedAt: new Date()
    };
  }

  /**
   * Calculate source credibility score
   */
  calculateCredibilityScore(source: {
    name: string;
    historicalAccuracy?: number;
    verificationLevel?: 'verified' | 'unverified' | 'disputed';
    age?: number; // in years
    citations?: number;
  }): number {
    let score = 50; // Base score

    // Historical accuracy (0-30 points)
    if (source.historicalAccuracy !== undefined) {
      score += source.historicalAccuracy * 0.3;
    }

    // Verification level (0-25 points)
    if (source.verificationLevel) {
      switch (source.verificationLevel) {
        case 'verified':
          score += 25;
          break;
        case 'unverified':
          score += 10;
          break;
        case 'disputed':
          score -= 10;
          break;
      }
    }

    // Source age (0-15 points)
    if (source.age !== undefined) {
      score += Math.min(source.age, 15);
    }

    // Citations (0-10 points)
    if (source.citations !== undefined) {
      score += Math.min(Math.log10(source.citations + 1) * 3, 10);
    }

    return Math.max(0, Math.min(100, score));
  }
}

export type { DataQualityDimension, DataQualityRule, DataQualityScore, DataQualityAssessment };

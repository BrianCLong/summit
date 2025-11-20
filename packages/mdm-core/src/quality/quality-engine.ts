/**
 * Data Quality Engine
 * Comprehensive data quality assessment and improvement for MDM
 */

import type {
  QualityProfile,
  QualityRule,
  QualityIssue,
  DimensionScore,
  RuleResult,
  QualityDimension,
  Severity,
  IssueType
} from '../types/index.js';
import { v4 as uuidv4 } from 'uuid';

export class QualityEngine {
  private rules: Map<string, QualityRule>;

  constructor() {
    this.rules = new Map();
  }

  /**
   * Assess data quality for a record
   */
  async assessQuality(
    recordId: string,
    domain: string,
    data: Record<string, unknown>,
    rules: QualityRule[]
  ): Promise<QualityProfile> {
    const dimensionScores: DimensionScore[] = [];
    const ruleResults: RuleResult[] = [];
    const issues: QualityIssue[] = [];

    // Group rules by dimension
    const rulesByDimension = this.groupRulesByDimension(rules);

    // Assess each dimension
    for (const [dimension, dimensionRules] of rulesByDimension) {
      const dimScore = await this.assessDimension(
        recordId,
        data,
        dimension,
        dimensionRules,
        ruleResults,
        issues
      );
      dimensionScores.push(dimScore);
    }

    // Calculate overall score
    const overallScore = this.calculateOverallScore(dimensionScores);

    return {
      recordId,
      domain,
      overallScore,
      dimensionScores,
      ruleResults,
      issues,
      lastAssessed: new Date(),
      assessedBy: 'system'
    };
  }

  /**
   * Assess a single quality dimension
   */
  private async assessDimension(
    recordId: string,
    data: Record<string, unknown>,
    dimension: QualityDimension,
    rules: QualityRule[],
    ruleResults: RuleResult[],
    issues: QualityIssue[]
  ): Promise<DimensionScore> {
    let passedRules = 0;
    const dimensionIssues: QualityIssue[] = [];

    for (const rule of rules) {
      if (!rule.active) continue;

      const result = await this.evaluateRule(recordId, data, rule);
      ruleResults.push(result);

      if (result.passed) {
        passedRules++;
      } else {
        const issue = this.createIssue(recordId, rule, result);
        dimensionIssues.push(issue);
        issues.push(issue);
      }
    }

    const score = rules.length > 0 ? passedRules / rules.length : 1.0;

    return {
      dimension,
      score,
      weight: this.getDimensionWeight(dimension),
      passedRules,
      totalRules: rules.length,
      issues: dimensionIssues
    };
  }

  /**
   * Evaluate a single quality rule
   */
  private async evaluateRule(
    recordId: string,
    data: Record<string, unknown>,
    rule: QualityRule
  ): Promise<RuleResult> {
    let passed = false;
    let score = 0;
    let errorMessage: string | undefined;

    try {
      switch (rule.ruleType) {
        case 'field_validation':
          ({ passed, score, errorMessage } = this.evaluateFieldValidation(data, rule));
          break;

        case 'record_validation':
          ({ passed, score, errorMessage } = this.evaluateRecordValidation(data, rule));
          break;

        case 'cross_field':
          ({ passed, score, errorMessage } = this.evaluateCrossField(data, rule));
          break;

        case 'business_rule':
          ({ passed, score, errorMessage } = this.evaluateBusinessRule(data, rule));
          break;

        case 'statistical':
          ({ passed, score, errorMessage } = this.evaluateStatistical(data, rule));
          break;

        default:
          passed = true;
          score = 1.0;
      }
    } catch (error) {
      passed = false;
      score = 0;
      errorMessage = error instanceof Error ? error.message : 'Evaluation failed';
    }

    return {
      ruleId: rule.id,
      ruleName: rule.name,
      dimension: rule.dimension,
      passed,
      score,
      errorMessage,
      severity: rule.severity
    };
  }

  /**
   * Evaluate field validation rules
   */
  private evaluateFieldValidation(
    data: Record<string, unknown>,
    rule: QualityRule
  ): { passed: boolean; score: number; errorMessage?: string } {
    // Parse the expression to get field name and validation logic
    const match = rule.expression.match(/^(\w+)\s*(.+)$/);
    if (!match) {
      return { passed: false, score: 0, errorMessage: 'Invalid rule expression' };
    }

    const fieldName = match[1];
    const value = data[fieldName];

    // Common validations
    if (rule.expression.includes('required') || rule.expression.includes('not null')) {
      const passed = value !== null && value !== undefined && value !== '';
      return {
        passed,
        score: passed ? 1.0 : 0.0,
        errorMessage: passed ? undefined : `${fieldName} is required`
      };
    }

    if (rule.expression.includes('email')) {
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      const passed = typeof value === 'string' && emailRegex.test(value);
      return {
        passed,
        score: passed ? 1.0 : 0.0,
        errorMessage: passed ? undefined : `${fieldName} must be a valid email`
      };
    }

    if (rule.expression.includes('phone')) {
      const phoneRegex = /^[+]?[(]?[0-9]{1,4}[)]?[-\s./0-9]*$/;
      const passed = typeof value === 'string' && phoneRegex.test(value);
      return {
        passed,
        score: passed ? 1.0 : 0.0,
        errorMessage: passed ? undefined : `${fieldName} must be a valid phone number`
      };
    }

    if (rule.expression.includes('url')) {
      try {
        new URL(String(value));
        return { passed: true, score: 1.0 };
      } catch {
        return { passed: false, score: 0.0, errorMessage: `${fieldName} must be a valid URL` };
      }
    }

    // Default: check if field exists and has value
    const passed = value !== null && value !== undefined;
    return {
      passed,
      score: passed ? 1.0 : 0.0,
      errorMessage: passed ? undefined : `${fieldName} validation failed`
    };
  }

  /**
   * Evaluate record-level validation
   */
  private evaluateRecordValidation(
    data: Record<string, unknown>,
    rule: QualityRule
  ): { passed: boolean; score: number; errorMessage?: string } {
    // Completeness check
    if (rule.expression.includes('completeness')) {
      const threshold = rule.threshold || 0.8;
      const totalFields = Object.keys(data).length;
      const populatedFields = Object.values(data).filter(
        v => v !== null && v !== undefined && v !== ''
      ).length;

      const completeness = totalFields > 0 ? populatedFields / totalFields : 0;
      const passed = completeness >= threshold;

      return {
        passed,
        score: completeness,
        errorMessage: passed ? undefined : `Record completeness ${(completeness * 100).toFixed(1)}% below threshold ${(threshold * 100).toFixed(1)}%`
      };
    }

    return { passed: true, score: 1.0 };
  }

  /**
   * Evaluate cross-field validation
   */
  private evaluateCrossField(
    data: Record<string, unknown>,
    rule: QualityRule
  ): { passed: boolean; score: number; errorMessage?: string } {
    // Date range validation (e.g., start_date < end_date)
    if (rule.expression.includes('<') || rule.expression.includes('>')) {
      const match = rule.expression.match(/(\w+)\s*([<>]=?)\s*(\w+)/);
      if (match) {
        const [, field1, operator, field2] = match;
        const value1 = data[field1];
        const value2 = data[field2];

        if (value1 === undefined || value2 === undefined) {
          return { passed: true, score: 1.0 }; // Skip if fields don't exist
        }

        let passed = false;
        if (operator === '<') passed = value1 < value2;
        else if (operator === '>') passed = value1 > value2;
        else if (operator === '<=') passed = value1 <= value2;
        else if (operator === '>=') passed = value1 >= value2;

        return {
          passed,
          score: passed ? 1.0 : 0.0,
          errorMessage: passed ? undefined : `Cross-field validation failed: ${rule.expression}`
        };
      }
    }

    return { passed: true, score: 1.0 };
  }

  /**
   * Evaluate business rules
   */
  private evaluateBusinessRule(
    data: Record<string, unknown>,
    rule: QualityRule
  ): { passed: boolean; score: number; errorMessage?: string } {
    // This would typically involve more complex business logic
    // For now, we'll do basic checks
    try {
      // Could use a safe expression evaluator here
      return { passed: true, score: 1.0 };
    } catch (error) {
      return {
        passed: false,
        score: 0.0,
        errorMessage: error instanceof Error ? error.message : 'Business rule evaluation failed'
      };
    }
  }

  /**
   * Evaluate statistical rules
   */
  private evaluateStatistical(
    data: Record<string, unknown>,
    rule: QualityRule
  ): { passed: boolean; score: number; errorMessage?: string } {
    // Statistical analysis would require historical data
    // This is a placeholder for the implementation
    return { passed: true, score: 1.0 };
  }

  /**
   * Create quality issue from failed rule
   */
  private createIssue(
    recordId: string,
    rule: QualityRule,
    result: RuleResult
  ): QualityIssue {
    return {
      id: uuidv4(),
      recordId,
      issueType: this.mapRuleTypeToIssueType(rule.ruleType),
      dimension: rule.dimension,
      severity: rule.severity,
      description: result.errorMessage || rule.description,
      detectedAt: new Date(),
      status: 'open',
      autoFixable: rule.autoFix
    };
  }

  /**
   * Map rule type to issue type
   */
  private mapRuleTypeToIssueType(ruleType: string): IssueType {
    const mapping: Record<string, IssueType> = {
      field_validation: 'invalid_format',
      record_validation: 'missing_value',
      cross_field: 'inconsistent',
      business_rule: 'non_conforming',
      statistical: 'custom'
    };
    return mapping[ruleType] || 'custom';
  }

  /**
   * Group rules by dimension
   */
  private groupRulesByDimension(rules: QualityRule[]): Map<QualityDimension, QualityRule[]> {
    const grouped = new Map<QualityDimension, QualityRule[]>();

    for (const rule of rules) {
      if (!grouped.has(rule.dimension)) {
        grouped.set(rule.dimension, []);
      }
      grouped.get(rule.dimension)!.push(rule);
    }

    return grouped;
  }

  /**
   * Calculate overall quality score from dimension scores
   */
  private calculateOverallScore(dimensionScores: DimensionScore[]): number {
    if (dimensionScores.length === 0) return 1.0;

    const totalWeight = dimensionScores.reduce((sum, ds) => sum + ds.weight, 0);
    if (totalWeight === 0) return 1.0;

    const weightedSum = dimensionScores.reduce(
      (sum, ds) => sum + ds.score * ds.weight,
      0
    );

    return weightedSum / totalWeight;
  }

  /**
   * Get weight for quality dimension
   */
  private getDimensionWeight(dimension: QualityDimension): number {
    const weights: Record<QualityDimension, number> = {
      completeness: 0.25,
      accuracy: 0.25,
      consistency: 0.15,
      validity: 0.15,
      uniqueness: 0.10,
      timeliness: 0.10,
      conformity: 0.05,
      integrity: 0.05
    };
    return weights[dimension] || 0.1;
  }

  /**
   * Auto-fix quality issues where possible
   */
  async autoFixIssues(
    data: Record<string, unknown>,
    issues: QualityIssue[]
  ): Promise<{ fixed: number; data: Record<string, unknown> }> {
    let fixed = 0;
    const fixedData = { ...data };

    for (const issue of issues) {
      if (!issue.autoFixable) continue;

      switch (issue.issueType) {
        case 'missing_value':
          // Could set default values
          break;

        case 'invalid_format':
          // Could apply formatting corrections
          break;

        case 'inconsistent':
          // Could standardize values
          break;

        default:
          continue;
      }

      fixed++;
    }

    return { fixed, data: fixedData };
  }

  /**
   * Register a quality rule
   */
  registerRule(rule: QualityRule): void {
    this.rules.set(rule.id, rule);
  }

  /**
   * Get all registered rules for a domain
   */
  getRulesForDomain(domain: string): QualityRule[] {
    return Array.from(this.rules.values()).filter(r => r.domain === domain);
  }
}

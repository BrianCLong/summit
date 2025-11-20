/**
 * Data Quality Rule Engine
 * Defines, validates, and monitors data quality rules
 */

export enum RuleType {
  COMPLETENESS = 'COMPLETENESS',
  ACCURACY = 'ACCURACY',
  CONSISTENCY = 'CONSISTENCY',
  VALIDITY = 'VALIDITY',
  UNIQUENESS = 'UNIQUENESS',
  TIMELINESS = 'TIMELINESS',
  CUSTOM = 'CUSTOM',
}

export enum RuleSeverity {
  INFO = 'INFO',
  WARNING = 'WARNING',
  ERROR = 'ERROR',
  CRITICAL = 'CRITICAL',
}

export interface QualityRule {
  id: string;
  name: string;
  description: string;
  type: RuleType;
  severity: RuleSeverity;
  assetId: string;
  columnName?: string;
  condition: RuleCondition;
  threshold: number;
  enabled: boolean;
  createdBy: string;
  createdAt: Date;
  lastChecked?: Date;
}

export interface RuleCondition {
  operator: ConditionOperator;
  value?: any;
  sql?: string;
  function?: string;
}

export enum ConditionOperator {
  NOT_NULL = 'NOT_NULL',
  IS_NULL = 'IS_NULL',
  EQUALS = 'EQUALS',
  NOT_EQUALS = 'NOT_EQUALS',
  GREATER_THAN = 'GREATER_THAN',
  LESS_THAN = 'LESS_THAN',
  BETWEEN = 'BETWEEN',
  IN = 'IN',
  REGEX_MATCH = 'REGEX_MATCH',
  SQL_CONDITION = 'SQL_CONDITION',
  CUSTOM_FUNCTION = 'CUSTOM_FUNCTION',
}

export interface RuleViolation {
  ruleId: string;
  assetId: string;
  severity: RuleSeverity;
  message: string;
  violationCount: number;
  sampleValues?: any[];
  detectedAt: Date;
}

export interface QualityReport {
  assetId: string;
  reportDate: Date;
  overallScore: number;
  dimensionScores: {
    completeness: number;
    accuracy: number;
    consistency: number;
    validity: number;
    uniqueness: number;
    timeliness: number;
  };
  rulesEvaluated: number;
  rulesPassed: number;
  rulesFailed: number;
  violations: RuleViolation[];
}

export interface IQualityRuleStore {
  getRule(id: string): Promise<QualityRule | null>;
  listRules(assetId?: string): Promise<QualityRule[]>;
  createRule(rule: QualityRule): Promise<QualityRule>;
  updateRule(id: string, updates: Partial<QualityRule>): Promise<QualityRule>;
  deleteRule(id: string): Promise<void>;
  recordViolation(violation: RuleViolation): Promise<void>;
  getViolations(assetId: string, startDate: Date, endDate: Date): Promise<RuleViolation[]>;
}

export class QualityRuleEngine {
  constructor(private store: IQualityRuleStore) {}

  /**
   * Create quality rule
   */
  async createRule(
    name: string,
    description: string,
    type: RuleType,
    severity: RuleSeverity,
    assetId: string,
    condition: RuleCondition,
    threshold: number,
    createdBy: string,
    columnName?: string
  ): Promise<QualityRule> {
    const rule: QualityRule = {
      id: this.generateRuleId(),
      name,
      description,
      type,
      severity,
      assetId,
      columnName,
      condition,
      threshold,
      enabled: true,
      createdBy,
      createdAt: new Date(),
    };

    return this.store.createRule(rule);
  }

  /**
   * Evaluate quality rules for an asset
   */
  async evaluateRules(assetId: string, data: any[]): Promise<QualityReport> {
    const rules = await this.store.listRules(assetId);
    const enabledRules = rules.filter((r) => r.enabled);

    const violations: RuleViolation[] = [];
    let rulesPassed = 0;
    let rulesFailed = 0;

    for (const rule of enabledRules) {
      const result = await this.evaluateRule(rule, data);

      if (result.passed) {
        rulesPassed++;
      } else {
        rulesFailed++;
        violations.push({
          ruleId: rule.id,
          assetId: rule.assetId,
          severity: rule.severity,
          message: result.message,
          violationCount: result.violationCount,
          sampleValues: result.sampleValues,
          detectedAt: new Date(),
        });

        // Record violation
        await this.store.recordViolation(violations[violations.length - 1]);
      }

      // Update last checked time
      await this.store.updateRule(rule.id, { lastChecked: new Date() });
    }

    // Calculate dimension scores
    const dimensionScores = this.calculateDimensionScores(enabledRules, violations);

    // Calculate overall score
    const overallScore =
      (dimensionScores.completeness +
        dimensionScores.accuracy +
        dimensionScores.consistency +
        dimensionScores.validity +
        dimensionScores.uniqueness +
        dimensionScores.timeliness) /
      6;

    return {
      assetId,
      reportDate: new Date(),
      overallScore,
      dimensionScores,
      rulesEvaluated: enabledRules.length,
      rulesPassed,
      rulesFailed,
      violations,
    };
  }

  /**
   * Evaluate single quality rule
   */
  private async evaluateRule(
    rule: QualityRule,
    data: any[]
  ): Promise<{
    passed: boolean;
    message: string;
    violationCount: number;
    sampleValues?: any[];
  }> {
    let violationCount = 0;
    const sampleValues: any[] = [];

    switch (rule.type) {
      case RuleType.COMPLETENESS:
        return this.evaluateCompletenessRule(rule, data);

      case RuleType.UNIQUENESS:
        return this.evaluateUniquenessRule(rule, data);

      case RuleType.VALIDITY:
        return this.evaluateValidityRule(rule, data);

      case RuleType.CONSISTENCY:
        return this.evaluateConsistencyRule(rule, data);

      default:
        return {
          passed: true,
          message: 'Rule type not implemented',
          violationCount: 0,
        };
    }
  }

  /**
   * Evaluate completeness rule (null checks)
   */
  private evaluateCompletenessRule(
    rule: QualityRule,
    data: any[]
  ): {
    passed: boolean;
    message: string;
    violationCount: number;
    sampleValues?: any[];
  } {
    if (!rule.columnName) {
      return {
        passed: false,
        message: 'Column name required for completeness rule',
        violationCount: 0,
      };
    }

    const nullCount = data.filter((row) => row[rule.columnName!] == null).length;
    const completenessRate = 1 - nullCount / data.length;

    const passed = completenessRate >= rule.threshold;

    return {
      passed,
      message: passed
        ? `Completeness check passed: ${(completenessRate * 100).toFixed(2)}%`
        : `Completeness check failed: ${(completenessRate * 100).toFixed(2)}% (expected >=${(rule.threshold * 100).toFixed(2)}%)`,
      violationCount: nullCount,
      sampleValues: data.filter((row) => row[rule.columnName!] == null).slice(0, 5),
    };
  }

  /**
   * Evaluate uniqueness rule
   */
  private evaluateUniquenessRule(
    rule: QualityRule,
    data: any[]
  ): {
    passed: boolean;
    message: string;
    violationCount: number;
    sampleValues?: any[];
  } {
    if (!rule.columnName) {
      return {
        passed: false,
        message: 'Column name required for uniqueness rule',
        violationCount: 0,
      };
    }

    const values = data.map((row) => row[rule.columnName!]);
    const uniqueValues = new Set(values);
    const uniquenessRate = uniqueValues.size / values.length;

    const passed = uniquenessRate >= rule.threshold;

    // Find duplicates
    const valueCounts = new Map<any, number>();
    values.forEach((v) => valueCounts.set(v, (valueCounts.get(v) || 0) + 1));
    const duplicates = Array.from(valueCounts.entries())
      .filter(([_, count]) => count > 1)
      .slice(0, 5);

    return {
      passed,
      message: passed
        ? `Uniqueness check passed: ${(uniquenessRate * 100).toFixed(2)}%`
        : `Uniqueness check failed: ${(uniquenessRate * 100).toFixed(2)}% (expected >=${(rule.threshold * 100).toFixed(2)}%)`,
      violationCount: values.length - uniqueValues.size,
      sampleValues: duplicates.map(([value, count]) => ({ value, count })),
    };
  }

  /**
   * Evaluate validity rule (format/pattern checks)
   */
  private evaluateValidityRule(
    rule: QualityRule,
    data: any[]
  ): {
    passed: boolean;
    message: string;
    violationCount: number;
    sampleValues?: any[];
  } {
    if (!rule.columnName) {
      return {
        passed: false,
        message: 'Column name required for validity rule',
        violationCount: 0,
      };
    }

    const condition = rule.condition;
    let invalidCount = 0;
    const invalidSamples: any[] = [];

    for (const row of data) {
      const value = row[rule.columnName];

      if (value == null) continue;

      let isValid = true;

      switch (condition.operator) {
        case ConditionOperator.REGEX_MATCH:
          const regex = new RegExp(condition.value);
          isValid = regex.test(value);
          break;

        case ConditionOperator.IN:
          isValid = condition.value.includes(value);
          break;

        case ConditionOperator.BETWEEN:
          isValid = value >= condition.value[0] && value <= condition.value[1];
          break;
      }

      if (!isValid) {
        invalidCount++;
        if (invalidSamples.length < 5) {
          invalidSamples.push(value);
        }
      }
    }

    const validityRate = 1 - invalidCount / data.length;
    const passed = validityRate >= rule.threshold;

    return {
      passed,
      message: passed
        ? `Validity check passed: ${(validityRate * 100).toFixed(2)}%`
        : `Validity check failed: ${(validityRate * 100).toFixed(2)}% (expected >=${(rule.threshold * 100).toFixed(2)}%)`,
      violationCount: invalidCount,
      sampleValues: invalidSamples,
    };
  }

  /**
   * Evaluate consistency rule
   */
  private evaluateConsistencyRule(
    rule: QualityRule,
    data: any[]
  ): {
    passed: boolean;
    message: string;
    violationCount: number;
  } {
    // Placeholder - would check consistency across related datasets
    return {
      passed: true,
      message: 'Consistency check not implemented',
      violationCount: 0,
    };
  }

  /**
   * Calculate dimension scores based on rules and violations
   */
  private calculateDimensionScores(rules: QualityRule[], violations: RuleViolation[]): {
    completeness: number;
    accuracy: number;
    consistency: number;
    validity: number;
    uniqueness: number;
    timeliness: number;
  } {
    const scores = {
      completeness: 1.0,
      accuracy: 1.0,
      consistency: 1.0,
      validity: 1.0,
      uniqueness: 1.0,
      timeliness: 1.0,
    };

    // Group violations by rule type
    const violationsByType = new Map<RuleType, RuleViolation[]>();
    for (const violation of violations) {
      const rule = rules.find((r) => r.id === violation.ruleId);
      if (rule) {
        if (!violationsByType.has(rule.type)) {
          violationsByType.set(rule.type, []);
        }
        violationsByType.get(rule.type)!.push(violation);
      }
    }

    // Calculate scores based on violations
    const typeToScore: Record<string, keyof typeof scores> = {
      [RuleType.COMPLETENESS]: 'completeness',
      [RuleType.ACCURACY]: 'accuracy',
      [RuleType.CONSISTENCY]: 'consistency',
      [RuleType.VALIDITY]: 'validity',
      [RuleType.UNIQUENESS]: 'uniqueness',
      [RuleType.TIMELINESS]: 'timeliness',
    };

    for (const [ruleType, typeViolations] of violationsByType.entries()) {
      const scoreKey = typeToScore[ruleType];
      if (scoreKey) {
        const rulesOfType = rules.filter((r) => r.type === ruleType);
        if (rulesOfType.length > 0) {
          scores[scoreKey] = 1 - typeViolations.length / rulesOfType.length;
        }
      }
    }

    return scores;
  }

  /**
   * Get quality report for asset
   */
  async getQualityReport(assetId: string): Promise<QualityReport | null> {
    const rules = await this.store.listRules(assetId);
    if (rules.length === 0) {
      return null;
    }

    // Get recent violations
    const endDate = new Date();
    const startDate = new Date(endDate.getTime() - 24 * 60 * 60 * 1000); // Last 24 hours
    const violations = await this.store.getViolations(assetId, startDate, endDate);

    const enabledRules = rules.filter((r) => r.enabled);
    const rulesPassed = enabledRules.length - violations.length;
    const rulesFailed = violations.length;

    const dimensionScores = this.calculateDimensionScores(enabledRules, violations);
    const overallScore =
      (dimensionScores.completeness +
        dimensionScores.accuracy +
        dimensionScores.consistency +
        dimensionScores.validity +
        dimensionScores.uniqueness +
        dimensionScores.timeliness) /
      6;

    return {
      assetId,
      reportDate: new Date(),
      overallScore,
      dimensionScores,
      rulesEvaluated: enabledRules.length,
      rulesPassed,
      rulesFailed,
      violations,
    };
  }

  /**
   * Generate rule ID
   */
  private generateRuleId(): string {
    return `rule-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  }
}

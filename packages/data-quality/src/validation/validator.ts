/**
 * Data validation engine with rule-based quality checks
 */

import { Pool } from 'pg';
import {
  QualityRule,
  ValidationResult,
  ValidationConfig,
  Violation,
} from '../types.js';

export class DataValidator {
  private rules: Map<string, QualityRule> = new Map();

  constructor(private pool: Pool) {}

  /**
   * Register a quality rule
   */
  registerRule(rule: QualityRule): void {
    this.rules.set(rule.id, rule);
  }

  /**
   * Validate dataset against all registered rules
   */
  async validate(
    tableName: string,
    config: ValidationConfig = {}
  ): Promise<ValidationResult[]> {
    const {
      stopOnFirstError = false,
      maxViolations = 1000,
    } = config;

    const results: ValidationResult[] = [];

    for (const [ruleId, rule] of this.rules) {
      if (!rule.enabled) continue;

      const result = await this.validateRule(tableName, rule, maxViolations);
      results.push(result);

      if (stopOnFirstError && !result.passed) {
        break;
      }
    }

    return results;
  }

  /**
   * Validate single rule
   */
  private async validateRule(
    tableName: string,
    rule: QualityRule,
    maxViolations: number
  ): Promise<ValidationResult> {
    const client = await this.pool.connect();
    try {
      let violations: Violation[] = [];

      switch (rule.type) {
        case 'completeness':
          violations = await this.validateCompleteness(client, tableName, rule, maxViolations);
          break;
        case 'uniqueness':
          violations = await this.validateUniqueness(client, tableName, rule, maxViolations);
          break;
        case 'validity':
          violations = await this.validateValidity(client, tableName, rule, maxViolations);
          break;
        case 'consistency':
          violations = await this.validateConsistency(client, tableName, rule, maxViolations);
          break;
        case 'referential-integrity':
          violations = await this.validateReferentialIntegrity(client, tableName, rule, maxViolations);
          break;
        case 'range':
          violations = await this.validateRange(client, tableName, rule, maxViolations);
          break;
        case 'pattern':
          violations = await this.validatePattern(client, tableName, rule, maxViolations);
          break;
        case 'custom':
          violations = await this.validateCustom(client, tableName, rule, maxViolations);
          break;
      }

      const affectedColumns = [...new Set(violations.map(v => v.columnName))];

      return {
        ruleId: rule.id,
        ruleName: rule.name,
        passed: violations.length === 0,
        severity: rule.severity,
        message: violations.length === 0
          ? `Rule "${rule.name}" passed`
          : `Rule "${rule.name}" failed with ${violations.length} violations`,
        affectedRows: violations.length,
        affectedColumns,
        violations: violations.slice(0, maxViolations),
        timestamp: new Date(),
      };
    } finally {
      client.release();
    }
  }

  private async validateCompleteness(
    client: any,
    tableName: string,
    rule: QualityRule,
    maxViolations: number
  ): Promise<Violation[]> {
    const columnName = rule.condition.value;
    const threshold = rule.threshold || 100;

    const query = `
      SELECT COUNT(*) as total, COUNT("${columnName}") as non_null
      FROM "${tableName}"
    `;

    const result = await client.query(query);
    const total = parseInt(result.rows[0].total);
    const nonNull = parseInt(result.rows[0].non_null);
    const completeness = (nonNull / total) * 100;

    if (completeness < threshold) {
      return [{
        columnName,
        currentValue: completeness,
        expectedValue: threshold,
        message: `Completeness ${completeness.toFixed(2)}% is below threshold ${threshold}%`,
      }];
    }

    return [];
  }

  private async validateUniqueness(
    client: any,
    tableName: string,
    rule: QualityRule,
    maxViolations: number
  ): Promise<Violation[]> {
    const columnName = rule.condition.value;

    const query = `
      SELECT "${columnName}", COUNT(*) as count
      FROM "${tableName}"
      WHERE "${columnName}" IS NOT NULL
      GROUP BY "${columnName}"
      HAVING COUNT(*) > 1
      LIMIT ${maxViolations}
    `;

    const result = await client.query(query);
    return result.rows.map((row: any) => ({
      columnName,
      currentValue: row[columnName],
      message: `Duplicate value "${row[columnName]}" found ${row.count} times`,
    }));
  }

  private async validateValidity(
    client: any,
    tableName: string,
    rule: QualityRule,
    maxViolations: number
  ): Promise<Violation[]> {
    const columnName = rule.condition.value;
    const validValues = rule.condition.value;

    if (!Array.isArray(validValues)) {
      return [];
    }

    const query = `
      SELECT "${columnName}"
      FROM "${tableName}"
      WHERE "${columnName}" IS NOT NULL
        AND "${columnName}" NOT IN (${validValues.map((v: any, i: number) => `$${i + 1}`).join(', ')})
      LIMIT ${maxViolations}
    `;

    const result = await client.query(query, validValues);
    return result.rows.map((row: any) => ({
      columnName,
      currentValue: row[columnName],
      message: `Invalid value "${row[columnName]}" not in allowed values`,
    }));
  }

  private async validateConsistency(
    client: any,
    tableName: string,
    rule: QualityRule,
    maxViolations: number
  ): Promise<Violation[]> {
    // Cross-field consistency validation
    const { value } = rule.condition;
    if (!value || !value.columns || value.columns.length < 2) {
      return [];
    }

    const [col1, col2] = value.columns;
    const query = `
      SELECT *
      FROM "${tableName}"
      WHERE "${col1}" IS NOT NULL
        AND "${col2}" IS NOT NULL
        AND "${col1}" != "${col2}"
      LIMIT ${maxViolations}
    `;

    const result = await client.query(query);
    return result.rows.map((row: any) => ({
      columnName: `${col1}, ${col2}`,
      currentValue: { [col1]: row[col1], [col2]: row[col2] },
      message: `Inconsistent values between ${col1} and ${col2}`,
    }));
  }

  private async validateReferentialIntegrity(
    client: any,
    tableName: string,
    rule: QualityRule,
    maxViolations: number
  ): Promise<Violation[]> {
    const { value } = rule.condition;
    const foreignKey = value.foreignKey;
    const referenceTable = value.referenceTable;
    const referenceKey = value.referenceKey;

    const query = `
      SELECT t."${foreignKey}"
      FROM "${tableName}" t
      LEFT JOIN "${referenceTable}" r ON t."${foreignKey}" = r."${referenceKey}"
      WHERE t."${foreignKey}" IS NOT NULL
        AND r."${referenceKey}" IS NULL
      LIMIT ${maxViolations}
    `;

    const result = await client.query(query);
    return result.rows.map((row: any) => ({
      columnName: foreignKey,
      currentValue: row[foreignKey],
      message: `Foreign key "${row[foreignKey]}" does not exist in ${referenceTable}.${referenceKey}`,
    }));
  }

  private async validateRange(
    client: any,
    tableName: string,
    rule: QualityRule,
    maxViolations: number
  ): Promise<Violation[]> {
    const columnName = rule.condition.value.column;
    const min = rule.condition.value.min;
    const max = rule.condition.value.max;

    const query = `
      SELECT "${columnName}"
      FROM "${tableName}"
      WHERE "${columnName}" IS NOT NULL
        AND ("${columnName}" < ${min} OR "${columnName}" > ${max})
      LIMIT ${maxViolations}
    `;

    const result = await client.query(query);
    return result.rows.map((row: any) => ({
      columnName,
      currentValue: row[columnName],
      expectedValue: `${min} - ${max}`,
      message: `Value ${row[columnName]} is outside valid range [${min}, ${max}]`,
    }));
  }

  private async validatePattern(
    client: any,
    tableName: string,
    rule: QualityRule,
    maxViolations: number
  ): Promise<Violation[]> {
    const columnName = rule.condition.value.column;
    const pattern = rule.condition.value.pattern;

    const query = `
      SELECT "${columnName}"
      FROM "${tableName}"
      WHERE "${columnName}" IS NOT NULL
        AND "${columnName}" !~ $1
      LIMIT ${maxViolations}
    `;

    const result = await client.query(query, [pattern]);
    return result.rows.map((row: any) => ({
      columnName,
      currentValue: row[columnName],
      message: `Value "${row[columnName]}" does not match pattern ${pattern}`,
    }));
  }

  private async validateCustom(
    client: any,
    tableName: string,
    rule: QualityRule,
    maxViolations: number
  ): Promise<Violation[]> {
    // Custom validation logic would be implemented here
    // This would execute custom SQL or call custom validation functions
    return [];
  }

  /**
   * Get all registered rules
   */
  getRules(): QualityRule[] {
    return Array.from(this.rules.values());
  }

  /**
   * Remove a rule
   */
  removeRule(ruleId: string): boolean {
    return this.rules.delete(ruleId);
  }

  /**
   * Clear all rules
   */
  clearRules(): void {
    this.rules.clear();
  }
}

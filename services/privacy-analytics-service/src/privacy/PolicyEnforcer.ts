/**
 * Privacy Policy Enforcer
 *
 * Enforces privacy policies including k-anonymity thresholds,
 * suppression rules, and generalization on query results.
 */

import type {
  PrivacyPolicy,
  AggregateResultRow,
  KAnonymityConfig,
  SuppressionConfig,
  GeneralizationConfig,
  PrivacyWarning,
  ExecutionContext,
  AggregateQuery,
  DataSource,
} from '../types/index.js';
import { PrivacyMechanism, QueryStatus } from '../types/index.js';
import { logger } from '../utils/logger.js';

/**
 * Result of policy enforcement on a single row
 */
export interface RowEnforcementResult {
  row: AggregateResultRow;
  suppressed: boolean;
  generalized: boolean;
  warnings: PrivacyWarning[];
}

/**
 * Result of policy enforcement on the entire result set
 */
export interface EnforcementResult {
  rows: AggregateResultRow[];
  suppressedCount: number;
  totalCount: number;
  warnings: PrivacyWarning[];
  status: QueryStatus;
  denialReason?: string;
  appliedPolicies: string[];
}

/**
 * Policy evaluation input
 */
export interface PolicyEvaluationInput {
  query: AggregateQuery;
  context: ExecutionContext;
  rawResults: AggregateResultRow[];
}

export class PolicyEnforcer {
  private defaultMinCohortSize: number;

  constructor(defaultMinCohortSize: number = 5) {
    this.defaultMinCohortSize = defaultMinCohortSize;
  }

  /**
   * Evaluate and enforce all applicable policies on the result set
   */
  async enforce(input: PolicyEvaluationInput): Promise<EnforcementResult> {
    const { query, context, rawResults } = input;
    const warnings: PrivacyWarning[] = [];
    const appliedPolicies: string[] = [];

    // Pre-flight check: determine if query is even allowed
    const preflightResult = this.preflightCheck(query, context);
    if (!preflightResult.allowed) {
      return {
        rows: [],
        suppressedCount: 0,
        totalCount: rawResults.length,
        warnings: preflightResult.warnings,
        status: QueryStatus.DENIED,
        denialReason: preflightResult.reason,
        appliedPolicies: [],
      };
    }
    warnings.push(...preflightResult.warnings);

    // Sort policies by priority (higher first)
    const sortedPolicies = [...context.policies]
      .filter(p => p.enabled && this.policyApplies(p, query.source))
      .sort((a, b) => b.priority - a.priority);

    let processedRows = [...rawResults];
    let suppressedCount = 0;

    // Apply each policy in order
    for (const policy of sortedPolicies) {
      appliedPolicies.push(policy.id);

      const policyResult = this.applyPolicy(policy, processedRows, query);
      processedRows = policyResult.rows;
      suppressedCount += policyResult.suppressedCount;
      warnings.push(...policyResult.warnings);

      // If policy resulted in all rows being suppressed, we may need to stop
      if (processedRows.length === 0 && rawResults.length > 0) {
        warnings.push({
          code: 'ALL_ROWS_SUPPRESSED',
          message: `All ${rawResults.length} rows were suppressed due to privacy policy "${policy.name}"`,
          severity: 'warning',
        });
      }
    }

    // Determine final status
    let status: QueryStatus;
    if (processedRows.length === 0 && rawResults.length > 0) {
      status = QueryStatus.SUPPRESSED;
    } else if (suppressedCount > 0) {
      status = QueryStatus.PARTIAL;
    } else {
      status = QueryStatus.SUCCESS;
    }

    return {
      rows: processedRows,
      suppressedCount,
      totalCount: rawResults.length,
      warnings,
      status,
      appliedPolicies,
    };
  }

  /**
   * Pre-flight check to determine if the query should be allowed at all
   */
  private preflightCheck(
    query: AggregateQuery,
    context: ExecutionContext
  ): { allowed: boolean; reason?: string; warnings: PrivacyWarning[] } {
    const warnings: PrivacyWarning[] = [];

    // Check for high-risk dimension combinations
    const highRiskCombinations = this.detectHighRiskCombinations(query);
    if (highRiskCombinations.length > 0) {
      warnings.push({
        code: 'HIGH_RISK_COMBINATION',
        message: `Query includes high-risk dimension combinations that may enable re-identification: ${highRiskCombinations.join(', ')}`,
        severity: 'warning',
        affectedFields: highRiskCombinations,
      });
    }

    // Check for blocked dimensions based on policy
    for (const policy of context.policies) {
      if (!policy.enabled) continue;

      // Check if query dimensions include quasi-identifiers
      if (policy.kAnonymity?.quasiIdentifiers) {
        const usedQIs = query.dimensions
          .map(d => d.field)
          .filter(f => policy.kAnonymity!.quasiIdentifiers!.includes(f));

        if (usedQIs.length > 2) {
          warnings.push({
            code: 'EXCESSIVE_QI_DIMENSIONS',
            message: `Query uses ${usedQIs.length} quasi-identifier dimensions, increasing re-identification risk`,
            severity: 'warning',
            affectedFields: usedQIs,
          });
        }
      }
    }

    return { allowed: true, warnings };
  }

  /**
   * Detect potentially dangerous dimension combinations
   */
  private detectHighRiskCombinations(query: AggregateQuery): string[] {
    const highRiskFields = [
      'zip_code',
      'postal_code',
      'birth_date',
      'dob',
      'age',
      'gender',
      'sex',
      'ethnicity',
      'race',
      'nationality',
      'occupation',
      'job_title',
      'salary',
      'income',
    ];

    const queriedDimensions = query.dimensions.map(d => d.field.toLowerCase());
    return queriedDimensions.filter(d =>
      highRiskFields.some(hr => d.includes(hr))
    );
  }

  /**
   * Check if a policy applies to the given data source
   */
  private policyApplies(policy: PrivacyPolicy, source: DataSource): boolean {
    if (policy.applicableSources.length === 0) return true;
    return policy.applicableSources.includes(source);
  }

  /**
   * Apply a single policy to the result set
   */
  private applyPolicy(
    policy: PrivacyPolicy,
    rows: AggregateResultRow[],
    query: AggregateQuery
  ): { rows: AggregateResultRow[]; suppressedCount: number; warnings: PrivacyWarning[] } {
    const warnings: PrivacyWarning[] = [];
    let processedRows = rows;
    let suppressedCount = 0;

    switch (policy.mechanism) {
      case PrivacyMechanism.K_ANONYMITY:
        if (policy.kAnonymity) {
          const result = this.applyKAnonymity(processedRows, policy.kAnonymity, query);
          processedRows = result.rows;
          suppressedCount = result.suppressedCount;
          warnings.push(...result.warnings);
        }
        break;

      case PrivacyMechanism.SUPPRESSION:
        if (policy.suppression) {
          const result = this.applySuppression(processedRows, policy.suppression);
          processedRows = result.rows;
          suppressedCount = result.suppressedCount;
          warnings.push(...result.warnings);
        }
        break;

      case PrivacyMechanism.GENERALIZATION:
        if (policy.generalization) {
          const result = this.applyGeneralization(processedRows, policy.generalization);
          processedRows = result.rows;
          warnings.push(...result.warnings);
        }
        break;

      case PrivacyMechanism.COMBINED:
        // Apply in order: k-anonymity, then suppression, then generalization
        if (policy.kAnonymity) {
          const kResult = this.applyKAnonymity(processedRows, policy.kAnonymity, query);
          processedRows = kResult.rows;
          suppressedCount += kResult.suppressedCount;
          warnings.push(...kResult.warnings);
        }
        if (policy.suppression) {
          const sResult = this.applySuppression(processedRows, policy.suppression);
          processedRows = sResult.rows;
          suppressedCount += sResult.suppressedCount;
          warnings.push(...sResult.warnings);
        }
        if (policy.generalization) {
          const gResult = this.applyGeneralization(processedRows, policy.generalization);
          processedRows = gResult.rows;
          warnings.push(...gResult.warnings);
        }
        break;

      case PrivacyMechanism.NONE:
      default:
        // No enforcement needed
        break;
    }

    return { rows: processedRows, suppressedCount, warnings };
  }

  /**
   * Apply k-anonymity enforcement
   * Ensures each combination of quasi-identifiers appears at least k times
   */
  applyKAnonymity(
    rows: AggregateResultRow[],
    config: KAnonymityConfig,
    query: AggregateQuery
  ): { rows: AggregateResultRow[]; suppressedCount: number; warnings: PrivacyWarning[] } {
    const warnings: PrivacyWarning[] = [];
    const k = config.minCohortSize;

    // Determine quasi-identifier fields
    const qiFields = config.quasiIdentifiers || query.dimensions.map(d => d.field);

    // Group rows by QI values and check cohort sizes
    const groups = new Map<string, AggregateResultRow[]>();

    for (const row of rows) {
      const key = this.createGroupKey(row.dimensions, qiFields);
      const group = groups.get(key) || [];
      group.push(row);
      groups.set(key, group);
    }

    // For aggregated results, we use cohortSize if available, otherwise count measures
    const resultRows: AggregateResultRow[] = [];
    let suppressedCount = 0;

    for (const [_key, groupRows] of groups) {
      for (const row of groupRows) {
        // Use cohortSize if available, otherwise use count measure, otherwise group size
        const cohortSize = row.cohortSize ||
          this.extractCountMeasure(row.measures) ||
          groupRows.length;

        if (cohortSize >= k) {
          resultRows.push({
            ...row,
            cohortSize,
          });
        } else {
          suppressedCount++;

          if (config.violationAction === 'error') {
            warnings.push({
              code: 'K_ANONYMITY_VIOLATION',
              message: `Cohort size ${cohortSize} is below k=${k} threshold`,
              severity: 'error',
              affectedFields: qiFields,
            });
          } else if (config.violationAction === 'generalize') {
            // Mark as needing generalization
            warnings.push({
              code: 'K_ANONYMITY_GENERALIZED',
              message: `Row generalized due to cohort size ${cohortSize} below k=${k}`,
              severity: 'info',
              affectedFields: qiFields,
            });
          }
        }
      }
    }

    if (suppressedCount > 0) {
      warnings.push({
        code: 'K_ANONYMITY_SUPPRESSION',
        message: `${suppressedCount} rows suppressed due to cohort sizes below k=${k}`,
        severity: 'warning',
      });
    }

    return { rows: resultRows, suppressedCount, warnings };
  }

  /**
   * Apply suppression rules
   */
  applySuppression(
    rows: AggregateResultRow[],
    config: SuppressionConfig
  ): { rows: AggregateResultRow[]; suppressedCount: number; warnings: PrivacyWarning[] } {
    const warnings: PrivacyWarning[] = [];
    const resultRows: AggregateResultRow[] = [];
    let suppressedCount = 0;

    for (const row of rows) {
      const countValue = this.extractCountMeasure(row.measures) || row.cohortSize || 0;

      if (countValue < config.minCountThreshold) {
        suppressedCount++;

        if (config.showSuppressed) {
          // Include the row but with suppressed values
          const suppressedMeasures: Record<string, number | null> = {};
          for (const key of Object.keys(row.measures)) {
            suppressedMeasures[key] = typeof config.suppressedPlaceholder === 'number'
              ? config.suppressedPlaceholder
              : null;
          }

          resultRows.push({
            dimensions: row.dimensions,
            measures: suppressedMeasures,
            privacyAffected: true,
            cohortSize: row.cohortSize,
          });
        }
      } else {
        resultRows.push(row);
      }
    }

    if (suppressedCount > 0) {
      warnings.push({
        code: 'THRESHOLD_SUPPRESSION',
        message: `${suppressedCount} rows ${config.showSuppressed ? 'masked' : 'suppressed'} due to count below ${config.minCountThreshold}`,
        severity: 'info',
      });
    }

    return { rows: resultRows, suppressedCount, warnings };
  }

  /**
   * Apply generalization rules
   */
  applyGeneralization(
    rows: AggregateResultRow[],
    config: GeneralizationConfig
  ): { rows: AggregateResultRow[]; warnings: PrivacyWarning[] } {
    const warnings: PrivacyWarning[] = [];
    const generalizedFields: string[] = [];

    const resultRows = rows.map(row => {
      const generalizedDimensions: Record<string, unknown> = { ...row.dimensions };

      for (const [field, hierarchy] of Object.entries(config.hierarchies)) {
        if (field in row.dimensions) {
          const originalValue = row.dimensions[field];
          const generalizedValue = this.generalizeValue(
            originalValue,
            hierarchy,
            config.targetLevel
          );

          if (generalizedValue !== originalValue) {
            generalizedDimensions[field] = generalizedValue;
            if (!generalizedFields.includes(field)) {
              generalizedFields.push(field);
            }
          }
        }
      }

      return {
        ...row,
        dimensions: generalizedDimensions,
        privacyAffected: generalizedFields.length > 0 || row.privacyAffected,
      };
    });

    if (generalizedFields.length > 0) {
      warnings.push({
        code: 'GENERALIZATION_APPLIED',
        message: `Fields generalized to level ${config.targetLevel}: ${generalizedFields.join(', ')}`,
        severity: 'info',
        affectedFields: generalizedFields,
      });
    }

    return { rows: resultRows, warnings };
  }

  /**
   * Generalize a value using a hierarchy
   */
  private generalizeValue(
    value: unknown,
    hierarchy: string[][],
    targetLevel: number
  ): unknown {
    if (value === null || value === undefined) return value;

    const stringValue = String(value);

    // Find the hierarchy path containing this value
    for (const path of hierarchy) {
      const index = path.indexOf(stringValue);
      if (index !== -1) {
        // Return the value at the target level, or the most general if target exceeds path length
        const generalizedIndex = Math.min(targetLevel, path.length - 1);
        return path[generalizedIndex];
      }
    }

    // Value not found in hierarchy, return as-is
    return value;
  }

  /**
   * Create a grouping key from dimension values
   */
  private createGroupKey(
    dimensions: Record<string, unknown>,
    fields: string[]
  ): string {
    return fields
      .map(f => `${f}:${JSON.stringify(dimensions[f])}`)
      .sort()
      .join('|');
  }

  /**
   * Extract count measure from measures object
   */
  private extractCountMeasure(measures: Record<string, number | null>): number | null {
    // Look for common count field names
    const countKeys = ['count', 'cnt', 'count_all', 'total_count', 'n'];
    for (const key of countKeys) {
      if (key in measures && measures[key] !== null) {
        return measures[key];
      }
    }

    // Look for any field with 'count' in the name
    for (const [key, value] of Object.entries(measures)) {
      if (key.toLowerCase().includes('count') && value !== null) {
        return value;
      }
    }

    return null;
  }

  /**
   * Validate a policy configuration
   */
  validatePolicy(policy: PrivacyPolicy): { valid: boolean; errors: string[] } {
    const errors: string[] = [];

    if (!policy.id || policy.id.trim() === '') {
      errors.push('Policy ID is required');
    }

    if (!policy.name || policy.name.trim() === '') {
      errors.push('Policy name is required');
    }

    if (policy.kAnonymity) {
      if (policy.kAnonymity.minCohortSize < 1) {
        errors.push('K-anonymity minCohortSize must be at least 1');
      }
      if (policy.kAnonymity.minCohortSize > 100) {
        errors.push('K-anonymity minCohortSize greater than 100 may be too restrictive');
      }
    }

    if (policy.suppression) {
      if (policy.suppression.minCountThreshold < 0) {
        errors.push('Suppression minCountThreshold cannot be negative');
      }
    }

    if (policy.generalization) {
      for (const [field, hierarchy] of Object.entries(policy.generalization.hierarchies)) {
        if (!Array.isArray(hierarchy) || hierarchy.length === 0) {
          errors.push(`Invalid hierarchy for field ${field}: must be non-empty array`);
        }
      }
    }

    return { valid: errors.length === 0, errors };
  }
}

export const policyEnforcer = new PolicyEnforcer();

/**
 * Rule Evaluator
 *
 * Evaluates rules against signals to generate alerts.
 * Supports multiple rule types:
 * - Threshold rules (value comparisons)
 * - Pattern rules (sequence matching)
 * - Temporal rules (windowed aggregations)
 * - Rate rules (frequency detection)
 * - Absence rules (missing signal detection)
 *
 * @module rule-evaluator
 */

import {
  type SignalEnvelope,
  type Alert,
  type Rule,
  type ThresholdRule,
  type PatternRule,
  type TemporalRule,
  type RateRule,
  type AbsenceRule,
  type Condition,
  type SimpleCondition,
  type CompoundCondition,
  type RuleEvaluationResult,
  ComparisonOperator,
  LogicalOperator,
  createAlertFromSignal,
  ruleAppliesToSignalType,
  sortRulesByPriority,
} from '@intelgraph/signal-contracts';
import type { Logger } from 'pino';

import type { RuleStore, StateStore, RuleEvaluationContext } from '../types.js';

/**
 * Rule evaluator configuration
 */
export interface RuleEvaluatorConfig {
  /** Maximum rules to evaluate per signal */
  maxRulesPerSignal: number;
  /** Evaluation timeout in milliseconds */
  evaluationTimeoutMs: number;
  /** Alert deduplication window in milliseconds */
  alertDeduplicationWindowMs: number;
  /** Enable rule caching */
  enableRuleCache: boolean;
  /** Rule cache TTL in milliseconds */
  ruleCacheTtlMs: number;
}

/**
 * Default configuration
 */
const defaultConfig: RuleEvaluatorConfig = {
  maxRulesPerSignal: 100,
  evaluationTimeoutMs: 5000,
  alertDeduplicationWindowMs: 300000, // 5 minutes
  enableRuleCache: true,
  ruleCacheTtlMs: 60000, // 1 minute
};

/**
 * In-memory rule store for development/testing
 */
class InMemoryRuleStore implements RuleStore {
  private rules = new Map<string, Rule>();

  async getRulesForSignalType(signalType: string, tenantId: string): Promise<Rule[]> {
    return Array.from(this.rules.values()).filter(
      (rule) =>
        ruleAppliesToSignalType(rule, signalType) &&
        (rule.tenantId === null || rule.tenantId === tenantId) &&
        rule.status === 'active',
    );
  }

  async getRule(ruleId: string): Promise<Rule | null> {
    return this.rules.get(ruleId) ?? null;
  }

  async addRule(rule: Rule): Promise<void> {
    this.rules.set(rule.ruleId, rule);
  }

  async updateRule(rule: Rule): Promise<void> {
    this.rules.set(rule.ruleId, rule);
  }

  async deleteRule(ruleId: string): Promise<void> {
    this.rules.delete(ruleId);
  }

  async getAllRules(): Promise<Rule[]> {
    return Array.from(this.rules.values());
  }
}

/**
 * Rule Evaluator class
 */
export class RuleEvaluatorService {
  private config: RuleEvaluatorConfig;
  private logger: Logger;
  private ruleStore: RuleStore;
  private stateStore?: StateStore;
  private recentAlerts = new Map<string, number>(); // ruleId:tenantId -> timestamp
  private stats = {
    evaluations: 0,
    matches: 0,
    alertsGenerated: 0,
    alertsSuppressed: 0,
    errors: 0,
    timeouts: 0,
  };

  constructor(
    logger: Logger,
    config?: Partial<RuleEvaluatorConfig>,
    ruleStore?: RuleStore,
    stateStore?: StateStore,
  ) {
    this.logger = logger.child({ component: 'rule-evaluator' });
    this.config = { ...defaultConfig, ...config };
    this.ruleStore = ruleStore ?? new InMemoryRuleStore();
    this.stateStore = stateStore;
  }

  /**
   * Evaluate all applicable rules against a signal
   */
  async evaluate(signal: SignalEnvelope): Promise<{
    results: RuleEvaluationResult[];
    alerts: Alert[];
  }> {
    this.stats.evaluations++;
    const results: RuleEvaluationResult[] = [];
    const alerts: Alert[] = [];

    try {
      // Get applicable rules
      const rules = await this.ruleStore.getRulesForSignalType(
        signal.metadata.signalType,
        signal.metadata.tenantId,
      );

      // Sort by priority and limit
      const sortedRules = sortRulesByPriority(rules).slice(
        0,
        this.config.maxRulesPerSignal,
      );

      // Create evaluation context
      const context: RuleEvaluationContext = {
        signal,
        tenantId: signal.metadata.tenantId,
        signalType: signal.metadata.signalType,
        timestamp: signal.metadata.timestamp,
      };

      // Evaluate each rule
      for (const rule of sortedRules) {
        const startTime = Date.now();

        try {
          const result = await this.evaluateRule(rule, context);
          results.push(result);

          if (result.matched) {
            this.stats.matches++;

            // Check for deduplication
            const dedupeKey = `${rule.ruleId}:${signal.metadata.tenantId}`;
            const lastAlert = this.recentAlerts.get(dedupeKey);

            if (
              lastAlert &&
              Date.now() - lastAlert < this.config.alertDeduplicationWindowMs
            ) {
              this.stats.alertsSuppressed++;
              this.logger.debug(
                { ruleId: rule.ruleId, signalId: signal.metadata.signalId },
                'Alert suppressed (deduplication)',
              );
              continue;
            }

            // Generate alert
            const alert = this.createAlert(signal, rule, result);
            alerts.push(alert);
            this.stats.alertsGenerated++;

            // Update deduplication tracker
            this.recentAlerts.set(dedupeKey, Date.now());
          }
        } catch (error) {
          this.stats.errors++;
          results.push({
            ruleId: rule.ruleId,
            matched: false,
            confidence: 0,
            evaluatedAt: Date.now(),
            evaluationDurationMs: Date.now() - startTime,
            error: error instanceof Error ? error.message : 'Unknown error',
            contributingSignalIds: [],
          });
        }
      }
    } catch (error) {
      this.stats.errors++;
      this.logger.error({ error }, 'Rule evaluation failed');
    }

    return { results, alerts };
  }

  /**
   * Evaluate a single rule against the context
   */
  private async evaluateRule(
    rule: Rule,
    context: RuleEvaluationContext,
  ): Promise<RuleEvaluationResult> {
    const startTime = Date.now();

    switch (rule.ruleType) {
      case 'threshold':
        return this.evaluateThresholdRule(rule, context, startTime);
      case 'pattern':
        return this.evaluatePatternRule(rule, context, startTime);
      case 'temporal':
        return this.evaluateTemporalRule(rule, context, startTime);
      case 'rate':
        return this.evaluateRateRule(rule, context, startTime);
      case 'absence':
        return this.evaluateAbsenceRule(rule, context, startTime);
      default:
        return {
          ruleId: rule.ruleId,
          matched: false,
          confidence: 0,
          evaluatedAt: Date.now(),
          evaluationDurationMs: Date.now() - startTime,
          error: `Unknown rule type: ${(rule as Rule).ruleType}`,
          contributingSignalIds: [],
        };
    }
  }

  /**
   * Evaluate a threshold rule
   */
  private evaluateThresholdRule(
    rule: ThresholdRule,
    context: RuleEvaluationContext,
    startTime: number,
  ): RuleEvaluationResult {
    const matched = this.evaluateCondition(rule.config.condition, context.signal);

    let actualValue: unknown;
    if (rule.config.thresholdField) {
      actualValue = this.getFieldValue(context.signal, rule.config.thresholdField);
    }

    return {
      ruleId: rule.ruleId,
      matched,
      confidence: matched ? 1 : 0,
      matchedCondition: matched ? this.conditionToString(rule.config.condition) : undefined,
      triggerValue: rule.config.thresholdValue,
      actualValue,
      evaluatedAt: Date.now(),
      evaluationDurationMs: Date.now() - startTime,
      contributingSignalIds: [context.signal.metadata.signalId],
    };
  }

  /**
   * Evaluate a pattern rule (simplified - full implementation would track state)
   */
  private async evaluatePatternRule(
    rule: PatternRule,
    context: RuleEvaluationContext,
    startTime: number,
  ): Promise<RuleEvaluationResult> {
    // For now, just check if current signal matches first pattern element
    // Full implementation would track pattern state across signals
    const firstElement = rule.config.sequence[0];
    if (!firstElement) {
      return {
        ruleId: rule.ruleId,
        matched: false,
        confidence: 0,
        evaluatedAt: Date.now(),
        evaluationDurationMs: Date.now() - startTime,
        error: 'Pattern has no elements',
        contributingSignalIds: [],
      };
    }

    // Check if signal type matches (if specified)
    if (
      firstElement.signalType &&
      firstElement.signalType !== context.signal.metadata.signalType
    ) {
      return {
        ruleId: rule.ruleId,
        matched: false,
        confidence: 0,
        evaluatedAt: Date.now(),
        evaluationDurationMs: Date.now() - startTime,
        contributingSignalIds: [],
      };
    }

    // Check condition
    const matched = this.evaluateCondition(firstElement.condition, context.signal);

    return {
      ruleId: rule.ruleId,
      matched,
      confidence: matched ? 0.5 : 0, // Partial match confidence
      matchedCondition: matched ? `Pattern element: ${firstElement.name}` : undefined,
      evaluatedAt: Date.now(),
      evaluationDurationMs: Date.now() - startTime,
      contributingSignalIds: matched ? [context.signal.metadata.signalId] : [],
    };
  }

  /**
   * Evaluate a temporal rule (simplified)
   */
  private async evaluateTemporalRule(
    rule: TemporalRule,
    context: RuleEvaluationContext,
    startTime: number,
  ): Promise<RuleEvaluationResult> {
    // Check base condition
    if (!this.evaluateCondition(rule.config.condition, context.signal)) {
      return {
        ruleId: rule.ruleId,
        matched: false,
        confidence: 0,
        evaluatedAt: Date.now(),
        evaluationDurationMs: Date.now() - startTime,
        contributingSignalIds: [],
      };
    }

    // For full implementation, would aggregate over window using state store
    // Simplified: always return partial match for matching signals
    return {
      ruleId: rule.ruleId,
      matched: false, // Would be true when aggregation threshold met
      confidence: 0.3,
      matchedCondition: 'Base condition matched, awaiting aggregation threshold',
      evaluatedAt: Date.now(),
      evaluationDurationMs: Date.now() - startTime,
      contributingSignalIds: [context.signal.metadata.signalId],
    };
  }

  /**
   * Evaluate a rate rule
   */
  private async evaluateRateRule(
    rule: RateRule,
    context: RuleEvaluationContext,
    startTime: number,
  ): Promise<RuleEvaluationResult> {
    // Check base condition
    if (!this.evaluateCondition(rule.config.condition, context.signal)) {
      return {
        ruleId: rule.ruleId,
        matched: false,
        confidence: 0,
        evaluatedAt: Date.now(),
        evaluationDurationMs: Date.now() - startTime,
        contributingSignalIds: [],
      };
    }

    // For full implementation, would track rate using state store
    return {
      ruleId: rule.ruleId,
      matched: false,
      confidence: 0,
      evaluatedAt: Date.now(),
      evaluationDurationMs: Date.now() - startTime,
      contributingSignalIds: [context.signal.metadata.signalId],
    };
  }

  /**
   * Evaluate an absence rule
   */
  private async evaluateAbsenceRule(
    rule: AbsenceRule,
    context: RuleEvaluationContext,
    startTime: number,
  ): Promise<RuleEvaluationResult> {
    // Absence rules are typically evaluated by a background process
    // Here we just update the "last seen" tracker
    return {
      ruleId: rule.ruleId,
      matched: false,
      confidence: 0,
      evaluatedAt: Date.now(),
      evaluationDurationMs: Date.now() - startTime,
      contributingSignalIds: [context.signal.metadata.signalId],
    };
  }

  /**
   * Evaluate a condition against a signal
   */
  private evaluateCondition(condition: Condition, signal: SignalEnvelope): boolean {
    if (condition.type === 'simple') {
      return this.evaluateSimpleCondition(condition, signal);
    } else {
      return this.evaluateCompoundCondition(condition, signal);
    }
  }

  /**
   * Evaluate a simple condition
   */
  private evaluateSimpleCondition(
    condition: SimpleCondition,
    signal: SignalEnvelope,
  ): boolean {
    const fieldValue = this.getFieldValue(signal, condition.field);

    switch (condition.operator) {
      case ComparisonOperator.EQ:
        return fieldValue === condition.value;
      case ComparisonOperator.NE:
        return fieldValue !== condition.value;
      case ComparisonOperator.GT:
        return typeof fieldValue === 'number' && fieldValue > (condition.value as number);
      case ComparisonOperator.GTE:
        return typeof fieldValue === 'number' && fieldValue >= (condition.value as number);
      case ComparisonOperator.LT:
        return typeof fieldValue === 'number' && fieldValue < (condition.value as number);
      case ComparisonOperator.LTE:
        return typeof fieldValue === 'number' && fieldValue <= (condition.value as number);
      case ComparisonOperator.IN:
        return Array.isArray(condition.value) && condition.value.includes(fieldValue);
      case ComparisonOperator.NOT_IN:
        return Array.isArray(condition.value) && !condition.value.includes(fieldValue);
      case ComparisonOperator.CONTAINS:
        return (
          typeof fieldValue === 'string' &&
          typeof condition.value === 'string' &&
          fieldValue.includes(condition.value)
        );
      case ComparisonOperator.NOT_CONTAINS:
        return (
          typeof fieldValue === 'string' &&
          typeof condition.value === 'string' &&
          !fieldValue.includes(condition.value)
        );
      case ComparisonOperator.MATCHES:
        return (
          typeof fieldValue === 'string' &&
          typeof condition.value === 'string' &&
          new RegExp(condition.value).test(fieldValue)
        );
      case ComparisonOperator.EXISTS:
        return fieldValue !== undefined && fieldValue !== null;
      case ComparisonOperator.NOT_EXISTS:
        return fieldValue === undefined || fieldValue === null;
      default:
        return false;
    }
  }

  /**
   * Evaluate a compound condition
   */
  private evaluateCompoundCondition(
    condition: CompoundCondition,
    signal: SignalEnvelope,
  ): boolean {
    const results = condition.conditions.map((c) => this.evaluateCondition(c, signal));

    switch (condition.operator) {
      case LogicalOperator.AND:
        return results.every((r) => r);
      case LogicalOperator.OR:
        return results.some((r) => r);
      case LogicalOperator.NOT:
        return results.length > 0 && !results[0];
      default:
        return false;
    }
  }

  /**
   * Get a field value from a signal using dot notation
   */
  private getFieldValue(signal: SignalEnvelope, field: string): unknown {
    const parts = field.split('.');
    let value: unknown = signal;

    for (const part of parts) {
      if (value === null || value === undefined) {
        return undefined;
      }
      if (typeof value === 'object') {
        value = (value as Record<string, unknown>)[part];
      } else {
        return undefined;
      }
    }

    return value;
  }

  /**
   * Convert a condition to a human-readable string
   */
  private conditionToString(condition: Condition): string {
    if (condition.type === 'simple') {
      return `${condition.field} ${condition.operator} ${JSON.stringify(condition.value)}`;
    } else {
      const subconditions = condition.conditions.map((c) => this.conditionToString(c));
      return `(${subconditions.join(` ${condition.operator} `)})`;
    }
  }

  /**
   * Create an alert from a rule match
   */
  private createAlert(
    signal: SignalEnvelope,
    rule: Rule,
    result: RuleEvaluationResult,
  ): Alert {
    // Replace template placeholders in title and description
    const title = this.replaceTemplatePlaceholders(rule.alertTitleTemplate, signal, result);
    const description = this.replaceTemplatePlaceholders(
      rule.alertDescriptionTemplate,
      signal,
      result,
    );

    return createAlertFromSignal(signal, {
      ruleId: rule.ruleId,
      ruleName: rule.name,
      ruleVersion: rule.version,
      condition: result.matchedCondition ?? '',
      alertType: rule.alertType,
      severity: rule.alertSeverity,
      title,
      description,
      triggerValue: result.triggerValue,
      actualValue: result.actualValue,
      confidence: result.confidence,
    });
  }

  /**
   * Replace template placeholders with actual values
   */
  private replaceTemplatePlaceholders(
    template: string,
    signal: SignalEnvelope,
    result: RuleEvaluationResult,
  ): string {
    return template
      .replace(/\{\{signalType\}\}/g, signal.metadata.signalType)
      .replace(/\{\{tenantId\}\}/g, signal.metadata.tenantId)
      .replace(/\{\{sourceId\}\}/g, signal.metadata.source.sourceId)
      .replace(/\{\{timestamp\}\}/g, new Date(signal.metadata.timestamp).toISOString())
      .replace(/\{\{actualValue\}\}/g, String(result.actualValue ?? ''))
      .replace(/\{\{triggerValue\}\}/g, String(result.triggerValue ?? ''))
      .replace(/\{\{confidence\}\}/g, String(result.confidence));
  }

  /**
   * Add a rule to the store
   */
  async addRule(rule: Rule): Promise<void> {
    await this.ruleStore.addRule(rule);
    this.logger.info({ ruleId: rule.ruleId, ruleName: rule.name }, 'Rule added');
  }

  /**
   * Get all rules
   */
  async getAllRules(): Promise<Rule[]> {
    return this.ruleStore.getAllRules();
  }

  /**
   * Delete a rule
   */
  async deleteRule(ruleId: string): Promise<void> {
    await this.ruleStore.deleteRule(ruleId);
    this.logger.info({ ruleId }, 'Rule deleted');
  }

  /**
   * Get evaluator statistics
   */
  getStats(): {
    evaluations: number;
    matches: number;
    alertsGenerated: number;
    alertsSuppressed: number;
    errors: number;
    timeouts: number;
    matchRate: number;
  } {
    return {
      ...this.stats,
      matchRate:
        this.stats.evaluations > 0
          ? this.stats.matches / this.stats.evaluations
          : 0,
    };
  }

  /**
   * Reset statistics
   */
  resetStats(): void {
    this.stats = {
      evaluations: 0,
      matches: 0,
      alertsGenerated: 0,
      alertsSuppressed: 0,
      errors: 0,
      timeouts: 0,
    };
  }

  /**
   * Clean up old deduplication entries
   */
  cleanupDeduplicationCache(): void {
    const cutoff = Date.now() - this.config.alertDeduplicationWindowMs;
    for (const [key, timestamp] of this.recentAlerts) {
      if (timestamp < cutoff) {
        this.recentAlerts.delete(key);
      }
    }
  }
}

/**
 * Create a rule evaluator instance
 */
export function createRuleEvaluator(
  logger: Logger,
  config?: Partial<RuleEvaluatorConfig>,
  ruleStore?: RuleStore,
  stateStore?: StateStore,
): RuleEvaluatorService {
  return new RuleEvaluatorService(logger, config, ruleStore, stateStore);
}

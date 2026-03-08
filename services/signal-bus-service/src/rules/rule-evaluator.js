"use strict";
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
Object.defineProperty(exports, "__esModule", { value: true });
exports.RuleEvaluatorService = void 0;
exports.createRuleEvaluator = createRuleEvaluator;
const signal_contracts_1 = require("@intelgraph/signal-contracts");
/**
 * Default configuration
 */
const defaultConfig = {
    maxRulesPerSignal: 100,
    evaluationTimeoutMs: 5000,
    alertDeduplicationWindowMs: 300000, // 5 minutes
    enableRuleCache: true,
    ruleCacheTtlMs: 60000, // 1 minute
};
/**
 * In-memory rule store for development/testing
 */
class InMemoryRuleStore {
    rules = new Map();
    async getRulesForSignalType(signalType, tenantId) {
        return Array.from(this.rules.values()).filter((rule) => (0, signal_contracts_1.ruleAppliesToSignalType)(rule, signalType) &&
            (rule.tenantId === null || rule.tenantId === tenantId) &&
            rule.status === 'active');
    }
    async getRule(ruleId) {
        return this.rules.get(ruleId) ?? null;
    }
    async addRule(rule) {
        this.rules.set(rule.ruleId, rule);
    }
    async updateRule(rule) {
        this.rules.set(rule.ruleId, rule);
    }
    async deleteRule(ruleId) {
        this.rules.delete(ruleId);
    }
    async getAllRules() {
        return Array.from(this.rules.values());
    }
}
/**
 * Rule Evaluator class
 */
class RuleEvaluatorService {
    config;
    logger;
    ruleStore;
    stateStore;
    recentAlerts = new Map(); // ruleId:tenantId -> timestamp
    stats = {
        evaluations: 0,
        matches: 0,
        alertsGenerated: 0,
        alertsSuppressed: 0,
        errors: 0,
        timeouts: 0,
    };
    constructor(logger, config, ruleStore, stateStore) {
        this.logger = logger.child({ component: 'rule-evaluator' });
        this.config = { ...defaultConfig, ...config };
        this.ruleStore = ruleStore ?? new InMemoryRuleStore();
        this.stateStore = stateStore;
    }
    /**
     * Evaluate all applicable rules against a signal
     */
    async evaluate(signal) {
        this.stats.evaluations++;
        const results = [];
        const alerts = [];
        try {
            // Get applicable rules
            const rules = await this.ruleStore.getRulesForSignalType(signal.metadata.signalType, signal.metadata.tenantId);
            // Sort by priority and limit
            const sortedRules = (0, signal_contracts_1.sortRulesByPriority)(rules).slice(0, this.config.maxRulesPerSignal);
            // Create evaluation context
            const context = {
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
                        if (lastAlert &&
                            Date.now() - lastAlert < this.config.alertDeduplicationWindowMs) {
                            this.stats.alertsSuppressed++;
                            this.logger.debug({ ruleId: rule.ruleId, signalId: signal.metadata.signalId }, 'Alert suppressed (deduplication)');
                            continue;
                        }
                        // Generate alert
                        const alert = this.createAlert(signal, rule, result);
                        alerts.push(alert);
                        this.stats.alertsGenerated++;
                        // Update deduplication tracker
                        this.recentAlerts.set(dedupeKey, Date.now());
                    }
                }
                catch (error) {
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
        }
        catch (error) {
            this.stats.errors++;
            this.logger.error({ error }, 'Rule evaluation failed');
        }
        return { results, alerts };
    }
    /**
     * Evaluate a single rule against the context
     */
    async evaluateRule(rule, context) {
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
                    error: `Unknown rule type: ${rule.ruleType}`,
                    contributingSignalIds: [],
                };
        }
    }
    /**
     * Evaluate a threshold rule
     */
    evaluateThresholdRule(rule, context, startTime) {
        const matched = this.evaluateCondition(rule.config.condition, context.signal);
        let actualValue;
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
    async evaluatePatternRule(rule, context, startTime) {
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
        if (firstElement.signalType &&
            firstElement.signalType !== context.signal.metadata.signalType) {
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
    async evaluateTemporalRule(rule, context, startTime) {
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
    async evaluateRateRule(rule, context, startTime) {
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
    async evaluateAbsenceRule(rule, context, startTime) {
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
    evaluateCondition(condition, signal) {
        if (condition.type === 'simple') {
            return this.evaluateSimpleCondition(condition, signal);
        }
        else {
            return this.evaluateCompoundCondition(condition, signal);
        }
    }
    /**
     * Evaluate a simple condition
     */
    evaluateSimpleCondition(condition, signal) {
        const fieldValue = this.getFieldValue(signal, condition.field);
        switch (condition.operator) {
            case signal_contracts_1.ComparisonOperator.EQ:
                return fieldValue === condition.value;
            case signal_contracts_1.ComparisonOperator.NE:
                return fieldValue !== condition.value;
            case signal_contracts_1.ComparisonOperator.GT:
                return typeof fieldValue === 'number' && fieldValue > condition.value;
            case signal_contracts_1.ComparisonOperator.GTE:
                return typeof fieldValue === 'number' && fieldValue >= condition.value;
            case signal_contracts_1.ComparisonOperator.LT:
                return typeof fieldValue === 'number' && fieldValue < condition.value;
            case signal_contracts_1.ComparisonOperator.LTE:
                return typeof fieldValue === 'number' && fieldValue <= condition.value;
            case signal_contracts_1.ComparisonOperator.IN:
                return Array.isArray(condition.value) && condition.value.includes(fieldValue);
            case signal_contracts_1.ComparisonOperator.NOT_IN:
                return Array.isArray(condition.value) && !condition.value.includes(fieldValue);
            case signal_contracts_1.ComparisonOperator.CONTAINS:
                return (typeof fieldValue === 'string' &&
                    typeof condition.value === 'string' &&
                    fieldValue.includes(condition.value));
            case signal_contracts_1.ComparisonOperator.NOT_CONTAINS:
                return (typeof fieldValue === 'string' &&
                    typeof condition.value === 'string' &&
                    !fieldValue.includes(condition.value));
            case signal_contracts_1.ComparisonOperator.MATCHES:
                return (typeof fieldValue === 'string' &&
                    typeof condition.value === 'string' &&
                    new RegExp(condition.value).test(fieldValue));
            case signal_contracts_1.ComparisonOperator.EXISTS:
                return fieldValue !== undefined && fieldValue !== null;
            case signal_contracts_1.ComparisonOperator.NOT_EXISTS:
                return fieldValue === undefined || fieldValue === null;
            default:
                return false;
        }
    }
    /**
     * Evaluate a compound condition
     */
    evaluateCompoundCondition(condition, signal) {
        const results = condition.conditions.map((c) => this.evaluateCondition(c, signal));
        switch (condition.operator) {
            case signal_contracts_1.LogicalOperator.AND:
                return results.every((r) => r);
            case signal_contracts_1.LogicalOperator.OR:
                return results.some((r) => r);
            case signal_contracts_1.LogicalOperator.NOT:
                return results.length > 0 && !results[0];
            default:
                return false;
        }
    }
    /**
     * Get a field value from a signal using dot notation
     */
    getFieldValue(signal, field) {
        const parts = field.split('.');
        let value = signal;
        for (const part of parts) {
            if (value === null || value === undefined) {
                return undefined;
            }
            if (typeof value === 'object') {
                value = value[part];
            }
            else {
                return undefined;
            }
        }
        return value;
    }
    /**
     * Convert a condition to a human-readable string
     */
    conditionToString(condition) {
        if (condition.type === 'simple') {
            return `${condition.field} ${condition.operator} ${JSON.stringify(condition.value)}`;
        }
        else {
            const subconditions = condition.conditions.map((c) => this.conditionToString(c));
            return `(${subconditions.join(` ${condition.operator} `)})`;
        }
    }
    /**
     * Create an alert from a rule match
     */
    createAlert(signal, rule, result) {
        // Replace template placeholders in title and description
        const title = this.replaceTemplatePlaceholders(rule.alertTitleTemplate, signal, result);
        const description = this.replaceTemplatePlaceholders(rule.alertDescriptionTemplate, signal, result);
        return (0, signal_contracts_1.createAlertFromSignal)(signal, {
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
    replaceTemplatePlaceholders(template, signal, result) {
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
    async addRule(rule) {
        await this.ruleStore.addRule(rule);
        this.logger.info({ ruleId: rule.ruleId, ruleName: rule.name }, 'Rule added');
    }
    /**
     * Get all rules
     */
    async getAllRules() {
        return this.ruleStore.getAllRules();
    }
    /**
     * Delete a rule
     */
    async deleteRule(ruleId) {
        await this.ruleStore.deleteRule(ruleId);
        this.logger.info({ ruleId }, 'Rule deleted');
    }
    /**
     * Get evaluator statistics
     */
    getStats() {
        return {
            ...this.stats,
            matchRate: this.stats.evaluations > 0
                ? this.stats.matches / this.stats.evaluations
                : 0,
        };
    }
    /**
     * Reset statistics
     */
    resetStats() {
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
    cleanupDeduplicationCache() {
        const cutoff = Date.now() - this.config.alertDeduplicationWindowMs;
        for (const [key, timestamp] of this.recentAlerts) {
            if (timestamp < cutoff) {
                this.recentAlerts.delete(key);
            }
        }
    }
}
exports.RuleEvaluatorService = RuleEvaluatorService;
/**
 * Create a rule evaluator instance
 */
function createRuleEvaluator(logger, config, ruleStore, stateStore) {
    return new RuleEvaluatorService(logger, config, ruleStore, stateStore);
}

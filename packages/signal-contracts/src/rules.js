"use strict";
// @ts-nocheck
/**
 * Rule Engine Schemas
 *
 * Defines the structure of rules used by the signal processing pipeline
 * to generate alerts. Supports:
 * - Threshold rules (value comparisons)
 * - Pattern rules (sequence matching)
 * - Temporal rules (time-based conditions)
 * - Rate rules (frequency-based)
 * - Absence rules (missing signal detection)
 *
 * @module rules
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.RuleEvaluationResultSchema = exports.RuleSchema = exports.CorrelationRuleSchema = exports.AnomalyRuleSchema = exports.AbsenceRuleSchema = exports.RateRuleSchema = exports.TemporalRuleSchema = exports.PatternRuleSchema = exports.ThresholdRuleSchema = exports.RuleBaseSchema = exports.ConditionSchema = exports.CompoundConditionSchema = exports.SimpleConditionSchema = exports.RuleStatus = exports.WindowType = exports.LogicalOperator = exports.ComparisonOperator = void 0;
exports.createThresholdRule = createThresholdRule;
exports.createPatternRule = createPatternRule;
exports.createRateRule = createRateRule;
exports.createAbsenceRule = createAbsenceRule;
exports.validateRule = validateRule;
exports.ruleAppliesToSignalType = ruleAppliesToSignalType;
exports.sortRulesByPriority = sortRulesByPriority;
const zod_1 = require("zod");
const alert_js_1 = require("./alert.js");
const signal_types_js_1 = require("./signal-types.js");
/**
 * Comparison operators for threshold rules
 */
exports.ComparisonOperator = {
    EQ: 'eq',
    NE: 'ne',
    GT: 'gt',
    GTE: 'gte',
    LT: 'lt',
    LTE: 'lte',
    IN: 'in',
    NOT_IN: 'not_in',
    CONTAINS: 'contains',
    NOT_CONTAINS: 'not_contains',
    MATCHES: 'matches',
    EXISTS: 'exists',
    NOT_EXISTS: 'not_exists',
};
/**
 * Logical operators for combining conditions
 */
exports.LogicalOperator = {
    AND: 'and',
    OR: 'or',
    NOT: 'not',
};
/**
 * Window types for temporal operations
 */
exports.WindowType = {
    TUMBLING: 'tumbling',
    SLIDING: 'sliding',
    SESSION: 'session',
};
/**
 * Rule status
 */
exports.RuleStatus = {
    ACTIVE: 'active',
    INACTIVE: 'inactive',
    TESTING: 'testing',
    DEPRECATED: 'deprecated',
};
// ============================================================================
// Condition Schemas
// ============================================================================
/**
 * Simple condition (field comparison)
 */
exports.SimpleConditionSchema = zod_1.z.object({
    type: zod_1.z.literal('simple'),
    field: zod_1.z.string().min(1),
    operator: zod_1.z.enum([
        exports.ComparisonOperator.EQ,
        exports.ComparisonOperator.NE,
        exports.ComparisonOperator.GT,
        exports.ComparisonOperator.GTE,
        exports.ComparisonOperator.LT,
        exports.ComparisonOperator.LTE,
        exports.ComparisonOperator.IN,
        exports.ComparisonOperator.NOT_IN,
        exports.ComparisonOperator.CONTAINS,
        exports.ComparisonOperator.NOT_CONTAINS,
        exports.ComparisonOperator.MATCHES,
        exports.ComparisonOperator.EXISTS,
        exports.ComparisonOperator.NOT_EXISTS,
    ]),
    value: zod_1.z.unknown(),
});
/**
 * Compound condition (combining multiple conditions)
 */
exports.CompoundConditionSchema = zod_1.z.lazy(() => zod_1.z.object({
    type: zod_1.z.literal('compound'),
    operator: zod_1.z.enum([
        exports.LogicalOperator.AND,
        exports.LogicalOperator.OR,
        exports.LogicalOperator.NOT,
    ]),
    conditions: zod_1.z.array(zod_1.z.union([exports.SimpleConditionSchema, exports.CompoundConditionSchema])),
}));
/**
 * Union of all condition types
 */
exports.ConditionSchema = zod_1.z.union([
    exports.SimpleConditionSchema,
    exports.CompoundConditionSchema,
]);
// ============================================================================
// Rule Type Schemas
// ============================================================================
/**
 * Base rule fields (common to all rule types)
 */
exports.RuleBaseSchema = zod_1.z.object({
    /** Unique rule identifier */
    ruleId: zod_1.z.string().min(1),
    /** Rule name */
    name: zod_1.z.string().min(1).max(100),
    /** Rule description */
    description: zod_1.z.string().max(1000),
    /** Rule version (semver) */
    version: zod_1.z.string().regex(/^\d+\.\d+\.\d+$/),
    /** Tenant ID (null for global rules) */
    tenantId: zod_1.z.string().nullable(),
    /** Rule status */
    status: zod_1.z.enum([
        exports.RuleStatus.ACTIVE,
        exports.RuleStatus.INACTIVE,
        exports.RuleStatus.TESTING,
        exports.RuleStatus.DEPRECATED,
    ]),
    /** Signal types this rule applies to */
    signalTypes: zod_1.z.array(signal_types_js_1.SignalTypeIdSchema).min(1),
    /** Alert severity when rule triggers */
    alertSeverity: zod_1.z.enum([
        alert_js_1.AlertSeverity.INFO,
        alert_js_1.AlertSeverity.LOW,
        alert_js_1.AlertSeverity.MEDIUM,
        alert_js_1.AlertSeverity.HIGH,
        alert_js_1.AlertSeverity.CRITICAL,
    ]),
    /** Alert title template (supports {{field}} placeholders) */
    alertTitleTemplate: zod_1.z.string().min(1),
    /** Alert description template */
    alertDescriptionTemplate: zod_1.z.string(),
    /** Tags for categorization */
    tags: zod_1.z.array(zod_1.z.string()).default([]),
    /** Rule priority for ordering (1-100, higher = more important) */
    priority: zod_1.z.number().min(1).max(100).default(50),
    /** Cooldown period between alerts (milliseconds) */
    cooldownMs: zod_1.z.number().nonnegative().default(0),
    /** Maximum alerts per time window */
    maxAlertsPerWindow: zod_1.z
        .object({
        count: zod_1.z.number().positive(),
        windowMs: zod_1.z.number().positive(),
    })
        .optional(),
    /** Created timestamp */
    createdAt: zod_1.z.number(),
    /** Updated timestamp */
    updatedAt: zod_1.z.number(),
    /** Created by user ID */
    createdBy: zod_1.z.string().optional(),
});
/**
 * Threshold rule - triggers when a value crosses a threshold
 */
exports.ThresholdRuleSchema = exports.RuleBaseSchema.extend({
    ruleType: zod_1.z.literal('threshold'),
    alertType: zod_1.z.literal(alert_js_1.AlertType.THRESHOLD),
    config: zod_1.z.object({
        /** Condition to evaluate */
        condition: exports.ConditionSchema,
        /** Field to extract for threshold value (for reporting) */
        thresholdField: zod_1.z.string().optional(),
        /** Static threshold value (for reporting) */
        thresholdValue: zod_1.z.unknown().optional(),
    }),
});
/**
 * Pattern rule - triggers when a sequence of events matches
 */
exports.PatternRuleSchema = exports.RuleBaseSchema.extend({
    ruleType: zod_1.z.literal('pattern'),
    alertType: zod_1.z.literal(alert_js_1.AlertType.PATTERN),
    config: zod_1.z.object({
        /** Pattern elements in sequence */
        sequence: zod_1.z.array(zod_1.z.object({
            /** Element name for reference */
            name: zod_1.z.string(),
            /** Signal type for this element */
            signalType: signal_types_js_1.SignalTypeIdSchema.optional(),
            /** Condition to match */
            condition: exports.ConditionSchema,
            /** Quantifier for this element */
            quantifier: zod_1.z
                .object({
                min: zod_1.z.number().nonnegative().default(1),
                max: zod_1.z.number().positive().optional(),
            })
                .optional(),
        })),
        /** Time constraint for the entire pattern */
        withinMs: zod_1.z.number().positive(),
        /** Whether order matters */
        ordered: zod_1.z.boolean().default(true),
        /** Correlation field to group events */
        correlationField: zod_1.z.string().optional(),
    }),
});
/**
 * Temporal rule - triggers based on time-based conditions
 */
exports.TemporalRuleSchema = exports.RuleBaseSchema.extend({
    ruleType: zod_1.z.literal('temporal'),
    alertType: zod_1.z.literal(alert_js_1.AlertType.TEMPORAL),
    config: zod_1.z.object({
        /** Base condition to match signals */
        condition: exports.ConditionSchema,
        /** Window configuration */
        window: zod_1.z.object({
            type: zod_1.z.enum([exports.WindowType.TUMBLING, exports.WindowType.SLIDING, exports.WindowType.SESSION]),
            sizeMs: zod_1.z.number().positive(),
            slideMs: zod_1.z.number().positive().optional(), // For sliding windows
            gapMs: zod_1.z.number().positive().optional(), // For session windows
        }),
        /** Aggregation to perform */
        aggregation: zod_1.z.object({
            type: zod_1.z.enum(['count', 'sum', 'avg', 'min', 'max']),
            field: zod_1.z.string().optional(), // Required for sum/avg/min/max
        }),
        /** Threshold for the aggregation */
        threshold: zod_1.z.object({
            operator: zod_1.z.enum([
                exports.ComparisonOperator.GT,
                exports.ComparisonOperator.GTE,
                exports.ComparisonOperator.LT,
                exports.ComparisonOperator.LTE,
                exports.ComparisonOperator.EQ,
            ]),
            value: zod_1.z.number(),
        }),
        /** Group by field for per-group thresholds */
        groupBy: zod_1.z.string().optional(),
    }),
});
/**
 * Rate rule - triggers based on event rate/frequency
 */
exports.RateRuleSchema = exports.RuleBaseSchema.extend({
    ruleType: zod_1.z.literal('rate'),
    alertType: zod_1.z.literal(alert_js_1.AlertType.RATE),
    config: zod_1.z.object({
        /** Base condition to match signals */
        condition: exports.ConditionSchema,
        /** Rate threshold (events per second) */
        rateThreshold: zod_1.z.number().positive(),
        /** Measurement window in milliseconds */
        windowMs: zod_1.z.number().positive(),
        /** Trigger when rate is above (true) or below (false) threshold */
        triggerOnHigh: zod_1.z.boolean().default(true),
        /** Group by field for per-group rate tracking */
        groupBy: zod_1.z.string().optional(),
        /** Minimum samples before triggering */
        minSamples: zod_1.z.number().positive().default(1),
    }),
});
/**
 * Absence rule - triggers when expected signals are missing
 */
exports.AbsenceRuleSchema = exports.RuleBaseSchema.extend({
    ruleType: zod_1.z.literal('absence'),
    alertType: zod_1.z.literal(alert_js_1.AlertType.ABSENCE),
    config: zod_1.z.object({
        /** Condition to match expected signals */
        condition: exports.ConditionSchema.optional(),
        /** Maximum time between signals before alerting */
        maxGapMs: zod_1.z.number().positive(),
        /** Entity or group to monitor */
        monitorField: zod_1.z.string(),
        /** List of monitored values (or empty for all) */
        monitoredValues: zod_1.z.array(zod_1.z.string()).default([]),
        /** Grace period after start before alerting */
        gracePeriodMs: zod_1.z.number().nonnegative().default(0),
    }),
});
/**
 * Anomaly rule - triggers on statistical anomalies
 */
exports.AnomalyRuleSchema = exports.RuleBaseSchema.extend({
    ruleType: zod_1.z.literal('anomaly'),
    alertType: zod_1.z.literal(alert_js_1.AlertType.ANOMALY),
    config: zod_1.z.object({
        /** Field to analyze */
        field: zod_1.z.string(),
        /** Anomaly detection method */
        method: zod_1.z.enum(['zscore', 'mad', 'iqr', 'isolation_forest']),
        /** Sensitivity (number of standard deviations, etc.) */
        sensitivity: zod_1.z.number().positive().default(3),
        /** Training window size */
        trainingWindowMs: zod_1.z.number().positive(),
        /** Minimum data points for baseline */
        minDataPoints: zod_1.z.number().positive().default(30),
        /** Group by field for per-group baselines */
        groupBy: zod_1.z.string().optional(),
        /** Base condition to filter signals */
        condition: exports.ConditionSchema.optional(),
    }),
});
/**
 * Correlation rule - triggers on cross-signal correlations
 */
exports.CorrelationRuleSchema = exports.RuleBaseSchema.extend({
    ruleType: zod_1.z.literal('correlation'),
    alertType: zod_1.z.literal(alert_js_1.AlertType.CORRELATION),
    config: zod_1.z.object({
        /** Primary signal conditions */
        primary: zod_1.z.object({
            signalTypes: zod_1.z.array(signal_types_js_1.SignalTypeIdSchema),
            condition: exports.ConditionSchema,
        }),
        /** Secondary signal conditions to correlate with */
        secondary: zod_1.z.array(zod_1.z.object({
            signalTypes: zod_1.z.array(signal_types_js_1.SignalTypeIdSchema),
            condition: exports.ConditionSchema,
            /** Required count of secondary signals */
            minCount: zod_1.z.number().positive().default(1),
        })),
        /** Correlation field (e.g., entity ID, IP address) */
        correlationField: zod_1.z.string(),
        /** Time window for correlation */
        withinMs: zod_1.z.number().positive(),
        /** Minimum confidence score */
        minConfidence: zod_1.z.number().min(0).max(1).default(0.7),
    }),
});
/**
 * Union of all rule types
 */
exports.RuleSchema = zod_1.z.discriminatedUnion('ruleType', [
    exports.ThresholdRuleSchema,
    exports.PatternRuleSchema,
    exports.TemporalRuleSchema,
    exports.RateRuleSchema,
    exports.AbsenceRuleSchema,
    exports.AnomalyRuleSchema,
    exports.CorrelationRuleSchema,
]);
// ============================================================================
// Rule Evaluation Result
// ============================================================================
/**
 * Result of evaluating a rule against a signal
 */
exports.RuleEvaluationResultSchema = zod_1.z.object({
    /** Rule ID */
    ruleId: zod_1.z.string(),
    /** Whether the rule matched */
    matched: zod_1.z.boolean(),
    /** Confidence score (0-1) */
    confidence: zod_1.z.number().min(0).max(1),
    /** Matched condition description */
    matchedCondition: zod_1.z.string().optional(),
    /** Trigger value that caused the match */
    triggerValue: zod_1.z.unknown().optional(),
    /** Actual value from the signal */
    actualValue: zod_1.z.unknown().optional(),
    /** Contributing signal IDs (for multi-signal rules) */
    contributingSignalIds: zod_1.z.array(zod_1.z.string()).default([]),
    /** Evaluation timestamp */
    evaluatedAt: zod_1.z.number(),
    /** Evaluation duration in milliseconds */
    evaluationDurationMs: zod_1.z.number(),
    /** Error if evaluation failed */
    error: zod_1.z.string().optional(),
});
// ============================================================================
// Factory Functions
// ============================================================================
/**
 * Create a simple threshold rule
 */
function createThresholdRule(params) {
    const now = Date.now();
    return {
        ...params,
        ruleType: 'threshold',
        alertType: alert_js_1.AlertType.THRESHOLD,
        createdAt: now,
        updatedAt: now,
    };
}
/**
 * Create a pattern rule
 */
function createPatternRule(params) {
    const now = Date.now();
    return {
        ...params,
        ruleType: 'pattern',
        alertType: alert_js_1.AlertType.PATTERN,
        createdAt: now,
        updatedAt: now,
    };
}
/**
 * Create a rate rule
 */
function createRateRule(params) {
    const now = Date.now();
    return {
        ...params,
        ruleType: 'rate',
        alertType: alert_js_1.AlertType.RATE,
        createdAt: now,
        updatedAt: now,
    };
}
/**
 * Create an absence rule
 */
function createAbsenceRule(params) {
    const now = Date.now();
    return {
        ...params,
        ruleType: 'absence',
        alertType: alert_js_1.AlertType.ABSENCE,
        createdAt: now,
        updatedAt: now,
    };
}
/**
 * Validate a rule
 */
function validateRule(input) {
    return exports.RuleSchema.safeParse(input);
}
/**
 * Check if a rule applies to a signal type
 */
function ruleAppliesToSignalType(rule, signalType) {
    return rule.signalTypes.includes(signalType);
}
/**
 * Get rules sorted by priority
 */
function sortRulesByPriority(rules) {
    return [...rules].sort((a, b) => b.priority - a.priority);
}

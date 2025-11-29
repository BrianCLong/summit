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

import { z } from 'zod';

import { AlertSeverity, AlertType } from './alert.js';
import { SignalTypeIdSchema } from './signal-types.js';

/**
 * Comparison operators for threshold rules
 */
export const ComparisonOperator = {
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
} as const;

export type ComparisonOperatorType =
  (typeof ComparisonOperator)[keyof typeof ComparisonOperator];

/**
 * Logical operators for combining conditions
 */
export const LogicalOperator = {
  AND: 'and',
  OR: 'or',
  NOT: 'not',
} as const;

export type LogicalOperatorType =
  (typeof LogicalOperator)[keyof typeof LogicalOperator];

/**
 * Window types for temporal operations
 */
export const WindowType = {
  TUMBLING: 'tumbling',
  SLIDING: 'sliding',
  SESSION: 'session',
} as const;

export type WindowTypeType = (typeof WindowType)[keyof typeof WindowType];

/**
 * Rule status
 */
export const RuleStatus = {
  ACTIVE: 'active',
  INACTIVE: 'inactive',
  TESTING: 'testing',
  DEPRECATED: 'deprecated',
} as const;

export type RuleStatusType = (typeof RuleStatus)[keyof typeof RuleStatus];

// ============================================================================
// Condition Schemas
// ============================================================================

/**
 * Simple condition (field comparison)
 */
export const SimpleConditionSchema = z.object({
  type: z.literal('simple'),
  field: z.string().min(1),
  operator: z.enum([
    ComparisonOperator.EQ,
    ComparisonOperator.NE,
    ComparisonOperator.GT,
    ComparisonOperator.GTE,
    ComparisonOperator.LT,
    ComparisonOperator.LTE,
    ComparisonOperator.IN,
    ComparisonOperator.NOT_IN,
    ComparisonOperator.CONTAINS,
    ComparisonOperator.NOT_CONTAINS,
    ComparisonOperator.MATCHES,
    ComparisonOperator.EXISTS,
    ComparisonOperator.NOT_EXISTS,
  ]),
  value: z.unknown(),
});

export type SimpleCondition = z.infer<typeof SimpleConditionSchema>;

/**
 * Compound condition (combining multiple conditions)
 */
export const CompoundConditionSchema: z.ZodType<CompoundCondition> = z.lazy(() =>
  z.object({
    type: z.literal('compound'),
    operator: z.enum([
      LogicalOperator.AND,
      LogicalOperator.OR,
      LogicalOperator.NOT,
    ]),
    conditions: z.array(
      z.union([SimpleConditionSchema, CompoundConditionSchema]),
    ),
  }),
);

export interface CompoundCondition {
  type: 'compound';
  operator: LogicalOperatorType;
  conditions: (SimpleCondition | CompoundCondition)[];
}

/**
 * Union of all condition types
 */
export const ConditionSchema = z.union([
  SimpleConditionSchema,
  CompoundConditionSchema,
]);

export type Condition = SimpleCondition | CompoundCondition;

// ============================================================================
// Rule Type Schemas
// ============================================================================

/**
 * Base rule fields (common to all rule types)
 */
export const RuleBaseSchema = z.object({
  /** Unique rule identifier */
  ruleId: z.string().min(1),

  /** Rule name */
  name: z.string().min(1).max(100),

  /** Rule description */
  description: z.string().max(1000),

  /** Rule version (semver) */
  version: z.string().regex(/^\d+\.\d+\.\d+$/),

  /** Tenant ID (null for global rules) */
  tenantId: z.string().nullable(),

  /** Rule status */
  status: z.enum([
    RuleStatus.ACTIVE,
    RuleStatus.INACTIVE,
    RuleStatus.TESTING,
    RuleStatus.DEPRECATED,
  ]),

  /** Signal types this rule applies to */
  signalTypes: z.array(SignalTypeIdSchema).min(1),

  /** Alert severity when rule triggers */
  alertSeverity: z.enum([
    AlertSeverity.INFO,
    AlertSeverity.LOW,
    AlertSeverity.MEDIUM,
    AlertSeverity.HIGH,
    AlertSeverity.CRITICAL,
  ]),

  /** Alert title template (supports {{field}} placeholders) */
  alertTitleTemplate: z.string().min(1),

  /** Alert description template */
  alertDescriptionTemplate: z.string(),

  /** Tags for categorization */
  tags: z.array(z.string()).default([]),

  /** Rule priority for ordering (1-100, higher = more important) */
  priority: z.number().min(1).max(100).default(50),

  /** Cooldown period between alerts (milliseconds) */
  cooldownMs: z.number().nonnegative().default(0),

  /** Maximum alerts per time window */
  maxAlertsPerWindow: z
    .object({
      count: z.number().positive(),
      windowMs: z.number().positive(),
    })
    .optional(),

  /** Created timestamp */
  createdAt: z.number(),

  /** Updated timestamp */
  updatedAt: z.number(),

  /** Created by user ID */
  createdBy: z.string().optional(),
});

export type RuleBase = z.infer<typeof RuleBaseSchema>;

/**
 * Threshold rule - triggers when a value crosses a threshold
 */
export const ThresholdRuleSchema = RuleBaseSchema.extend({
  ruleType: z.literal('threshold'),
  alertType: z.literal(AlertType.THRESHOLD),

  config: z.object({
    /** Condition to evaluate */
    condition: ConditionSchema,

    /** Field to extract for threshold value (for reporting) */
    thresholdField: z.string().optional(),

    /** Static threshold value (for reporting) */
    thresholdValue: z.unknown().optional(),
  }),
});

export type ThresholdRule = z.infer<typeof ThresholdRuleSchema>;

/**
 * Pattern rule - triggers when a sequence of events matches
 */
export const PatternRuleSchema = RuleBaseSchema.extend({
  ruleType: z.literal('pattern'),
  alertType: z.literal(AlertType.PATTERN),

  config: z.object({
    /** Pattern elements in sequence */
    sequence: z.array(
      z.object({
        /** Element name for reference */
        name: z.string(),
        /** Signal type for this element */
        signalType: SignalTypeIdSchema.optional(),
        /** Condition to match */
        condition: ConditionSchema,
        /** Quantifier for this element */
        quantifier: z
          .object({
            min: z.number().nonnegative().default(1),
            max: z.number().positive().optional(),
          })
          .optional(),
      }),
    ),

    /** Time constraint for the entire pattern */
    withinMs: z.number().positive(),

    /** Whether order matters */
    ordered: z.boolean().default(true),

    /** Correlation field to group events */
    correlationField: z.string().optional(),
  }),
});

export type PatternRule = z.infer<typeof PatternRuleSchema>;

/**
 * Temporal rule - triggers based on time-based conditions
 */
export const TemporalRuleSchema = RuleBaseSchema.extend({
  ruleType: z.literal('temporal'),
  alertType: z.literal(AlertType.TEMPORAL),

  config: z.object({
    /** Base condition to match signals */
    condition: ConditionSchema,

    /** Window configuration */
    window: z.object({
      type: z.enum([WindowType.TUMBLING, WindowType.SLIDING, WindowType.SESSION]),
      sizeMs: z.number().positive(),
      slideMs: z.number().positive().optional(), // For sliding windows
      gapMs: z.number().positive().optional(), // For session windows
    }),

    /** Aggregation to perform */
    aggregation: z.object({
      type: z.enum(['count', 'sum', 'avg', 'min', 'max']),
      field: z.string().optional(), // Required for sum/avg/min/max
    }),

    /** Threshold for the aggregation */
    threshold: z.object({
      operator: z.enum([
        ComparisonOperator.GT,
        ComparisonOperator.GTE,
        ComparisonOperator.LT,
        ComparisonOperator.LTE,
        ComparisonOperator.EQ,
      ]),
      value: z.number(),
    }),

    /** Group by field for per-group thresholds */
    groupBy: z.string().optional(),
  }),
});

export type TemporalRule = z.infer<typeof TemporalRuleSchema>;

/**
 * Rate rule - triggers based on event rate/frequency
 */
export const RateRuleSchema = RuleBaseSchema.extend({
  ruleType: z.literal('rate'),
  alertType: z.literal(AlertType.RATE),

  config: z.object({
    /** Base condition to match signals */
    condition: ConditionSchema,

    /** Rate threshold (events per second) */
    rateThreshold: z.number().positive(),

    /** Measurement window in milliseconds */
    windowMs: z.number().positive(),

    /** Trigger when rate is above (true) or below (false) threshold */
    triggerOnHigh: z.boolean().default(true),

    /** Group by field for per-group rate tracking */
    groupBy: z.string().optional(),

    /** Minimum samples before triggering */
    minSamples: z.number().positive().default(1),
  }),
});

export type RateRule = z.infer<typeof RateRuleSchema>;

/**
 * Absence rule - triggers when expected signals are missing
 */
export const AbsenceRuleSchema = RuleBaseSchema.extend({
  ruleType: z.literal('absence'),
  alertType: z.literal(AlertType.ABSENCE),

  config: z.object({
    /** Condition to match expected signals */
    condition: ConditionSchema.optional(),

    /** Maximum time between signals before alerting */
    maxGapMs: z.number().positive(),

    /** Entity or group to monitor */
    monitorField: z.string(),

    /** List of monitored values (or empty for all) */
    monitoredValues: z.array(z.string()).default([]),

    /** Grace period after start before alerting */
    gracePeriodMs: z.number().nonnegative().default(0),
  }),
});

export type AbsenceRule = z.infer<typeof AbsenceRuleSchema>;

/**
 * Anomaly rule - triggers on statistical anomalies
 */
export const AnomalyRuleSchema = RuleBaseSchema.extend({
  ruleType: z.literal('anomaly'),
  alertType: z.literal(AlertType.ANOMALY),

  config: z.object({
    /** Field to analyze */
    field: z.string(),

    /** Anomaly detection method */
    method: z.enum(['zscore', 'mad', 'iqr', 'isolation_forest']),

    /** Sensitivity (number of standard deviations, etc.) */
    sensitivity: z.number().positive().default(3),

    /** Training window size */
    trainingWindowMs: z.number().positive(),

    /** Minimum data points for baseline */
    minDataPoints: z.number().positive().default(30),

    /** Group by field for per-group baselines */
    groupBy: z.string().optional(),

    /** Base condition to filter signals */
    condition: ConditionSchema.optional(),
  }),
});

export type AnomalyRule = z.infer<typeof AnomalyRuleSchema>;

/**
 * Correlation rule - triggers on cross-signal correlations
 */
export const CorrelationRuleSchema = RuleBaseSchema.extend({
  ruleType: z.literal('correlation'),
  alertType: z.literal(AlertType.CORRELATION),

  config: z.object({
    /** Primary signal conditions */
    primary: z.object({
      signalTypes: z.array(SignalTypeIdSchema),
      condition: ConditionSchema,
    }),

    /** Secondary signal conditions to correlate with */
    secondary: z.array(
      z.object({
        signalTypes: z.array(SignalTypeIdSchema),
        condition: ConditionSchema,
        /** Required count of secondary signals */
        minCount: z.number().positive().default(1),
      }),
    ),

    /** Correlation field (e.g., entity ID, IP address) */
    correlationField: z.string(),

    /** Time window for correlation */
    withinMs: z.number().positive(),

    /** Minimum confidence score */
    minConfidence: z.number().min(0).max(1).default(0.7),
  }),
});

export type CorrelationRule = z.infer<typeof CorrelationRuleSchema>;

/**
 * Union of all rule types
 */
export const RuleSchema = z.discriminatedUnion('ruleType', [
  ThresholdRuleSchema,
  PatternRuleSchema,
  TemporalRuleSchema,
  RateRuleSchema,
  AbsenceRuleSchema,
  AnomalyRuleSchema,
  CorrelationRuleSchema,
]);

export type Rule =
  | ThresholdRule
  | PatternRule
  | TemporalRule
  | RateRule
  | AbsenceRule
  | AnomalyRule
  | CorrelationRule;

// ============================================================================
// Rule Evaluation Result
// ============================================================================

/**
 * Result of evaluating a rule against a signal
 */
export const RuleEvaluationResultSchema = z.object({
  /** Rule ID */
  ruleId: z.string(),

  /** Whether the rule matched */
  matched: z.boolean(),

  /** Confidence score (0-1) */
  confidence: z.number().min(0).max(1),

  /** Matched condition description */
  matchedCondition: z.string().optional(),

  /** Trigger value that caused the match */
  triggerValue: z.unknown().optional(),

  /** Actual value from the signal */
  actualValue: z.unknown().optional(),

  /** Contributing signal IDs (for multi-signal rules) */
  contributingSignalIds: z.array(z.string()).default([]),

  /** Evaluation timestamp */
  evaluatedAt: z.number(),

  /** Evaluation duration in milliseconds */
  evaluationDurationMs: z.number(),

  /** Error if evaluation failed */
  error: z.string().optional(),
});

export type RuleEvaluationResult = z.infer<typeof RuleEvaluationResultSchema>;

// ============================================================================
// Factory Functions
// ============================================================================

/**
 * Create a simple threshold rule
 */
export function createThresholdRule(
  params: Omit<ThresholdRule, 'ruleType' | 'alertType' | 'createdAt' | 'updatedAt'>,
): ThresholdRule {
  const now = Date.now();
  return {
    ...params,
    ruleType: 'threshold',
    alertType: AlertType.THRESHOLD,
    createdAt: now,
    updatedAt: now,
  };
}

/**
 * Create a pattern rule
 */
export function createPatternRule(
  params: Omit<PatternRule, 'ruleType' | 'alertType' | 'createdAt' | 'updatedAt'>,
): PatternRule {
  const now = Date.now();
  return {
    ...params,
    ruleType: 'pattern',
    alertType: AlertType.PATTERN,
    createdAt: now,
    updatedAt: now,
  };
}

/**
 * Create a rate rule
 */
export function createRateRule(
  params: Omit<RateRule, 'ruleType' | 'alertType' | 'createdAt' | 'updatedAt'>,
): RateRule {
  const now = Date.now();
  return {
    ...params,
    ruleType: 'rate',
    alertType: AlertType.RATE,
    createdAt: now,
    updatedAt: now,
  };
}

/**
 * Create an absence rule
 */
export function createAbsenceRule(
  params: Omit<AbsenceRule, 'ruleType' | 'alertType' | 'createdAt' | 'updatedAt'>,
): AbsenceRule {
  const now = Date.now();
  return {
    ...params,
    ruleType: 'absence',
    alertType: AlertType.ABSENCE,
    createdAt: now,
    updatedAt: now,
  };
}

/**
 * Validate a rule
 */
export function validateRule(input: unknown): z.SafeParseReturnType<unknown, Rule> {
  return RuleSchema.safeParse(input);
}

/**
 * Check if a rule applies to a signal type
 */
export function ruleAppliesToSignalType(
  rule: Rule,
  signalType: string,
): boolean {
  return rule.signalTypes.includes(signalType as any);
}

/**
 * Get rules sorted by priority
 */
export function sortRulesByPriority(rules: Rule[]): Rule[] {
  return [...rules].sort((a, b) => b.priority - a.priority);
}

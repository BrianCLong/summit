"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.BatchEvaluationResponseSchema = exports.BatchEvaluationRequestSchema = exports.EvaluationContextSchema = exports.CacheInvalidationMessageSchema = exports.AuditLogEntrySchema = exports.FlagEvaluationResultSchema = exports.ExperimentAssignmentSchema = exports.UpdateExperimentInputSchema = exports.CreateExperimentInputSchema = exports.ExperimentSchema = exports.CreateExperimentVariantInputSchema = exports.ExperimentVariantSchema = exports.ExperimentStatusSchema = exports.AddTargetingRuleInputSchema = exports.UpdateFeatureFlagInputSchema = exports.CreateFeatureFlagInputSchema = exports.FeatureFlagSchema = exports.FlagTargetingRuleSchema = exports.CreateSegmentInputSchema = exports.SegmentSchema = exports.SegmentRuleSchema = exports.SegmentConditionSchema = exports.SegmentOperatorSchema = exports.UpdateConfigItemInputSchema = exports.CreateConfigItemInputSchema = exports.ConfigItemSchema = exports.ConfigContextSchema = exports.HierarchyLevelSchema = exports.ConfigValueTypeSchema = void 0;
const zod_1 = require("zod");
/**
 * Configuration value types supported by the config service.
 * All values are stored as JSON but validated against their declared type.
 */
exports.ConfigValueTypeSchema = zod_1.z.enum([
    'boolean',
    'integer',
    'float',
    'string',
    'json',
]);
/**
 * Hierarchy level for configuration precedence.
 * Order: global (lowest) -> environment -> tenant -> user (highest)
 */
exports.HierarchyLevelSchema = zod_1.z.enum([
    'global',
    'environment',
    'tenant',
    'user',
]);
/**
 * Configuration context used for resolving values.
 */
exports.ConfigContextSchema = zod_1.z.object({
    environment: zod_1.z.string().optional(),
    tenantId: zod_1.z.string().optional(),
    userId: zod_1.z.string().optional(),
    attributes: zod_1.z.record(zod_1.z.unknown()).optional(),
});
/**
 * Base configuration item stored in the database.
 */
exports.ConfigItemSchema = zod_1.z.object({
    id: zod_1.z.string().uuid(),
    key: zod_1.z.string().min(1).max(255),
    value: zod_1.z.unknown(),
    valueType: exports.ConfigValueTypeSchema,
    level: exports.HierarchyLevelSchema,
    environment: zod_1.z.string().nullable(),
    tenantId: zod_1.z.string().nullable(),
    userId: zod_1.z.string().nullable(),
    description: zod_1.z.string().nullable(),
    isSecret: zod_1.z.boolean().default(false),
    isGovernanceProtected: zod_1.z.boolean().default(false),
    version: zod_1.z.number().int().positive(),
    createdAt: zod_1.z.date(),
    updatedAt: zod_1.z.date(),
    createdBy: zod_1.z.string(),
    updatedBy: zod_1.z.string(),
});
/**
 * Input for creating a config item.
 */
exports.CreateConfigItemInputSchema = zod_1.z.object({
    key: zod_1.z.string().min(1).max(255),
    value: zod_1.z.unknown(),
    valueType: exports.ConfigValueTypeSchema,
    level: exports.HierarchyLevelSchema,
    environment: zod_1.z.string().nullable().default(null),
    tenantId: zod_1.z.string().nullable().default(null),
    userId: zod_1.z.string().nullable().default(null),
    description: zod_1.z.string().nullable().default(null),
    isSecret: zod_1.z.boolean().default(false),
    isGovernanceProtected: zod_1.z.boolean().default(false),
});
/**
 * Input for updating a config item.
 */
exports.UpdateConfigItemInputSchema = zod_1.z.object({
    value: zod_1.z.unknown().optional(),
    description: zod_1.z.string().nullable().optional(),
    isSecret: zod_1.z.boolean().optional(),
    isGovernanceProtected: zod_1.z.boolean().optional(),
});
/**
 * Segment operator for matching attributes.
 */
exports.SegmentOperatorSchema = zod_1.z.enum([
    'equals',
    'not_equals',
    'contains',
    'not_contains',
    'starts_with',
    'ends_with',
    'in',
    'not_in',
    'greater_than',
    'greater_than_or_equals',
    'less_than',
    'less_than_or_equals',
    'regex',
    'semver_equals',
    'semver_greater_than',
    'semver_less_than',
]);
/**
 * A single condition in a segment rule.
 */
exports.SegmentConditionSchema = zod_1.z.object({
    attribute: zod_1.z.string(),
    operator: exports.SegmentOperatorSchema,
    value: zod_1.z.unknown(),
});
/**
 * A rule within a segment (AND of conditions).
 */
exports.SegmentRuleSchema = zod_1.z.object({
    conditions: zod_1.z.array(exports.SegmentConditionSchema).min(1),
});
/**
 * User segment for targeting feature flags and experiments.
 */
exports.SegmentSchema = zod_1.z.object({
    id: zod_1.z.string().uuid(),
    name: zod_1.z.string().min(1).max(255),
    description: zod_1.z.string().nullable(),
    tenantId: zod_1.z.string().nullable(),
    rules: zod_1.z.array(exports.SegmentRuleSchema),
    createdAt: zod_1.z.date(),
    updatedAt: zod_1.z.date(),
    createdBy: zod_1.z.string(),
    updatedBy: zod_1.z.string(),
});
/**
 * Input for creating a segment.
 */
exports.CreateSegmentInputSchema = zod_1.z.object({
    name: zod_1.z.string().min(1).max(255),
    description: zod_1.z.string().nullable().default(null),
    tenantId: zod_1.z.string().nullable().default(null),
    rules: zod_1.z.array(exports.SegmentRuleSchema).default([]),
});
/**
 * Feature flag targeting rule.
 */
exports.FlagTargetingRuleSchema = zod_1.z.object({
    id: zod_1.z.string().uuid(),
    segmentId: zod_1.z.string().uuid().nullable(),
    inlineConditions: zod_1.z.array(exports.SegmentConditionSchema).nullable(),
    rolloutPercentage: zod_1.z.number().min(0).max(100),
    value: zod_1.z.unknown(),
    priority: zod_1.z.number().int(),
});
/**
 * Feature flag definition.
 */
exports.FeatureFlagSchema = zod_1.z.object({
    id: zod_1.z.string().uuid(),
    key: zod_1.z.string().min(1).max(255),
    name: zod_1.z.string().min(1).max(255),
    description: zod_1.z.string().nullable(),
    tenantId: zod_1.z.string().nullable(),
    enabled: zod_1.z.boolean().default(false),
    defaultValue: zod_1.z.unknown(),
    valueType: exports.ConfigValueTypeSchema,
    targetingRules: zod_1.z.array(exports.FlagTargetingRuleSchema),
    allowlist: zod_1.z.array(zod_1.z.string()).default([]),
    blocklist: zod_1.z.array(zod_1.z.string()).default([]),
    isGovernanceProtected: zod_1.z.boolean().default(false),
    staleAfterDays: zod_1.z.number().int().positive().nullable(),
    createdAt: zod_1.z.date(),
    updatedAt: zod_1.z.date(),
    createdBy: zod_1.z.string(),
    updatedBy: zod_1.z.string(),
});
/**
 * Input for creating a feature flag.
 */
exports.CreateFeatureFlagInputSchema = zod_1.z.object({
    key: zod_1.z.string().min(1).max(255),
    name: zod_1.z.string().min(1).max(255),
    description: zod_1.z.string().nullable().default(null),
    tenantId: zod_1.z.string().nullable().default(null),
    enabled: zod_1.z.boolean().default(false),
    defaultValue: zod_1.z.unknown(),
    valueType: exports.ConfigValueTypeSchema.default('boolean'),
    allowlist: zod_1.z.array(zod_1.z.string()).default([]),
    blocklist: zod_1.z.array(zod_1.z.string()).default([]),
    isGovernanceProtected: zod_1.z.boolean().default(false),
    staleAfterDays: zod_1.z.number().int().positive().nullable().default(null),
});
/**
 * Input for updating a feature flag.
 */
exports.UpdateFeatureFlagInputSchema = zod_1.z.object({
    name: zod_1.z.string().min(1).max(255).optional(),
    description: zod_1.z.string().nullable().optional(),
    enabled: zod_1.z.boolean().optional(),
    defaultValue: zod_1.z.unknown().optional(),
    allowlist: zod_1.z.array(zod_1.z.string()).optional(),
    blocklist: zod_1.z.array(zod_1.z.string()).optional(),
    isGovernanceProtected: zod_1.z.boolean().optional(),
    staleAfterDays: zod_1.z.number().int().positive().nullable().optional(),
});
/**
 * Input for adding a targeting rule to a feature flag.
 */
exports.AddTargetingRuleInputSchema = zod_1.z.object({
    segmentId: zod_1.z.string().uuid().nullable().default(null),
    inlineConditions: zod_1.z.array(exports.SegmentConditionSchema).nullable().default(null),
    rolloutPercentage: zod_1.z.number().min(0).max(100).default(100),
    value: zod_1.z.unknown(),
    priority: zod_1.z.number().int().default(0),
});
/**
 * Experiment status.
 */
exports.ExperimentStatusSchema = zod_1.z.enum([
    'draft',
    'running',
    'paused',
    'completed',
    'archived',
]);
/**
 * Experiment variant.
 */
exports.ExperimentVariantSchema = zod_1.z.object({
    id: zod_1.z.string().uuid(),
    name: zod_1.z.string().min(1).max(255),
    description: zod_1.z.string().nullable(),
    weight: zod_1.z.number().min(0).max(100),
    value: zod_1.z.unknown(),
    isControl: zod_1.z.boolean().default(false),
});
/**
 * Input for creating an experiment variant.
 */
exports.CreateExperimentVariantInputSchema = zod_1.z.object({
    name: zod_1.z.string().min(1).max(255),
    description: zod_1.z.string().nullable().default(null),
    weight: zod_1.z.number().min(0).max(100),
    value: zod_1.z.unknown(),
    isControl: zod_1.z.boolean().default(false),
});
/**
 * Experiment definition.
 */
exports.ExperimentSchema = zod_1.z.object({
    id: zod_1.z.string().uuid(),
    key: zod_1.z.string().min(1).max(255),
    name: zod_1.z.string().min(1).max(255),
    description: zod_1.z.string().nullable(),
    tenantId: zod_1.z.string().nullable(),
    status: exports.ExperimentStatusSchema,
    variants: zod_1.z.array(exports.ExperimentVariantSchema).min(2),
    targetSegmentId: zod_1.z.string().uuid().nullable(),
    rolloutPercentage: zod_1.z.number().min(0).max(100),
    allowlist: zod_1.z.array(zod_1.z.string()).default([]),
    blocklist: zod_1.z.array(zod_1.z.string()).default([]),
    isGovernanceProtected: zod_1.z.boolean().default(false),
    requiresApproval: zod_1.z.boolean().default(false),
    approvedBy: zod_1.z.string().nullable(),
    approvedAt: zod_1.z.date().nullable(),
    startedAt: zod_1.z.date().nullable(),
    endedAt: zod_1.z.date().nullable(),
    createdAt: zod_1.z.date(),
    updatedAt: zod_1.z.date(),
    createdBy: zod_1.z.string(),
    updatedBy: zod_1.z.string(),
});
/**
 * Input for creating an experiment.
 */
exports.CreateExperimentInputSchema = zod_1.z.object({
    key: zod_1.z.string().min(1).max(255),
    name: zod_1.z.string().min(1).max(255),
    description: zod_1.z.string().nullable().default(null),
    tenantId: zod_1.z.string().nullable().default(null),
    variants: zod_1.z.array(exports.CreateExperimentVariantInputSchema).min(2),
    targetSegmentId: zod_1.z.string().uuid().nullable().default(null),
    rolloutPercentage: zod_1.z.number().min(0).max(100).default(100),
    allowlist: zod_1.z.array(zod_1.z.string()).default([]),
    blocklist: zod_1.z.array(zod_1.z.string()).default([]),
    isGovernanceProtected: zod_1.z.boolean().default(false),
    requiresApproval: zod_1.z.boolean().default(false),
});
/**
 * Input for updating an experiment.
 */
exports.UpdateExperimentInputSchema = zod_1.z.object({
    name: zod_1.z.string().min(1).max(255).optional(),
    description: zod_1.z.string().nullable().optional(),
    rolloutPercentage: zod_1.z.number().min(0).max(100).optional(),
    allowlist: zod_1.z.array(zod_1.z.string()).optional(),
    blocklist: zod_1.z.array(zod_1.z.string()).optional(),
});
/**
 * Experiment assignment result.
 */
exports.ExperimentAssignmentSchema = zod_1.z.object({
    experimentId: zod_1.z.string().uuid(),
    experimentKey: zod_1.z.string(),
    variantId: zod_1.z.string().uuid(),
    variantName: zod_1.z.string(),
    value: zod_1.z.unknown(),
    inExperiment: zod_1.z.boolean(),
    reason: zod_1.z.string(),
});
/**
 * Feature flag evaluation result.
 */
exports.FlagEvaluationResultSchema = zod_1.z.object({
    flagKey: zod_1.z.string(),
    value: zod_1.z.unknown(),
    enabled: zod_1.z.boolean(),
    reason: zod_1.z.string(),
    ruleId: zod_1.z.string().nullable(),
    segmentId: zod_1.z.string().nullable(),
});
/**
 * Audit log entry for configuration changes.
 */
exports.AuditLogEntrySchema = zod_1.z.object({
    id: zod_1.z.string().uuid(),
    entityType: zod_1.z.enum(['config', 'flag', 'experiment', 'segment']),
    entityId: zod_1.z.string().uuid(),
    action: zod_1.z.enum([
        'create',
        'update',
        'delete',
        'enable',
        'disable',
        'start',
        'pause',
        'complete',
        'approve',
    ]),
    previousValue: zod_1.z.unknown().nullable(),
    newValue: zod_1.z.unknown().nullable(),
    tenantId: zod_1.z.string().nullable(),
    userId: zod_1.z.string(),
    userEmail: zod_1.z.string().nullable(),
    ipAddress: zod_1.z.string().nullable(),
    userAgent: zod_1.z.string().nullable(),
    timestamp: zod_1.z.date(),
});
/**
 * Cache invalidation message for pub/sub.
 */
exports.CacheInvalidationMessageSchema = zod_1.z.object({
    type: zod_1.z.enum(['config', 'flag', 'experiment', 'segment', 'all']),
    key: zod_1.z.string().nullable(),
    tenantId: zod_1.z.string().nullable(),
    timestamp: zod_1.z.number(),
});
/**
 * Evaluation context for feature flags and experiments.
 * Extends ConfigContext with additional attributes.
 */
exports.EvaluationContextSchema = exports.ConfigContextSchema.extend({
    userId: zod_1.z.string(),
    attributes: zod_1.z.record(zod_1.z.unknown()).default({}),
});
/**
 * Batch evaluation request.
 */
exports.BatchEvaluationRequestSchema = zod_1.z.object({
    context: exports.EvaluationContextSchema,
    flagKeys: zod_1.z.array(zod_1.z.string()).optional(),
    experimentKeys: zod_1.z.array(zod_1.z.string()).optional(),
    configKeys: zod_1.z.array(zod_1.z.string()).optional(),
});
/**
 * Batch evaluation response.
 */
exports.BatchEvaluationResponseSchema = zod_1.z.object({
    flags: zod_1.z.record(exports.FlagEvaluationResultSchema),
    experiments: zod_1.z.record(exports.ExperimentAssignmentSchema),
    configs: zod_1.z.record(zod_1.z.unknown()),
    evaluatedAt: zod_1.z.number(),
});

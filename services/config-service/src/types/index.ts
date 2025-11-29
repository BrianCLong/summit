import { z } from 'zod';

/**
 * Configuration value types supported by the config service.
 * All values are stored as JSON but validated against their declared type.
 */
export const ConfigValueTypeSchema = z.enum([
  'boolean',
  'integer',
  'float',
  'string',
  'json',
]);

export type ConfigValueType = z.infer<typeof ConfigValueTypeSchema>;

/**
 * Hierarchy level for configuration precedence.
 * Order: global (lowest) -> environment -> tenant -> user (highest)
 */
export const HierarchyLevelSchema = z.enum([
  'global',
  'environment',
  'tenant',
  'user',
]);

export type HierarchyLevel = z.infer<typeof HierarchyLevelSchema>;

/**
 * Configuration context used for resolving values.
 */
export const ConfigContextSchema = z.object({
  environment: z.string().optional(),
  tenantId: z.string().optional(),
  userId: z.string().optional(),
  attributes: z.record(z.unknown()).optional(),
});

export type ConfigContext = z.infer<typeof ConfigContextSchema>;

/**
 * Base configuration item stored in the database.
 */
export const ConfigItemSchema = z.object({
  id: z.string().uuid(),
  key: z.string().min(1).max(255),
  value: z.unknown(),
  valueType: ConfigValueTypeSchema,
  level: HierarchyLevelSchema,
  environment: z.string().nullable(),
  tenantId: z.string().nullable(),
  userId: z.string().nullable(),
  description: z.string().nullable(),
  isSecret: z.boolean().default(false),
  isGovernanceProtected: z.boolean().default(false),
  version: z.number().int().positive(),
  createdAt: z.date(),
  updatedAt: z.date(),
  createdBy: z.string(),
  updatedBy: z.string(),
});

export type ConfigItem = z.infer<typeof ConfigItemSchema>;

/**
 * Input for creating a config item.
 */
export const CreateConfigItemInputSchema = z.object({
  key: z.string().min(1).max(255),
  value: z.unknown(),
  valueType: ConfigValueTypeSchema,
  level: HierarchyLevelSchema,
  environment: z.string().nullable().default(null),
  tenantId: z.string().nullable().default(null),
  userId: z.string().nullable().default(null),
  description: z.string().nullable().default(null),
  isSecret: z.boolean().default(false),
  isGovernanceProtected: z.boolean().default(false),
});

export type CreateConfigItemInput = z.infer<typeof CreateConfigItemInputSchema>;

/**
 * Input for updating a config item.
 */
export const UpdateConfigItemInputSchema = z.object({
  value: z.unknown().optional(),
  description: z.string().nullable().optional(),
  isSecret: z.boolean().optional(),
  isGovernanceProtected: z.boolean().optional(),
});

export type UpdateConfigItemInput = z.infer<typeof UpdateConfigItemInputSchema>;

/**
 * Segment operator for matching attributes.
 */
export const SegmentOperatorSchema = z.enum([
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

export type SegmentOperator = z.infer<typeof SegmentOperatorSchema>;

/**
 * A single condition in a segment rule.
 */
export const SegmentConditionSchema = z.object({
  attribute: z.string(),
  operator: SegmentOperatorSchema,
  value: z.unknown(),
});

export type SegmentCondition = z.infer<typeof SegmentConditionSchema>;

/**
 * A rule within a segment (AND of conditions).
 */
export const SegmentRuleSchema = z.object({
  conditions: z.array(SegmentConditionSchema).min(1),
});

export type SegmentRule = z.infer<typeof SegmentRuleSchema>;

/**
 * User segment for targeting feature flags and experiments.
 */
export const SegmentSchema = z.object({
  id: z.string().uuid(),
  name: z.string().min(1).max(255),
  description: z.string().nullable(),
  tenantId: z.string().nullable(),
  rules: z.array(SegmentRuleSchema),
  createdAt: z.date(),
  updatedAt: z.date(),
  createdBy: z.string(),
  updatedBy: z.string(),
});

export type Segment = z.infer<typeof SegmentSchema>;

/**
 * Input for creating a segment.
 */
export const CreateSegmentInputSchema = z.object({
  name: z.string().min(1).max(255),
  description: z.string().nullable().default(null),
  tenantId: z.string().nullable().default(null),
  rules: z.array(SegmentRuleSchema).default([]),
});

export type CreateSegmentInput = z.infer<typeof CreateSegmentInputSchema>;

/**
 * Feature flag targeting rule.
 */
export const FlagTargetingRuleSchema = z.object({
  id: z.string().uuid(),
  segmentId: z.string().uuid().nullable(),
  inlineConditions: z.array(SegmentConditionSchema).nullable(),
  rolloutPercentage: z.number().min(0).max(100),
  value: z.unknown(),
  priority: z.number().int(),
});

export type FlagTargetingRule = z.infer<typeof FlagTargetingRuleSchema>;

/**
 * Feature flag definition.
 */
export const FeatureFlagSchema = z.object({
  id: z.string().uuid(),
  key: z.string().min(1).max(255),
  name: z.string().min(1).max(255),
  description: z.string().nullable(),
  tenantId: z.string().nullable(),
  enabled: z.boolean().default(false),
  defaultValue: z.unknown(),
  valueType: ConfigValueTypeSchema,
  targetingRules: z.array(FlagTargetingRuleSchema),
  allowlist: z.array(z.string()).default([]),
  blocklist: z.array(z.string()).default([]),
  isGovernanceProtected: z.boolean().default(false),
  staleAfterDays: z.number().int().positive().nullable(),
  createdAt: z.date(),
  updatedAt: z.date(),
  createdBy: z.string(),
  updatedBy: z.string(),
});

export type FeatureFlag = z.infer<typeof FeatureFlagSchema>;

/**
 * Input for creating a feature flag.
 */
export const CreateFeatureFlagInputSchema = z.object({
  key: z.string().min(1).max(255),
  name: z.string().min(1).max(255),
  description: z.string().nullable().default(null),
  tenantId: z.string().nullable().default(null),
  enabled: z.boolean().default(false),
  defaultValue: z.unknown(),
  valueType: ConfigValueTypeSchema.default('boolean'),
  allowlist: z.array(z.string()).default([]),
  blocklist: z.array(z.string()).default([]),
  isGovernanceProtected: z.boolean().default(false),
  staleAfterDays: z.number().int().positive().nullable().default(null),
});

export type CreateFeatureFlagInput = z.infer<typeof CreateFeatureFlagInputSchema>;

/**
 * Input for updating a feature flag.
 */
export const UpdateFeatureFlagInputSchema = z.object({
  name: z.string().min(1).max(255).optional(),
  description: z.string().nullable().optional(),
  enabled: z.boolean().optional(),
  defaultValue: z.unknown().optional(),
  allowlist: z.array(z.string()).optional(),
  blocklist: z.array(z.string()).optional(),
  isGovernanceProtected: z.boolean().optional(),
  staleAfterDays: z.number().int().positive().nullable().optional(),
});

export type UpdateFeatureFlagInput = z.infer<typeof UpdateFeatureFlagInputSchema>;

/**
 * Input for adding a targeting rule to a feature flag.
 */
export const AddTargetingRuleInputSchema = z.object({
  segmentId: z.string().uuid().nullable().default(null),
  inlineConditions: z.array(SegmentConditionSchema).nullable().default(null),
  rolloutPercentage: z.number().min(0).max(100).default(100),
  value: z.unknown(),
  priority: z.number().int().default(0),
});

export type AddTargetingRuleInput = z.infer<typeof AddTargetingRuleInputSchema>;

/**
 * Experiment status.
 */
export const ExperimentStatusSchema = z.enum([
  'draft',
  'running',
  'paused',
  'completed',
  'archived',
]);

export type ExperimentStatus = z.infer<typeof ExperimentStatusSchema>;

/**
 * Experiment variant.
 */
export const ExperimentVariantSchema = z.object({
  id: z.string().uuid(),
  name: z.string().min(1).max(255),
  description: z.string().nullable(),
  weight: z.number().min(0).max(100),
  value: z.unknown(),
  isControl: z.boolean().default(false),
});

export type ExperimentVariant = z.infer<typeof ExperimentVariantSchema>;

/**
 * Input for creating an experiment variant.
 */
export const CreateExperimentVariantInputSchema = z.object({
  name: z.string().min(1).max(255),
  description: z.string().nullable().default(null),
  weight: z.number().min(0).max(100),
  value: z.unknown(),
  isControl: z.boolean().default(false),
});

export type CreateExperimentVariantInput = z.infer<
  typeof CreateExperimentVariantInputSchema
>;

/**
 * Experiment definition.
 */
export const ExperimentSchema = z.object({
  id: z.string().uuid(),
  key: z.string().min(1).max(255),
  name: z.string().min(1).max(255),
  description: z.string().nullable(),
  tenantId: z.string().nullable(),
  status: ExperimentStatusSchema,
  variants: z.array(ExperimentVariantSchema).min(2),
  targetSegmentId: z.string().uuid().nullable(),
  rolloutPercentage: z.number().min(0).max(100),
  allowlist: z.array(z.string()).default([]),
  blocklist: z.array(z.string()).default([]),
  isGovernanceProtected: z.boolean().default(false),
  requiresApproval: z.boolean().default(false),
  approvedBy: z.string().nullable(),
  approvedAt: z.date().nullable(),
  startedAt: z.date().nullable(),
  endedAt: z.date().nullable(),
  createdAt: z.date(),
  updatedAt: z.date(),
  createdBy: z.string(),
  updatedBy: z.string(),
});

export type Experiment = z.infer<typeof ExperimentSchema>;

/**
 * Input for creating an experiment.
 */
export const CreateExperimentInputSchema = z.object({
  key: z.string().min(1).max(255),
  name: z.string().min(1).max(255),
  description: z.string().nullable().default(null),
  tenantId: z.string().nullable().default(null),
  variants: z.array(CreateExperimentVariantInputSchema).min(2),
  targetSegmentId: z.string().uuid().nullable().default(null),
  rolloutPercentage: z.number().min(0).max(100).default(100),
  allowlist: z.array(z.string()).default([]),
  blocklist: z.array(z.string()).default([]),
  isGovernanceProtected: z.boolean().default(false),
  requiresApproval: z.boolean().default(false),
});

export type CreateExperimentInput = z.infer<typeof CreateExperimentInputSchema>;

/**
 * Input for updating an experiment.
 */
export const UpdateExperimentInputSchema = z.object({
  name: z.string().min(1).max(255).optional(),
  description: z.string().nullable().optional(),
  rolloutPercentage: z.number().min(0).max(100).optional(),
  allowlist: z.array(z.string()).optional(),
  blocklist: z.array(z.string()).optional(),
});

export type UpdateExperimentInput = z.infer<typeof UpdateExperimentInputSchema>;

/**
 * Experiment assignment result.
 */
export const ExperimentAssignmentSchema = z.object({
  experimentId: z.string().uuid(),
  experimentKey: z.string(),
  variantId: z.string().uuid(),
  variantName: z.string(),
  value: z.unknown(),
  inExperiment: z.boolean(),
  reason: z.string(),
});

export type ExperimentAssignment = z.infer<typeof ExperimentAssignmentSchema>;

/**
 * Feature flag evaluation result.
 */
export const FlagEvaluationResultSchema = z.object({
  flagKey: z.string(),
  value: z.unknown(),
  enabled: z.boolean(),
  reason: z.string(),
  ruleId: z.string().nullable(),
  segmentId: z.string().nullable(),
});

export type FlagEvaluationResult = z.infer<typeof FlagEvaluationResultSchema>;

/**
 * Audit log entry for configuration changes.
 */
export const AuditLogEntrySchema = z.object({
  id: z.string().uuid(),
  entityType: z.enum(['config', 'flag', 'experiment', 'segment']),
  entityId: z.string().uuid(),
  action: z.enum([
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
  previousValue: z.unknown().nullable(),
  newValue: z.unknown().nullable(),
  tenantId: z.string().nullable(),
  userId: z.string(),
  userEmail: z.string().nullable(),
  ipAddress: z.string().nullable(),
  userAgent: z.string().nullable(),
  timestamp: z.date(),
});

export type AuditLogEntry = z.infer<typeof AuditLogEntrySchema>;

/**
 * Cache invalidation message for pub/sub.
 */
export const CacheInvalidationMessageSchema = z.object({
  type: z.enum(['config', 'flag', 'experiment', 'segment', 'all']),
  key: z.string().nullable(),
  tenantId: z.string().nullable(),
  timestamp: z.number(),
});

export type CacheInvalidationMessage = z.infer<
  typeof CacheInvalidationMessageSchema
>;

/**
 * Evaluation context for feature flags and experiments.
 * Extends ConfigContext with additional attributes.
 */
export const EvaluationContextSchema = ConfigContextSchema.extend({
  userId: z.string(),
  attributes: z.record(z.unknown()).default({}),
});

export type EvaluationContext = z.infer<typeof EvaluationContextSchema>;

/**
 * Batch evaluation request.
 */
export const BatchEvaluationRequestSchema = z.object({
  context: EvaluationContextSchema,
  flagKeys: z.array(z.string()).optional(),
  experimentKeys: z.array(z.string()).optional(),
  configKeys: z.array(z.string()).optional(),
});

export type BatchEvaluationRequest = z.infer<typeof BatchEvaluationRequestSchema>;

/**
 * Batch evaluation response.
 */
export const BatchEvaluationResponseSchema = z.object({
  flags: z.record(FlagEvaluationResultSchema),
  experiments: z.record(ExperimentAssignmentSchema),
  configs: z.record(z.unknown()),
  evaluatedAt: z.number(),
});

export type BatchEvaluationResponse = z.infer<typeof BatchEvaluationResponseSchema>;

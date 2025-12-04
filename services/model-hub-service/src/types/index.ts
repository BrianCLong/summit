/**
 * @intelgraph/model-hub-service - Core Types
 *
 * Defines all types for the Model Hub Registry including:
 * - Model metadata and versioning
 * - Deployment configurations
 * - Policy profiles and governance
 * - Routing rules and traffic management
 */

import { z } from 'zod';

// ============================================================================
// Model Provider Types
// ============================================================================

export const ModelProviderSchema = z.enum([
  'self-hosted',
  'openai',
  'anthropic',
  'google',
  'azure',
  'aws-bedrock',
  'huggingface',
  'cohere',
  'replicate',
  'custom',
]);

export type ModelProvider = z.infer<typeof ModelProviderSchema>;

// ============================================================================
// Model Capability Types
// ============================================================================

export const ModelCapabilitySchema = z.enum([
  'nl-to-query',
  'rag',
  'classification',
  'embedding',
  'summarization',
  'translation',
  'code-generation',
  'image-analysis',
  'audio-transcription',
  'entity-extraction',
  'sentiment-analysis',
  'xai',
  'graph-reasoning',
  'anomaly-detection',
  'forecasting',
]);

export type ModelCapability = z.infer<typeof ModelCapabilitySchema>;

// ============================================================================
// Model Status Types
// ============================================================================

export const ModelStatusSchema = z.enum([
  'draft',
  'pending-review',
  'approved',
  'active',
  'deprecated',
  'retired',
  'suspended',
]);

export type ModelStatus = z.infer<typeof ModelStatusSchema>;

// ============================================================================
// Approval Status Types
// ============================================================================

export const ApprovalStatusSchema = z.enum([
  'pending',
  'approved',
  'rejected',
  'revoked',
]);

export type ApprovalStatus = z.infer<typeof ApprovalStatusSchema>;

// ============================================================================
// Model Schema
// ============================================================================

export const ModelSchema = z.object({
  id: z.string().uuid(),
  name: z.string().min(1).max(128),
  displayName: z.string().min(1).max(256),
  description: z.string().max(2048).optional(),
  provider: ModelProviderSchema,
  capabilities: z.array(ModelCapabilitySchema).min(1),
  status: ModelStatusSchema,
  tags: z.array(z.string().max(64)).max(20).default([]),
  metadata: z.record(z.string(), z.unknown()).default({}),
  createdAt: z.date(),
  updatedAt: z.date(),
  createdBy: z.string(),
  updatedBy: z.string(),
});

export type Model = z.infer<typeof ModelSchema>;

// ============================================================================
// Model Version Schema
// ============================================================================

export const ModelVersionSchema = z.object({
  id: z.string().uuid(),
  modelId: z.string().uuid(),
  version: z.string().regex(/^\d+\.\d+\.\d+(-[a-zA-Z0-9.]+)?$/, 'Must be semantic version'),
  status: ModelStatusSchema,
  endpoint: z.string().url().optional(),
  endpointType: z.enum(['rest', 'grpc', 'websocket']).default('rest'),
  credentials: z
    .object({
      secretRef: z.string().optional(),
      apiKeyEnvVar: z.string().optional(),
    })
    .optional(),
  configuration: z.object({
    maxTokens: z.number().positive().optional(),
    temperature: z.number().min(0).max(2).optional(),
    topP: z.number().min(0).max(1).optional(),
    frequencyPenalty: z.number().min(-2).max(2).optional(),
    presencePenalty: z.number().min(-2).max(2).optional(),
    stopSequences: z.array(z.string()).optional(),
    contextWindow: z.number().positive().optional(),
    tokenizer: z.string().optional(),
  }).default({}),
  resourceRequirements: z.object({
    minMemoryMb: z.number().positive().optional(),
    minCpuCores: z.number().positive().optional(),
    gpuRequired: z.boolean().default(false),
    gpuType: z.string().optional(),
    gpuMemoryMb: z.number().positive().optional(),
  }).default({}),
  performanceMetrics: z.object({
    avgLatencyMs: z.number().positive().optional(),
    p50LatencyMs: z.number().positive().optional(),
    p95LatencyMs: z.number().positive().optional(),
    p99LatencyMs: z.number().positive().optional(),
    throughputRps: z.number().positive().optional(),
    errorRate: z.number().min(0).max(1).optional(),
  }).default({}),
  evaluationResults: z.record(z.string(), z.number()).default({}),
  changelog: z.string().optional(),
  releaseNotes: z.string().optional(),
  createdAt: z.date(),
  updatedAt: z.date(),
  createdBy: z.string(),
  promotedAt: z.date().optional(),
  promotedBy: z.string().optional(),
});

export type ModelVersion = z.infer<typeof ModelVersionSchema>;

// ============================================================================
// Policy Profile Schema
// ============================================================================

export const PolicyProfileSchema = z.object({
  id: z.string().uuid(),
  name: z.string().min(1).max(128),
  description: z.string().max(2048).optional(),
  rules: z.object({
    maxTokensPerRequest: z.number().positive().optional(),
    maxTokensPerMinute: z.number().positive().optional(),
    maxTokensPerHour: z.number().positive().optional(),
    maxTokensPerDay: z.number().positive().optional(),
    maxCostPerRequest: z.number().positive().optional(),
    maxCostPerHour: z.number().positive().optional(),
    maxCostPerDay: z.number().positive().optional(),
    allowedCapabilities: z.array(ModelCapabilitySchema).optional(),
    blockedCapabilities: z.array(ModelCapabilitySchema).optional(),
    requireCitations: z.boolean().default(false),
    requireAuditLog: z.boolean().default(true),
    piiScrubbing: z.boolean().default(true),
    contentFiltering: z.boolean().default(true),
    maxConcurrentRequests: z.number().positive().optional(),
    timeoutMs: z.number().positive().default(30000),
    retryPolicy: z.object({
      maxRetries: z.number().min(0).max(5).default(3),
      backoffMultiplier: z.number().min(1).max(5).default(2),
      initialDelayMs: z.number().positive().default(1000),
    }).default({}),
  }),
  dataClassifications: z.array(z.enum([
    'unclassified',
    'cui',
    'confidential',
    'secret',
    'top-secret',
  ])).default(['unclassified']),
  complianceFrameworks: z.array(z.string()).default([]),
  isDefault: z.boolean().default(false),
  isActive: z.boolean().default(true),
  createdAt: z.date(),
  updatedAt: z.date(),
  createdBy: z.string(),
});

export type PolicyProfile = z.infer<typeof PolicyProfileSchema>;

// ============================================================================
// Deployment Configuration Schema
// ============================================================================

export const DeploymentEnvironmentSchema = z.enum([
  'development',
  'staging',
  'production',
  'airgapped',
]);

export type DeploymentEnvironment = z.infer<typeof DeploymentEnvironmentSchema>;

export const DeploymentModeSchema = z.enum([
  'active',
  'shadow',
  'canary',
  'blue-green',
  'disabled',
]);

export type DeploymentMode = z.infer<typeof DeploymentModeSchema>;

export const DeploymentConfigSchema = z.object({
  id: z.string().uuid(),
  modelVersionId: z.string().uuid(),
  environment: DeploymentEnvironmentSchema,
  mode: DeploymentModeSchema,
  trafficPercentage: z.number().min(0).max(100).default(0),
  policyProfileId: z.string().uuid().optional(),
  scaling: z.object({
    minReplicas: z.number().min(0).default(1),
    maxReplicas: z.number().positive().default(10),
    targetCpuUtilization: z.number().min(1).max(100).default(70),
    targetMemoryUtilization: z.number().min(1).max(100).default(80),
    scaleDownDelaySeconds: z.number().positive().default(300),
  }).default({}),
  healthCheck: z.object({
    enabled: z.boolean().default(true),
    path: z.string().default('/health'),
    intervalSeconds: z.number().positive().default(30),
    timeoutSeconds: z.number().positive().default(10),
    failureThreshold: z.number().positive().default(3),
    successThreshold: z.number().positive().default(1),
  }).default({}),
  circuitBreaker: z.object({
    enabled: z.boolean().default(true),
    failureRateThreshold: z.number().min(0).max(100).default(50),
    slowCallRateThreshold: z.number().min(0).max(100).default(80),
    slowCallDurationMs: z.number().positive().default(5000),
    minimumNumberOfCalls: z.number().positive().default(10),
    waitDurationInOpenStateMs: z.number().positive().default(60000),
    permittedCallsInHalfOpenState: z.number().positive().default(5),
  }).default({}),
  rolloutStrategy: z.object({
    type: z.enum(['immediate', 'gradual', 'scheduled']).default('gradual'),
    incrementPercentage: z.number().min(1).max(100).default(10),
    incrementIntervalSeconds: z.number().positive().default(300),
    scheduledAt: z.date().optional(),
    autoRollback: z.boolean().default(true),
    rollbackThreshold: z.object({
      errorRate: z.number().min(0).max(1).default(0.05),
      latencyP95Ms: z.number().positive().default(5000),
    }).default({}),
  }).default({}),
  isActive: z.boolean().default(false),
  activatedAt: z.date().optional(),
  activatedBy: z.string().optional(),
  deactivatedAt: z.date().optional(),
  deactivatedBy: z.string().optional(),
  createdAt: z.date(),
  updatedAt: z.date(),
  createdBy: z.string(),
});

export type DeploymentConfig = z.infer<typeof DeploymentConfigSchema>;

// ============================================================================
// Routing Rule Schema
// ============================================================================

export const RoutingConditionSchema = z.object({
  field: z.enum(['tenant_id', 'user_id', 'capability', 'feature', 'tag', 'header', 'custom']),
  operator: z.enum(['equals', 'not_equals', 'in', 'not_in', 'contains', 'starts_with', 'ends_with', 'regex']),
  value: z.union([z.string(), z.array(z.string())]),
});

export type RoutingCondition = z.infer<typeof RoutingConditionSchema>;

export const RoutingRuleSchema = z.object({
  id: z.string().uuid(),
  name: z.string().min(1).max(128),
  description: z.string().max(2048).optional(),
  priority: z.number().int().min(0).max(10000).default(1000),
  conditions: z.array(RoutingConditionSchema).min(1),
  conditionLogic: z.enum(['all', 'any']).default('all'),
  targetModelVersionId: z.string().uuid(),
  fallbackModelVersionId: z.string().uuid().optional(),
  isEnabled: z.boolean().default(true),
  validFrom: z.date().optional(),
  validUntil: z.date().optional(),
  metadata: z.record(z.string(), z.unknown()).default({}),
  createdAt: z.date(),
  updatedAt: z.date(),
  createdBy: z.string(),
});

export type RoutingRule = z.infer<typeof RoutingRuleSchema>;

// ============================================================================
// Tenant Model Binding Schema
// ============================================================================

export const TenantModelBindingSchema = z.object({
  id: z.string().uuid(),
  tenantId: z.string(),
  capability: ModelCapabilitySchema,
  modelVersionId: z.string().uuid(),
  policyProfileId: z.string().uuid().optional(),
  isEnabled: z.boolean().default(true),
  priority: z.number().int().min(0).default(0),
  metadata: z.record(z.string(), z.unknown()).default({}),
  createdAt: z.date(),
  updatedAt: z.date(),
  createdBy: z.string(),
});

export type TenantModelBinding = z.infer<typeof TenantModelBindingSchema>;

// ============================================================================
// Model Approval Schema
// ============================================================================

export const ModelApprovalSchema = z.object({
  id: z.string().uuid(),
  modelVersionId: z.string().uuid(),
  environment: DeploymentEnvironmentSchema,
  status: ApprovalStatusSchema,
  requestedBy: z.string(),
  requestedAt: z.date(),
  reviewedBy: z.string().optional(),
  reviewedAt: z.date().optional(),
  approvalNotes: z.string().max(4096).optional(),
  rejectionReason: z.string().max(4096).optional(),
  evaluationRequirements: z.array(z.string()).default([]),
  evaluationResults: z.record(z.string(), z.object({
    passed: z.boolean(),
    score: z.number().optional(),
    details: z.string().optional(),
  })).default({}),
  expiresAt: z.date().optional(),
  createdAt: z.date(),
  updatedAt: z.date(),
});

export type ModelApproval = z.infer<typeof ModelApprovalSchema>;

// ============================================================================
// Audit Event Schema
// ============================================================================

export const AuditEventTypeSchema = z.enum([
  'model.created',
  'model.updated',
  'model.deleted',
  'model_version.created',
  'model_version.promoted',
  'model_version.deprecated',
  'deployment.created',
  'deployment.activated',
  'deployment.deactivated',
  'deployment.traffic_updated',
  'deployment.rollback',
  'routing_rule.created',
  'routing_rule.updated',
  'routing_rule.deleted',
  'policy_profile.created',
  'policy_profile.updated',
  'approval.requested',
  'approval.approved',
  'approval.rejected',
  'approval.revoked',
  'tenant_binding.created',
  'tenant_binding.updated',
  'tenant_binding.deleted',
  'evaluation.started',
  'evaluation.completed',
  'evaluation.failed',
]);

export type AuditEventType = z.infer<typeof AuditEventTypeSchema>;

export const AuditEventSchema = z.object({
  id: z.string().uuid(),
  eventType: AuditEventTypeSchema,
  entityType: z.enum(['model', 'model_version', 'deployment', 'routing_rule', 'policy_profile', 'approval', 'tenant_binding', 'evaluation']),
  entityId: z.string().uuid(),
  actorId: z.string(),
  actorType: z.enum(['user', 'system', 'service']),
  tenantId: z.string().optional(),
  changes: z.object({
    before: z.record(z.string(), z.unknown()).optional(),
    after: z.record(z.string(), z.unknown()).optional(),
  }).optional(),
  metadata: z.record(z.string(), z.unknown()).default({}),
  ipAddress: z.string().optional(),
  userAgent: z.string().optional(),
  timestamp: z.date(),
});

export type AuditEvent = z.infer<typeof AuditEventSchema>;

// ============================================================================
// Model Selection Request/Response
// ============================================================================

export const ModelSelectionRequestSchema = z.object({
  capability: ModelCapabilitySchema,
  tenantId: z.string(),
  userId: z.string().optional(),
  featureFlags: z.array(z.string()).default([]),
  headers: z.record(z.string(), z.string()).default({}),
  preferredProvider: ModelProviderSchema.optional(),
  requiredTags: z.array(z.string()).optional(),
  excludeTags: z.array(z.string()).optional(),
  maxLatencyMs: z.number().positive().optional(),
  requireApproved: z.boolean().default(true),
});

export type ModelSelectionRequest = z.infer<typeof ModelSelectionRequestSchema>;

export const ModelSelectionResponseSchema = z.object({
  modelId: z.string().uuid(),
  modelVersionId: z.string().uuid(),
  modelName: z.string(),
  version: z.string(),
  endpoint: z.string().url(),
  endpointType: z.enum(['rest', 'grpc', 'websocket']),
  configuration: z.record(z.string(), z.unknown()),
  policyProfile: z.object({
    id: z.string().uuid(),
    name: z.string(),
    rules: z.record(z.string(), z.unknown()),
  }).optional(),
  routingMetadata: z.object({
    routingRuleId: z.string().uuid().optional(),
    deploymentMode: DeploymentModeSchema,
    trafficPercentage: z.number(),
    isShadow: z.boolean(),
  }),
  selectionTimestamp: z.date(),
});

export type ModelSelectionResponse = z.infer<typeof ModelSelectionResponseSchema>;

// ============================================================================
// Evaluation Types
// ============================================================================

export const EvaluationStatusSchema = z.enum([
  'pending',
  'running',
  'completed',
  'failed',
  'cancelled',
]);

export type EvaluationStatus = z.infer<typeof EvaluationStatusSchema>;

export const EvaluationRunSchema = z.object({
  id: z.string().uuid(),
  modelVersionId: z.string().uuid(),
  evaluationSuiteId: z.string(),
  status: EvaluationStatusSchema,
  startedAt: z.date().optional(),
  completedAt: z.date().optional(),
  results: z.object({
    metrics: z.record(z.string(), z.number()).default({}),
    passed: z.boolean().optional(),
    summary: z.string().optional(),
    detailedResults: z.array(z.object({
      testName: z.string(),
      passed: z.boolean(),
      score: z.number().optional(),
      expected: z.unknown().optional(),
      actual: z.unknown().optional(),
      error: z.string().optional(),
    })).default([]),
  }).default({}),
  errorMessage: z.string().optional(),
  triggeredBy: z.string(),
  triggerType: z.enum(['manual', 'promotion', 'scheduled', 'ci']),
  createdAt: z.date(),
  updatedAt: z.date(),
});

export type EvaluationRun = z.infer<typeof EvaluationRunSchema>;

// ============================================================================
// Input Schemas for API operations
// ============================================================================

export const CreateModelInputSchema = ModelSchema.omit({
  id: true,
  createdAt: true,
  updatedAt: true,
}).extend({
  status: ModelStatusSchema.default('draft'),
});

export type CreateModelInput = z.infer<typeof CreateModelInputSchema>;

export const UpdateModelInputSchema = ModelSchema.omit({
  id: true,
  createdAt: true,
  updatedAt: true,
  createdBy: true,
}).partial();

export type UpdateModelInput = z.infer<typeof UpdateModelInputSchema>;

export const CreateModelVersionInputSchema = ModelVersionSchema.omit({
  id: true,
  createdAt: true,
  updatedAt: true,
  promotedAt: true,
  promotedBy: true,
}).extend({
  status: ModelStatusSchema.default('draft'),
});

export type CreateModelVersionInput = z.infer<typeof CreateModelVersionInputSchema>;

export const CreateDeploymentConfigInputSchema = DeploymentConfigSchema.omit({
  id: true,
  createdAt: true,
  updatedAt: true,
  activatedAt: true,
  activatedBy: true,
  deactivatedAt: true,
  deactivatedBy: true,
});

export type CreateDeploymentConfigInput = z.infer<typeof CreateDeploymentConfigInputSchema>;

export const CreatePolicyProfileInputSchema = PolicyProfileSchema.omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export type CreatePolicyProfileInput = z.infer<typeof CreatePolicyProfileInputSchema>;

export const CreateRoutingRuleInputSchema = RoutingRuleSchema.omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export type CreateRoutingRuleInput = z.infer<typeof CreateRoutingRuleInputSchema>;

export const CreateTenantBindingInputSchema = TenantModelBindingSchema.omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export type CreateTenantBindingInput = z.infer<typeof CreateTenantBindingInputSchema>;

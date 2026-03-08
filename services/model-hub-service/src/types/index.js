"use strict";
/**
 * @intelgraph/model-hub-service - Core Types
 *
 * Defines all types for the Model Hub Registry including:
 * - Model metadata and versioning
 * - Deployment configurations
 * - Policy profiles and governance
 * - Routing rules and traffic management
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.CreateTenantBindingInputSchema = exports.CreateRoutingRuleInputSchema = exports.CreatePolicyProfileInputSchema = exports.CreateDeploymentConfigInputSchema = exports.CreateModelVersionInputSchema = exports.UpdateModelInputSchema = exports.CreateModelInputSchema = exports.EvaluationRunSchema = exports.EvaluationStatusSchema = exports.ModelSelectionResponseSchema = exports.ModelSelectionRequestSchema = exports.AuditEventSchema = exports.AuditEventTypeSchema = exports.ModelApprovalSchema = exports.TenantModelBindingSchema = exports.RoutingRuleSchema = exports.RoutingConditionSchema = exports.DeploymentConfigSchema = exports.DeploymentModeSchema = exports.DeploymentEnvironmentSchema = exports.PolicyProfileSchema = exports.ModelVersionSchema = exports.ModelSchema = exports.ApprovalStatusSchema = exports.ModelStatusSchema = exports.ModelCapabilitySchema = exports.ModelProviderSchema = void 0;
const zod_1 = require("zod");
// ============================================================================
// Model Provider Types
// ============================================================================
exports.ModelProviderSchema = zod_1.z.enum([
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
// ============================================================================
// Model Capability Types
// ============================================================================
exports.ModelCapabilitySchema = zod_1.z.enum([
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
// ============================================================================
// Model Status Types
// ============================================================================
exports.ModelStatusSchema = zod_1.z.enum([
    'draft',
    'pending-review',
    'approved',
    'active',
    'deprecated',
    'retired',
    'suspended',
]);
// ============================================================================
// Approval Status Types
// ============================================================================
exports.ApprovalStatusSchema = zod_1.z.enum([
    'pending',
    'approved',
    'rejected',
    'revoked',
]);
// ============================================================================
// Model Schema
// ============================================================================
exports.ModelSchema = zod_1.z.object({
    id: zod_1.z.string().uuid(),
    name: zod_1.z.string().min(1).max(128),
    displayName: zod_1.z.string().min(1).max(256),
    description: zod_1.z.string().max(2048).optional(),
    provider: exports.ModelProviderSchema,
    capabilities: zod_1.z.array(exports.ModelCapabilitySchema).min(1),
    status: exports.ModelStatusSchema,
    tags: zod_1.z.array(zod_1.z.string().max(64)).max(20).default([]),
    metadata: zod_1.z.record(zod_1.z.string(), zod_1.z.unknown()).default({}),
    createdAt: zod_1.z.date(),
    updatedAt: zod_1.z.date(),
    createdBy: zod_1.z.string(),
    updatedBy: zod_1.z.string(),
});
// ============================================================================
// Model Version Schema
// ============================================================================
exports.ModelVersionSchema = zod_1.z.object({
    id: zod_1.z.string().uuid(),
    modelId: zod_1.z.string().uuid(),
    version: zod_1.z.string().regex(/^\d+\.\d+\.\d+(-[a-zA-Z0-9.]+)?$/, 'Must be semantic version'),
    status: exports.ModelStatusSchema,
    endpoint: zod_1.z.string().url().optional(),
    endpointType: zod_1.z.enum(['rest', 'grpc', 'websocket']).default('rest'),
    credentials: zod_1.z
        .object({
        secretRef: zod_1.z.string().optional(),
        apiKeyEnvVar: zod_1.z.string().optional(),
    })
        .optional(),
    configuration: zod_1.z.object({
        maxTokens: zod_1.z.number().positive().optional(),
        temperature: zod_1.z.number().min(0).max(2).optional(),
        topP: zod_1.z.number().min(0).max(1).optional(),
        frequencyPenalty: zod_1.z.number().min(-2).max(2).optional(),
        presencePenalty: zod_1.z.number().min(-2).max(2).optional(),
        stopSequences: zod_1.z.array(zod_1.z.string()).optional(),
        contextWindow: zod_1.z.number().positive().optional(),
        tokenizer: zod_1.z.string().optional(),
    }).default({}),
    resourceRequirements: zod_1.z.object({
        minMemoryMb: zod_1.z.number().positive().optional(),
        minCpuCores: zod_1.z.number().positive().optional(),
        gpuRequired: zod_1.z.boolean().default(false),
        gpuType: zod_1.z.string().optional(),
        gpuMemoryMb: zod_1.z.number().positive().optional(),
    }).default({ gpuRequired: false }),
    performanceMetrics: zod_1.z.object({
        avgLatencyMs: zod_1.z.number().positive().optional(),
        p50LatencyMs: zod_1.z.number().positive().optional(),
        p95LatencyMs: zod_1.z.number().positive().optional(),
        p99LatencyMs: zod_1.z.number().positive().optional(),
        throughputRps: zod_1.z.number().positive().optional(),
        errorRate: zod_1.z.number().min(0).max(1).optional(),
    }).default({}),
    evaluationResults: zod_1.z.record(zod_1.z.string(), zod_1.z.number()).default({}),
    changelog: zod_1.z.string().optional(),
    releaseNotes: zod_1.z.string().optional(),
    createdAt: zod_1.z.date(),
    updatedAt: zod_1.z.date(),
    createdBy: zod_1.z.string(),
    promotedAt: zod_1.z.date().optional(),
    promotedBy: zod_1.z.string().optional(),
});
// ============================================================================
// Policy Profile Schema
// ============================================================================
exports.PolicyProfileSchema = zod_1.z.object({
    id: zod_1.z.string().uuid(),
    name: zod_1.z.string().min(1).max(128),
    description: zod_1.z.string().max(2048).optional(),
    rules: zod_1.z.object({
        maxTokensPerRequest: zod_1.z.number().positive().optional(),
        maxTokensPerMinute: zod_1.z.number().positive().optional(),
        maxTokensPerHour: zod_1.z.number().positive().optional(),
        maxTokensPerDay: zod_1.z.number().positive().optional(),
        maxCostPerRequest: zod_1.z.number().positive().optional(),
        maxCostPerHour: zod_1.z.number().positive().optional(),
        maxCostPerDay: zod_1.z.number().positive().optional(),
        allowedCapabilities: zod_1.z.array(exports.ModelCapabilitySchema).optional(),
        blockedCapabilities: zod_1.z.array(exports.ModelCapabilitySchema).optional(),
        requireCitations: zod_1.z.boolean().default(false),
        requireAuditLog: zod_1.z.boolean().default(true),
        piiScrubbing: zod_1.z.boolean().default(true),
        contentFiltering: zod_1.z.boolean().default(true),
        maxConcurrentRequests: zod_1.z.number().positive().optional(),
        timeoutMs: zod_1.z.number().positive().default(30000),
        retryPolicy: zod_1.z.object({
            maxRetries: zod_1.z.number().min(0).max(5).default(3),
            backoffMultiplier: zod_1.z.number().min(1).max(5).default(2),
            initialDelayMs: zod_1.z.number().positive().default(1000),
        }).default({
            maxRetries: 3,
            backoffMultiplier: 2,
            initialDelayMs: 1000,
        }),
    }),
    dataClassifications: zod_1.z.array(zod_1.z.enum([
        'unclassified',
        'cui',
        'confidential',
        'secret',
        'top-secret',
    ])).default(['unclassified']),
    complianceFrameworks: zod_1.z.array(zod_1.z.string()).default([]),
    isDefault: zod_1.z.boolean().default(false),
    isActive: zod_1.z.boolean().default(true),
    createdAt: zod_1.z.date(),
    updatedAt: zod_1.z.date(),
    createdBy: zod_1.z.string(),
});
// ============================================================================
// Deployment Configuration Schema
// ============================================================================
exports.DeploymentEnvironmentSchema = zod_1.z.enum([
    'development',
    'staging',
    'production',
    'airgapped',
]);
exports.DeploymentModeSchema = zod_1.z.enum([
    'active',
    'shadow',
    'canary',
    'blue-green',
    'disabled',
]);
exports.DeploymentConfigSchema = zod_1.z.object({
    id: zod_1.z.string().uuid(),
    modelVersionId: zod_1.z.string().uuid(),
    environment: exports.DeploymentEnvironmentSchema,
    mode: exports.DeploymentModeSchema,
    trafficPercentage: zod_1.z.number().min(0).max(100).default(0),
    policyProfileId: zod_1.z.string().uuid().optional(),
    scaling: zod_1.z.object({
        minReplicas: zod_1.z.number().min(0).default(1),
        maxReplicas: zod_1.z.number().positive().default(10),
        targetCpuUtilization: zod_1.z.number().min(1).max(100).default(70),
        targetMemoryUtilization: zod_1.z.number().min(1).max(100).default(80),
        scaleDownDelaySeconds: zod_1.z.number().positive().default(300),
    }).default({
        minReplicas: 1,
        maxReplicas: 10,
        targetCpuUtilization: 70,
        targetMemoryUtilization: 80,
        scaleDownDelaySeconds: 300,
    }),
    healthCheck: zod_1.z.object({
        enabled: zod_1.z.boolean().default(true),
        path: zod_1.z.string().default('/health'),
        intervalSeconds: zod_1.z.number().positive().default(30),
        timeoutSeconds: zod_1.z.number().positive().default(10),
        failureThreshold: zod_1.z.number().positive().default(3),
        successThreshold: zod_1.z.number().positive().default(1),
    }).default({
        enabled: true,
        path: '/health',
        intervalSeconds: 30,
        timeoutSeconds: 10,
        failureThreshold: 3,
        successThreshold: 1,
    }),
    circuitBreaker: zod_1.z.object({
        enabled: zod_1.z.boolean().default(true),
        failureRateThreshold: zod_1.z.number().min(0).max(100).default(50),
        slowCallRateThreshold: zod_1.z.number().min(0).max(100).default(80),
        slowCallDurationMs: zod_1.z.number().positive().default(5000),
        minimumNumberOfCalls: zod_1.z.number().positive().default(10),
        waitDurationInOpenStateMs: zod_1.z.number().positive().default(60000),
        permittedCallsInHalfOpenState: zod_1.z.number().positive().default(5),
    }).default({
        enabled: true,
        failureRateThreshold: 50,
        slowCallRateThreshold: 80,
        slowCallDurationMs: 5000,
        minimumNumberOfCalls: 10,
        waitDurationInOpenStateMs: 60000,
        permittedCallsInHalfOpenState: 5,
    }),
    rolloutStrategy: zod_1.z.object({
        type: zod_1.z.enum(['immediate', 'gradual', 'scheduled']).default('gradual'),
        incrementPercentage: zod_1.z.number().min(1).max(100).default(10),
        incrementIntervalSeconds: zod_1.z.number().positive().default(300),
        scheduledAt: zod_1.z.date().optional(),
        autoRollback: zod_1.z.boolean().default(true),
        rollbackThreshold: zod_1.z.object({
            errorRate: zod_1.z.number().min(0).max(1).default(0.05),
            latencyP95Ms: zod_1.z.number().positive().default(5000),
        }).default({
            errorRate: 0.05,
            latencyP95Ms: 5000,
        }),
    }).default({
        type: 'gradual',
        incrementPercentage: 10,
        incrementIntervalSeconds: 300,
        autoRollback: true,
        rollbackThreshold: {
            errorRate: 0.05,
            latencyP95Ms: 5000,
        },
    }),
    isActive: zod_1.z.boolean().default(false),
    activatedAt: zod_1.z.date().optional(),
    activatedBy: zod_1.z.string().optional(),
    deactivatedAt: zod_1.z.date().optional(),
    deactivatedBy: zod_1.z.string().optional(),
    createdAt: zod_1.z.date(),
    updatedAt: zod_1.z.date(),
    createdBy: zod_1.z.string(),
});
// ============================================================================
// Routing Rule Schema
// ============================================================================
exports.RoutingConditionSchema = zod_1.z.object({
    field: zod_1.z.enum(['tenant_id', 'user_id', 'capability', 'feature', 'tag', 'header', 'custom']),
    operator: zod_1.z.enum(['equals', 'not_equals', 'in', 'not_in', 'contains', 'starts_with', 'ends_with', 'regex']),
    value: zod_1.z.union([zod_1.z.string(), zod_1.z.array(zod_1.z.string())]),
});
exports.RoutingRuleSchema = zod_1.z.object({
    id: zod_1.z.string().uuid(),
    name: zod_1.z.string().min(1).max(128),
    description: zod_1.z.string().max(2048).optional(),
    priority: zod_1.z.number().int().min(0).max(10000).default(1000),
    conditions: zod_1.z.array(exports.RoutingConditionSchema).min(1),
    conditionLogic: zod_1.z.enum(['all', 'any']).default('all'),
    targetModelVersionId: zod_1.z.string().uuid(),
    fallbackModelVersionId: zod_1.z.string().uuid().optional(),
    isEnabled: zod_1.z.boolean().default(true),
    validFrom: zod_1.z.date().optional(),
    validUntil: zod_1.z.date().optional(),
    metadata: zod_1.z.record(zod_1.z.string(), zod_1.z.unknown()).default({}),
    createdAt: zod_1.z.date(),
    updatedAt: zod_1.z.date(),
    createdBy: zod_1.z.string(),
});
// ============================================================================
// Tenant Model Binding Schema
// ============================================================================
exports.TenantModelBindingSchema = zod_1.z.object({
    id: zod_1.z.string().uuid(),
    tenantId: zod_1.z.string(),
    capability: exports.ModelCapabilitySchema,
    modelVersionId: zod_1.z.string().uuid(),
    policyProfileId: zod_1.z.string().uuid().optional(),
    isEnabled: zod_1.z.boolean().default(true),
    priority: zod_1.z.number().int().min(0).default(0),
    metadata: zod_1.z.record(zod_1.z.string(), zod_1.z.unknown()).default({}),
    createdAt: zod_1.z.date(),
    updatedAt: zod_1.z.date(),
    createdBy: zod_1.z.string(),
});
// ============================================================================
// Model Approval Schema
// ============================================================================
exports.ModelApprovalSchema = zod_1.z.object({
    id: zod_1.z.string().uuid(),
    modelVersionId: zod_1.z.string().uuid(),
    environment: exports.DeploymentEnvironmentSchema,
    status: exports.ApprovalStatusSchema,
    requestedBy: zod_1.z.string(),
    requestedAt: zod_1.z.date(),
    reviewedBy: zod_1.z.string().optional(),
    reviewedAt: zod_1.z.date().optional(),
    approvalNotes: zod_1.z.string().max(4096).optional(),
    rejectionReason: zod_1.z.string().max(4096).optional(),
    evaluationRequirements: zod_1.z.array(zod_1.z.string()).default([]),
    evaluationResults: zod_1.z.record(zod_1.z.string(), zod_1.z.object({
        passed: zod_1.z.boolean(),
        score: zod_1.z.number().optional(),
        details: zod_1.z.string().optional(),
    })).default({}),
    expiresAt: zod_1.z.date().optional(),
    createdAt: zod_1.z.date(),
    updatedAt: zod_1.z.date(),
});
// ============================================================================
// Audit Event Schema
// ============================================================================
exports.AuditEventTypeSchema = zod_1.z.enum([
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
exports.AuditEventSchema = zod_1.z.object({
    id: zod_1.z.string().uuid(),
    eventType: exports.AuditEventTypeSchema,
    entityType: zod_1.z.enum(['model', 'model_version', 'deployment', 'routing_rule', 'policy_profile', 'approval', 'tenant_binding', 'evaluation']),
    entityId: zod_1.z.string().uuid(),
    actorId: zod_1.z.string(),
    actorType: zod_1.z.enum(['user', 'system', 'service']),
    tenantId: zod_1.z.string().optional(),
    changes: zod_1.z.object({
        before: zod_1.z.record(zod_1.z.string(), zod_1.z.unknown()).optional(),
        after: zod_1.z.record(zod_1.z.string(), zod_1.z.unknown()).optional(),
    }).optional(),
    metadata: zod_1.z.record(zod_1.z.string(), zod_1.z.unknown()).default({}),
    ipAddress: zod_1.z.string().optional(),
    userAgent: zod_1.z.string().optional(),
    timestamp: zod_1.z.date(),
});
// ============================================================================
// Model Selection Request/Response
// ============================================================================
exports.ModelSelectionRequestSchema = zod_1.z.object({
    capability: exports.ModelCapabilitySchema,
    tenantId: zod_1.z.string(),
    userId: zod_1.z.string().optional(),
    featureFlags: zod_1.z.array(zod_1.z.string()).default([]),
    headers: zod_1.z.record(zod_1.z.string(), zod_1.z.string()).default({}),
    preferredProvider: exports.ModelProviderSchema.optional(),
    requiredTags: zod_1.z.array(zod_1.z.string()).optional(),
    excludeTags: zod_1.z.array(zod_1.z.string()).optional(),
    maxLatencyMs: zod_1.z.number().positive().optional(),
    requireApproved: zod_1.z.boolean().default(true),
});
exports.ModelSelectionResponseSchema = zod_1.z.object({
    modelId: zod_1.z.string().uuid(),
    modelVersionId: zod_1.z.string().uuid(),
    modelName: zod_1.z.string(),
    version: zod_1.z.string(),
    endpoint: zod_1.z.string().url(),
    endpointType: zod_1.z.enum(['rest', 'grpc', 'websocket']),
    configuration: zod_1.z.record(zod_1.z.string(), zod_1.z.unknown()),
    policyProfile: zod_1.z.object({
        id: zod_1.z.string().uuid(),
        name: zod_1.z.string(),
        rules: zod_1.z.record(zod_1.z.string(), zod_1.z.unknown()),
    }).optional(),
    routingMetadata: zod_1.z.object({
        routingRuleId: zod_1.z.string().uuid().optional(),
        deploymentMode: exports.DeploymentModeSchema,
        trafficPercentage: zod_1.z.number(),
        isShadow: zod_1.z.boolean(),
    }),
    selectionTimestamp: zod_1.z.date(),
});
// ============================================================================
// Evaluation Types
// ============================================================================
exports.EvaluationStatusSchema = zod_1.z.enum([
    'pending',
    'running',
    'completed',
    'failed',
    'cancelled',
]);
exports.EvaluationRunSchema = zod_1.z.object({
    id: zod_1.z.string().uuid(),
    modelVersionId: zod_1.z.string().uuid(),
    evaluationSuiteId: zod_1.z.string(),
    status: exports.EvaluationStatusSchema,
    startedAt: zod_1.z.date().optional(),
    completedAt: zod_1.z.date().optional(),
    results: zod_1.z.object({
        metrics: zod_1.z.record(zod_1.z.string(), zod_1.z.number()).default({}),
        passed: zod_1.z.boolean().optional(),
        summary: zod_1.z.string().optional(),
        detailedResults: zod_1.z.array(zod_1.z.object({
            testName: zod_1.z.string(),
            passed: zod_1.z.boolean(),
            score: zod_1.z.number().optional(),
            expected: zod_1.z.unknown().optional(),
            actual: zod_1.z.unknown().optional(),
            error: zod_1.z.string().optional(),
        })).default([]),
    }).default({ metrics: {}, detailedResults: [] }),
    errorMessage: zod_1.z.string().optional(),
    triggeredBy: zod_1.z.string(),
    triggerType: zod_1.z.enum(['manual', 'promotion', 'scheduled', 'ci']),
    createdAt: zod_1.z.date(),
    updatedAt: zod_1.z.date(),
});
// ============================================================================
// Input Schemas for API operations
// ============================================================================
exports.CreateModelInputSchema = exports.ModelSchema.omit({
    id: true,
    createdAt: true,
    updatedAt: true,
}).extend({
    status: exports.ModelStatusSchema.default('draft'),
});
exports.UpdateModelInputSchema = exports.ModelSchema.omit({
    id: true,
    createdAt: true,
    updatedAt: true,
    createdBy: true,
}).partial();
exports.CreateModelVersionInputSchema = exports.ModelVersionSchema.omit({
    id: true,
    createdAt: true,
    updatedAt: true,
    promotedAt: true,
    promotedBy: true,
}).extend({
    status: exports.ModelStatusSchema.default('draft'),
});
exports.CreateDeploymentConfigInputSchema = exports.DeploymentConfigSchema.omit({
    id: true,
    createdAt: true,
    updatedAt: true,
    activatedAt: true,
    activatedBy: true,
    deactivatedAt: true,
    deactivatedBy: true,
});
exports.CreatePolicyProfileInputSchema = exports.PolicyProfileSchema.omit({
    id: true,
    createdAt: true,
    updatedAt: true,
});
exports.CreateRoutingRuleInputSchema = exports.RoutingRuleSchema.omit({
    id: true,
    createdAt: true,
    updatedAt: true,
});
exports.CreateTenantBindingInputSchema = exports.TenantModelBindingSchema.omit({
    id: true,
    createdAt: true,
    updatedAt: true,
});

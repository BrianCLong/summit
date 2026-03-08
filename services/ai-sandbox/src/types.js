"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.DeploymentRequestSchema = exports.ExecutionResultSchema = exports.ExperimentRequestSchema = exports.AIModelConfigSchema = exports.SandboxEnvironmentSchema = exports.ResourceQuotasSchema = exports.ComplianceFrameworkSchema = void 0;
const zod_1 = require("zod");
// Compliance frameworks supported
exports.ComplianceFrameworkSchema = zod_1.z.enum([
    'FEDRAMP_HIGH',
    'FEDRAMP_MODERATE',
    'FISMA',
    'NIST_800_53',
    'NIST_AI_RMF',
    'EXECUTIVE_ORDER_14110',
    'OMB_M_24_10',
]);
// Resource quotas for sandbox execution
exports.ResourceQuotasSchema = zod_1.z.object({
    cpuMs: zod_1.z.number().min(10).max(300000).default(30000),
    memoryMb: zod_1.z.number().min(64).max(8192).default(512),
    timeoutMs: zod_1.z.number().min(1000).max(600000).default(60000),
    maxOutputBytes: zod_1.z.number().min(1024).max(10485760).default(1048576),
    networkEnabled: zod_1.z.boolean().default(false),
    storageEnabled: zod_1.z.boolean().default(false),
});
// Sandbox environment configuration
exports.SandboxEnvironmentSchema = zod_1.z.object({
    id: zod_1.z.string().uuid(),
    name: zod_1.z.string().min(1).max(255),
    description: zod_1.z.string().optional(),
    agencyId: zod_1.z.string(),
    complianceFrameworks: zod_1.z.array(exports.ComplianceFrameworkSchema),
    resourceQuotas: exports.ResourceQuotasSchema,
    allowedModules: zod_1.z.array(zod_1.z.string()).default([]),
    blockedModules: zod_1.z.array(zod_1.z.string()).default([]),
    networkAllowlist: zod_1.z.array(zod_1.z.string()).default([]),
    createdAt: zod_1.z.date(),
    updatedAt: zod_1.z.date(),
    expiresAt: zod_1.z.date().optional(),
    status: zod_1.z.enum(['active', 'suspended', 'expired']).default('active'),
});
// AI model configuration for sandbox
exports.AIModelConfigSchema = zod_1.z.object({
    modelId: zod_1.z.string(),
    modelType: zod_1.z.enum(['llm', 'vision', 'speech', 'multimodal', 'custom']),
    provider: zod_1.z.string(),
    version: zod_1.z.string(),
    parameters: zod_1.z.record(zod_1.z.unknown()).default({}),
    inputSchema: zod_1.z.record(zod_1.z.unknown()).optional(),
    outputSchema: zod_1.z.record(zod_1.z.unknown()).optional(),
});
// Experiment request
exports.ExperimentRequestSchema = zod_1.z.object({
    environmentId: zod_1.z.string().uuid(),
    name: zod_1.z.string().min(1).max(255),
    description: zod_1.z.string().optional(),
    modelConfig: exports.AIModelConfigSchema,
    testCases: zod_1.z.array(zod_1.z.object({
        id: zod_1.z.string(),
        name: zod_1.z.string(),
        input: zod_1.z.unknown(),
        expectedOutput: zod_1.z.unknown().optional(),
        tags: zod_1.z.array(zod_1.z.string()).default([]),
    })),
    validationRules: zod_1.z
        .array(zod_1.z.object({
        type: zod_1.z.enum([
            'accuracy',
            'bias',
            'safety',
            'latency',
            'compliance',
            'custom',
        ]),
        threshold: zod_1.z.number().optional(),
        config: zod_1.z.record(zod_1.z.unknown()).default({}),
    }))
        .default([]),
    metadata: zod_1.z.record(zod_1.z.unknown()).default({}),
});
// Execution result
exports.ExecutionResultSchema = zod_1.z.object({
    id: zod_1.z.string().uuid(),
    experimentId: zod_1.z.string().uuid(),
    environmentId: zod_1.z.string().uuid(),
    status: zod_1.z.enum(['pending', 'running', 'completed', 'failed', 'timeout', 'cancelled']),
    startedAt: zod_1.z.date().optional(),
    completedAt: zod_1.z.date().optional(),
    resourceUsage: zod_1.z.object({
        cpuMs: zod_1.z.number(),
        memoryPeakMb: zod_1.z.number(),
        durationMs: zod_1.z.number(),
        outputBytes: zod_1.z.number(),
    }).optional(),
    results: zod_1.z.array(zod_1.z.object({
        testCaseId: zod_1.z.string(),
        status: zod_1.z.enum(['passed', 'failed', 'error', 'skipped']),
        output: zod_1.z.unknown().optional(),
        error: zod_1.z.string().optional(),
        validationResults: zod_1.z.array(zod_1.z.object({
            ruleType: zod_1.z.string(),
            passed: zod_1.z.boolean(),
            score: zod_1.z.number().optional(),
            details: zod_1.z.record(zod_1.z.unknown()).default({}),
        })).default([]),
        durationMs: zod_1.z.number(),
    })).default([]),
    complianceReport: zod_1.z.object({
        frameworks: zod_1.z.array(exports.ComplianceFrameworkSchema),
        passed: zod_1.z.boolean(),
        findings: zod_1.z.array(zod_1.z.object({
            severity: zod_1.z.enum(['critical', 'high', 'medium', 'low', 'info']),
            framework: exports.ComplianceFrameworkSchema,
            control: zod_1.z.string(),
            description: zod_1.z.string(),
            remediation: zod_1.z.string().optional(),
        })).default([]),
    }).optional(),
    auditTrail: zod_1.z.array(zod_1.z.object({
        timestamp: zod_1.z.date(),
        action: zod_1.z.string(),
        actor: zod_1.z.string(),
        details: zod_1.z.record(zod_1.z.unknown()).default({}),
    })).default([]),
});
// Fast-track deployment request
exports.DeploymentRequestSchema = zod_1.z.object({
    experimentId: zod_1.z.string().uuid(),
    targetEnvironment: zod_1.z.enum(['staging', 'production']),
    approvals: zod_1.z.array(zod_1.z.object({
        approverId: zod_1.z.string(),
        role: zod_1.z.string(),
        approvedAt: zod_1.z.date(),
        signature: zod_1.z.string().optional(),
    })),
    deploymentConfig: zod_1.z.object({
        replicas: zod_1.z.number().min(1).max(100).default(1),
        resources: exports.ResourceQuotasSchema,
        rolloutStrategy: zod_1.z.enum(['immediate', 'canary', 'blue_green']).default('canary'),
        healthCheckPath: zod_1.z.string().default('/health'),
        autoRollback: zod_1.z.boolean().default(true),
    }),
});

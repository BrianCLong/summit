"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.ComplianceReportSchema = exports.AnalyticsEventSchema = exports.ServiceTemplateSchema = exports.DeploymentSchema = exports.ServiceDefinitionSchema = void 0;
const zod_1 = require("zod");
// Service Definition Schema
exports.ServiceDefinitionSchema = zod_1.z.object({
    id: zod_1.z.string().uuid().optional(),
    name: zod_1.z.string().min(1).max(100),
    version: zod_1.z.string().regex(/^\d+\.\d+\.\d+$/),
    description: zod_1.z.string().max(1000),
    type: zod_1.z.enum(['llm', 'vision', 'nlp', 'prediction', 'embedding', 'custom']),
    templateId: zod_1.z.string().optional(),
    config: zod_1.z.object({
        model: zod_1.z.string().optional(),
        maxConcurrency: zod_1.z.number().min(1).max(1000).default(10),
        timeoutMs: zod_1.z.number().min(1000).max(300000).default(30000),
        retryPolicy: zod_1.z.object({
            maxRetries: zod_1.z.number().min(0).max(10).default(3),
            backoffMs: zod_1.z.number().min(100).max(10000).default(1000),
        }).optional(),
        scaling: zod_1.z.object({
            minReplicas: zod_1.z.number().min(0).max(100).default(1),
            maxReplicas: zod_1.z.number().min(1).max(100).default(10),
            targetCPU: zod_1.z.number().min(1).max(100).default(70),
            targetMemory: zod_1.z.number().min(1).max(100).optional(),
        }).optional(),
        resources: zod_1.z.object({
            cpu: zod_1.z.string().default('500m'),
            memory: zod_1.z.string().default('512Mi'),
            gpu: zod_1.z.string().optional(),
        }).optional(),
    }),
    compliance: zod_1.z.object({
        dataClassification: zod_1.z.enum(['public', 'internal', 'confidential', 'restricted']).default('internal'),
        piiHandling: zod_1.z.boolean().default(false),
        auditLogging: zod_1.z.boolean().default(true),
        encryption: zod_1.z.object({
            atRest: zod_1.z.boolean().default(true),
            inTransit: zod_1.z.boolean().default(true),
        }).optional(),
        certifications: zod_1.z.array(zod_1.z.enum(['fedramp', 'soc2', 'hipaa', 'gdpr'])).default([]),
    }).optional(),
    endpoints: zod_1.z.array(zod_1.z.object({
        path: zod_1.z.string(),
        method: zod_1.z.enum(['GET', 'POST', 'PUT', 'DELETE']),
        rateLimit: zod_1.z.number().optional(),
        auth: zod_1.z.boolean().default(true),
    })).optional(),
    healthCheck: zod_1.z.object({
        path: zod_1.z.string().default('/health'),
        intervalSeconds: zod_1.z.number().default(30),
        timeoutSeconds: zod_1.z.number().default(5),
    }).optional(),
    metadata: zod_1.z.record(zod_1.z.string()).optional(),
    createdAt: zod_1.z.date().optional(),
    updatedAt: zod_1.z.date().optional(),
});
// Deployment Schema
exports.DeploymentSchema = zod_1.z.object({
    id: zod_1.z.string().uuid(),
    serviceId: zod_1.z.string().uuid(),
    environment: zod_1.z.enum(['development', 'staging', 'production']),
    status: zod_1.z.enum(['pending', 'provisioning', 'running', 'failed', 'stopped', 'scaling']),
    version: zod_1.z.string(),
    replicas: zod_1.z.object({
        desired: zod_1.z.number(),
        ready: zod_1.z.number(),
        available: zod_1.z.number(),
    }),
    endpoints: zod_1.z.array(zod_1.z.object({
        url: zod_1.z.string().url(),
        type: zod_1.z.enum(['internal', 'external']),
    })),
    complianceStatus: zod_1.z.object({
        passed: zod_1.z.boolean(),
        checks: zod_1.z.array(zod_1.z.object({
            name: zod_1.z.string(),
            status: zod_1.z.enum(['passed', 'failed', 'warning']),
            message: zod_1.z.string().optional(),
        })),
    }),
    metrics: zod_1.z.object({
        requestsPerSecond: zod_1.z.number(),
        avgLatencyMs: zod_1.z.number(),
        errorRate: zod_1.z.number(),
        uptime: zod_1.z.number(),
    }).optional(),
    createdAt: zod_1.z.date(),
    updatedAt: zod_1.z.date(),
});
// Service Template Schema
exports.ServiceTemplateSchema = zod_1.z.object({
    id: zod_1.z.string(),
    name: zod_1.z.string(),
    description: zod_1.z.string(),
    category: zod_1.z.enum(['llm', 'vision', 'nlp', 'prediction', 'embedding', 'workflow']),
    baseImage: zod_1.z.string(),
    defaultConfig: zod_1.z.record(zod_1.z.unknown()),
    requiredEnvVars: zod_1.z.array(zod_1.z.string()),
    optionalEnvVars: zod_1.z.array(zod_1.z.string()),
    ports: zod_1.z.array(zod_1.z.object({
        containerPort: zod_1.z.number(),
        protocol: zod_1.z.enum(['TCP', 'UDP']).default('TCP'),
    })),
    volumes: zod_1.z.array(zod_1.z.object({
        name: zod_1.z.string(),
        mountPath: zod_1.z.string(),
        size: zod_1.z.string(),
    })).optional(),
    preDeployHooks: zod_1.z.array(zod_1.z.string()).optional(),
    postDeployHooks: zod_1.z.array(zod_1.z.string()).optional(),
});
// Analytics Event Schema
exports.AnalyticsEventSchema = zod_1.z.object({
    id: zod_1.z.string().uuid(),
    serviceId: zod_1.z.string().uuid(),
    deploymentId: zod_1.z.string().uuid(),
    eventType: zod_1.z.enum([
        'request', 'error', 'latency', 'scaling',
        'deployment', 'compliance_check', 'health_check'
    ]),
    timestamp: zod_1.z.date(),
    data: zod_1.z.record(zod_1.z.unknown()),
    dimensions: zod_1.z.record(zod_1.z.string()).optional(),
});
// Compliance Report Schema
exports.ComplianceReportSchema = zod_1.z.object({
    id: zod_1.z.string().uuid(),
    serviceId: zod_1.z.string().uuid(),
    generatedAt: zod_1.z.date(),
    status: zod_1.z.enum(['compliant', 'non_compliant', 'partial']),
    framework: zod_1.z.enum(['fedramp', 'soc2', 'hipaa', 'gdpr', 'internal']),
    findings: zod_1.z.array(zod_1.z.object({
        control: zod_1.z.string(),
        status: zod_1.z.enum(['passed', 'failed', 'not_applicable']),
        evidence: zod_1.z.string().optional(),
        remediation: zod_1.z.string().optional(),
    })),
    nextAuditDate: zod_1.z.date().optional(),
});

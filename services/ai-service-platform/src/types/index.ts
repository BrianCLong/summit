import { z } from 'zod';

// Service Definition Schema
export const ServiceDefinitionSchema = z.object({
  id: z.string().uuid().optional(),
  name: z.string().min(1).max(100),
  version: z.string().regex(/^\d+\.\d+\.\d+$/),
  description: z.string().max(1000),
  type: z.enum(['llm', 'vision', 'nlp', 'prediction', 'embedding', 'custom']),
  templateId: z.string().optional(),
  config: z.object({
    model: z.string().optional(),
    maxConcurrency: z.number().min(1).max(1000).default(10),
    timeoutMs: z.number().min(1000).max(300000).default(30000),
    retryPolicy: z.object({
      maxRetries: z.number().min(0).max(10).default(3),
      backoffMs: z.number().min(100).max(10000).default(1000),
    }).optional(),
    scaling: z.object({
      minReplicas: z.number().min(0).max(100).default(1),
      maxReplicas: z.number().min(1).max(100).default(10),
      targetCPU: z.number().min(1).max(100).default(70),
      targetMemory: z.number().min(1).max(100).optional(),
    }).optional(),
    resources: z.object({
      cpu: z.string().default('500m'),
      memory: z.string().default('512Mi'),
      gpu: z.string().optional(),
    }).optional(),
  }),
  compliance: z.object({
    dataClassification: z.enum(['public', 'internal', 'confidential', 'restricted']).default('internal'),
    piiHandling: z.boolean().default(false),
    auditLogging: z.boolean().default(true),
    encryption: z.object({
      atRest: z.boolean().default(true),
      inTransit: z.boolean().default(true),
    }).optional(),
    certifications: z.array(z.enum(['fedramp', 'soc2', 'hipaa', 'gdpr'])).default([]),
  }).optional(),
  endpoints: z.array(z.object({
    path: z.string(),
    method: z.enum(['GET', 'POST', 'PUT', 'DELETE']),
    rateLimit: z.number().optional(),
    auth: z.boolean().default(true),
  })).optional(),
  healthCheck: z.object({
    path: z.string().default('/health'),
    intervalSeconds: z.number().default(30),
    timeoutSeconds: z.number().default(5),
  }).optional(),
  metadata: z.record(z.string()).optional(),
  createdAt: z.date().optional(),
  updatedAt: z.date().optional(),
});

export type ServiceDefinition = z.infer<typeof ServiceDefinitionSchema>;

// Deployment Schema
export const DeploymentSchema = z.object({
  id: z.string().uuid(),
  serviceId: z.string().uuid(),
  environment: z.enum(['development', 'staging', 'production']),
  status: z.enum(['pending', 'provisioning', 'running', 'failed', 'stopped', 'scaling']),
  version: z.string(),
  replicas: z.object({
    desired: z.number(),
    ready: z.number(),
    available: z.number(),
  }),
  endpoints: z.array(z.object({
    url: z.string().url(),
    type: z.enum(['internal', 'external']),
  })),
  complianceStatus: z.object({
    passed: z.boolean(),
    checks: z.array(z.object({
      name: z.string(),
      status: z.enum(['passed', 'failed', 'warning']),
      message: z.string().optional(),
    })),
  }),
  metrics: z.object({
    requestsPerSecond: z.number(),
    avgLatencyMs: z.number(),
    errorRate: z.number(),
    uptime: z.number(),
  }).optional(),
  createdAt: z.date(),
  updatedAt: z.date(),
});

export type Deployment = z.infer<typeof DeploymentSchema>;

// Service Template Schema
export const ServiceTemplateSchema = z.object({
  id: z.string(),
  name: z.string(),
  description: z.string(),
  category: z.enum(['llm', 'vision', 'nlp', 'prediction', 'embedding', 'workflow']),
  baseImage: z.string(),
  defaultConfig: z.record(z.unknown()),
  requiredEnvVars: z.array(z.string()),
  optionalEnvVars: z.array(z.string()),
  ports: z.array(z.object({
    containerPort: z.number(),
    protocol: z.enum(['TCP', 'UDP']).default('TCP'),
  })),
  volumes: z.array(z.object({
    name: z.string(),
    mountPath: z.string(),
    size: z.string(),
  })).optional(),
  preDeployHooks: z.array(z.string()).optional(),
  postDeployHooks: z.array(z.string()).optional(),
});

export type ServiceTemplate = z.infer<typeof ServiceTemplateSchema>;

// Analytics Event Schema
export const AnalyticsEventSchema = z.object({
  id: z.string().uuid(),
  serviceId: z.string().uuid(),
  deploymentId: z.string().uuid(),
  eventType: z.enum([
    'request', 'error', 'latency', 'scaling',
    'deployment', 'compliance_check', 'health_check'
  ]),
  timestamp: z.date(),
  data: z.record(z.unknown()),
  dimensions: z.record(z.string()).optional(),
});

export type AnalyticsEvent = z.infer<typeof AnalyticsEventSchema>;

// Compliance Report Schema
export const ComplianceReportSchema = z.object({
  id: z.string().uuid(),
  serviceId: z.string().uuid(),
  generatedAt: z.date(),
  status: z.enum(['compliant', 'non_compliant', 'partial']),
  framework: z.enum(['fedramp', 'soc2', 'hipaa', 'gdpr', 'internal']),
  findings: z.array(z.object({
    control: z.string(),
    status: z.enum(['passed', 'failed', 'not_applicable']),
    evidence: z.string().optional(),
    remediation: z.string().optional(),
  })),
  nextAuditDate: z.date().optional(),
});

export type ComplianceReport = z.infer<typeof ComplianceReportSchema>;

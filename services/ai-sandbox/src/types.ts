import { z } from 'zod';

// Sandbox execution status
export type ExecutionStatus =
  | 'pending'
  | 'running'
  | 'completed'
  | 'failed'
  | 'timeout'
  | 'cancelled';

// Compliance frameworks supported
export const ComplianceFrameworkSchema = z.enum([
  'FEDRAMP_HIGH',
  'FEDRAMP_MODERATE',
  'FISMA',
  'NIST_800_53',
  'NIST_AI_RMF',
  'EXECUTIVE_ORDER_14110',
  'OMB_M_24_10',
]);
export type ComplianceFramework = z.infer<typeof ComplianceFrameworkSchema>;

// Resource quotas for sandbox execution
export const ResourceQuotasSchema = z.object({
  cpuMs: z.number().min(10).max(300000).default(30000),
  memoryMb: z.number().min(64).max(8192).default(512),
  timeoutMs: z.number().min(1000).max(600000).default(60000),
  maxOutputBytes: z.number().min(1024).max(10485760).default(1048576),
  networkEnabled: z.boolean().default(false),
  storageEnabled: z.boolean().default(false),
});
export type ResourceQuotas = z.infer<typeof ResourceQuotasSchema>;

// Sandbox environment configuration
export const SandboxEnvironmentSchema = z.object({
  id: z.string().uuid(),
  name: z.string().min(1).max(255),
  description: z.string().optional(),
  agencyId: z.string(),
  complianceFrameworks: z.array(ComplianceFrameworkSchema),
  resourceQuotas: ResourceQuotasSchema,
  allowedModules: z.array(z.string()).default([]),
  blockedModules: z.array(z.string()).default([]),
  networkAllowlist: z.array(z.string()).default([]),
  createdAt: z.date(),
  updatedAt: z.date(),
  expiresAt: z.date().optional(),
  status: z.enum(['active', 'suspended', 'expired']).default('active'),
});
export type SandboxEnvironment = z.infer<typeof SandboxEnvironmentSchema>;

// AI model configuration for sandbox
export const AIModelConfigSchema = z.object({
  modelId: z.string(),
  modelType: z.enum(['llm', 'vision', 'speech', 'multimodal', 'custom']),
  provider: z.string(),
  version: z.string(),
  parameters: z.record(z.unknown()).default({}),
  inputSchema: z.record(z.unknown()).optional(),
  outputSchema: z.record(z.unknown()).optional(),
});
export type AIModelConfig = z.infer<typeof AIModelConfigSchema>;

// Experiment request
export const ExperimentRequestSchema = z.object({
  environmentId: z.string().uuid(),
  name: z.string().min(1).max(255),
  description: z.string().optional(),
  modelConfig: AIModelConfigSchema,
  testCases: z.array(
    z.object({
      id: z.string(),
      name: z.string(),
      input: z.unknown(),
      expectedOutput: z.unknown().optional(),
      tags: z.array(z.string()).default([]),
    }),
  ),
  validationRules: z
    .array(
      z.object({
        type: z.enum([
          'accuracy',
          'bias',
          'safety',
          'latency',
          'compliance',
          'custom',
        ]),
        threshold: z.number().optional(),
        config: z.record(z.unknown()).default({}),
      }),
    )
    .default([]),
  metadata: z.record(z.unknown()).default({}),
});
export type ExperimentRequest = z.infer<typeof ExperimentRequestSchema>;

// Execution result
export const ExecutionResultSchema = z.object({
  id: z.string().uuid(),
  experimentId: z.string().uuid(),
  environmentId: z.string().uuid(),
  status: z.enum(['pending', 'running', 'completed', 'failed', 'timeout', 'cancelled']),
  startedAt: z.date().optional(),
  completedAt: z.date().optional(),
  resourceUsage: z.object({
    cpuMs: z.number(),
    memoryPeakMb: z.number(),
    durationMs: z.number(),
    outputBytes: z.number(),
  }).optional(),
  results: z.array(
    z.object({
      testCaseId: z.string(),
      status: z.enum(['passed', 'failed', 'error', 'skipped']),
      output: z.unknown().optional(),
      error: z.string().optional(),
      validationResults: z.array(
        z.object({
          ruleType: z.string(),
          passed: z.boolean(),
          score: z.number().optional(),
          details: z.record(z.unknown()).default({}),
        }),
      ).default([]),
      durationMs: z.number(),
    }),
  ).default([]),
  complianceReport: z.object({
    frameworks: z.array(ComplianceFrameworkSchema),
    passed: z.boolean(),
    findings: z.array(
      z.object({
        severity: z.enum(['critical', 'high', 'medium', 'low', 'info']),
        framework: ComplianceFrameworkSchema,
        control: z.string(),
        description: z.string(),
        remediation: z.string().optional(),
      }),
    ).default([]),
  }).optional(),
  auditTrail: z.array(
    z.object({
      timestamp: z.date(),
      action: z.string(),
      actor: z.string(),
      details: z.record(z.unknown()).default({}),
    }),
  ).default([]),
});
export type ExecutionResult = z.infer<typeof ExecutionResultSchema>;

// Fast-track deployment request
export const DeploymentRequestSchema = z.object({
  experimentId: z.string().uuid(),
  targetEnvironment: z.enum(['staging', 'production']),
  approvals: z.array(
    z.object({
      approverId: z.string(),
      role: z.string(),
      approvedAt: z.date(),
      signature: z.string().optional(),
    }),
  ),
  deploymentConfig: z.object({
    replicas: z.number().min(1).max(100).default(1),
    resources: ResourceQuotasSchema,
    rolloutStrategy: z.enum(['immediate', 'canary', 'blue_green']).default('canary'),
    healthCheckPath: z.string().default('/health'),
    autoRollback: z.boolean().default(true),
  }),
});
export type DeploymentRequest = z.infer<typeof DeploymentRequestSchema>;

import { z } from 'zod';

// Sandbox isolation levels
export enum IsolationLevel {
  STANDARD = 'standard',      // Basic VM isolation
  ENHANCED = 'enhanced',      // VM + resource limits
  AIRGAPPED = 'airgapped',    // No network, read-only FS
  MISSION_READY = 'mission',  // Full compliance checks
}

// Data classification levels
export enum DataClassification {
  UNCLASSIFIED = 'unclassified',
  CUI = 'cui',                    // Controlled Unclassified Information
  SENSITIVE = 'sensitive',
  REGULATED = 'regulated',        // HIPAA, PCI, etc.
  MISSION_CRITICAL = 'mission_critical',
}

// Sensitive data types for detection
export enum SensitiveDataType {
  PII = 'pii',
  PHI = 'phi',                    // Protected Health Information
  PCI = 'pci',                    // Payment Card Data
  CREDENTIALS = 'credentials',
  CLASSIFIED = 'classified',
  LOCATION = 'location',
  BIOMETRIC = 'biometric',
}

// Sandbox resource quotas
export const SandboxQuotaSchema = z.object({
  cpuMs: z.number().min(100).max(60000).default(5000),
  memoryMb: z.number().min(16).max(512).default(128),
  wallClockMs: z.number().min(1000).max(300000).default(30000),
  maxOutputBytes: z.number().min(1024).max(10485760).default(1048576),
  maxNetworkBytes: z.number().min(0).max(104857600).default(0),
});

export type SandboxQuota = z.infer<typeof SandboxQuotaSchema>;

// Sandbox configuration
export const SandboxConfigSchema = z.object({
  id: z.string().uuid(),
  name: z.string().min(1).max(100),
  description: z.string().max(500).optional(),
  isolationLevel: z.nativeEnum(IsolationLevel).default(IsolationLevel.ENHANCED),
  quotas: SandboxQuotaSchema.default({}),
  allowedModules: z.array(z.string()).default([]),
  networkAllowlist: z.array(z.string()).default([]),
  environmentVars: z.record(z.string()).default({}),
  dataClassification: z.nativeEnum(DataClassification).default(DataClassification.UNCLASSIFIED),
  autoDetectSensitive: z.boolean().default(true),
  createdAt: z.date().default(() => new Date()),
  expiresAt: z.date().optional(),
  ownerId: z.string(),
  tenantId: z.string(),
});

export type SandboxConfig = z.infer<typeof SandboxConfigSchema>;

// Code submission for sandbox execution
export const CodeSubmissionSchema = z.object({
  sandboxId: z.string().uuid(),
  code: z.string().min(1).max(1000000),
  language: z.enum(['javascript', 'typescript', 'python']).default('typescript'),
  entryPoint: z.string().default('main'),
  inputs: z.record(z.unknown()).default({}),
  metadata: z.record(z.string()).default({}),
});

export type CodeSubmission = z.infer<typeof CodeSubmissionSchema>;

// Execution result
export interface ExecutionResult {
  sandboxId: string;
  executionId: string;
  status: 'success' | 'error' | 'timeout' | 'resource_exceeded' | 'blocked';
  output: unknown;
  logs: string[];
  metrics: ExecutionMetrics;
  sensitiveDataFlags: SensitiveDataFlag[];
  testCases?: GeneratedTestCase[];
  timestamp: Date;
}

export interface ExecutionMetrics {
  cpuTimeMs: number;
  wallClockMs: number;
  memoryPeakMb: number;
  outputBytes: number;
}

// Sensitive data detection
export interface SensitiveDataFlag {
  type: SensitiveDataType;
  location: string;           // JSONPath or line:col
  confidence: number;         // 0-1
  redacted: string;           // Redacted sample
  recommendation: string;
}

// Auto-generated test cases
export interface GeneratedTestCase {
  id: string;
  name: string;
  description: string;
  inputs: Record<string, unknown>;
  expectedOutput: unknown;
  assertions: TestAssertion[];
  category: 'unit' | 'integration' | 'security' | 'edge_case';
}

export interface TestAssertion {
  type: 'equals' | 'contains' | 'matches' | 'throws' | 'type_check';
  path?: string;
  expected: unknown;
}

// Migration configuration
export const MigrationConfigSchema = z.object({
  sandboxId: z.string().uuid(),
  targetPlatform: z.enum(['kubernetes', 'lambda', 'edge', 'mission_cloud']),
  targetEnvironment: z.enum(['staging', 'production', 'mission']),
  complianceChecks: z.array(z.string()).default(['security', 'performance', 'data_handling']),
  approvers: z.array(z.string()).default([]),
  rollbackEnabled: z.boolean().default(true),
  blueGreenDeploy: z.boolean().default(false),
});

export type MigrationConfig = z.infer<typeof MigrationConfigSchema>;

// Migration status
export interface MigrationStatus {
  migrationId: string;
  sandboxId: string;
  status: 'pending' | 'validating' | 'deploying' | 'verifying' | 'complete' | 'failed' | 'rolled_back';
  phases: MigrationPhase[];
  currentPhase: number;
  artifacts: DeploymentArtifact[];
  startedAt: Date;
  completedAt?: Date;
  error?: string;
}

export interface MigrationPhase {
  name: string;
  status: 'pending' | 'running' | 'passed' | 'failed' | 'skipped';
  startedAt?: Date;
  completedAt?: Date;
  details?: string;
}

export interface DeploymentArtifact {
  type: 'container_image' | 'helm_chart' | 'config_map' | 'policy_bundle';
  name: string;
  version: string;
  hash: string;
  location: string;
}

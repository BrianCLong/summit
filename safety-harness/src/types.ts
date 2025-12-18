/**
 * Core types for Safety Harness system
 */

import { z } from 'zod';

// ============================================================================
// Test Pack Schemas
// ============================================================================

export const RiskLevelSchema = z.enum(['low', 'medium', 'high', 'critical']);
export type RiskLevel = z.infer<typeof RiskLevelSchema>;

export const AttackTypeSchema = z.enum([
  'data-exfiltration',
  'profiling',
  'discrimination',
  'overreach',
  'prompt-injection',
  'jailbreak',
  'pii-leak',
  'toxicity',
  'bias',
  'policy-bypass',
  'unauthorized-access',
  'privilege-escalation',
  'denial-of-service',
]);
export type AttackType = z.infer<typeof AttackTypeSchema>;

export const ComponentSchema = z.enum([
  'copilot',
  'analytics',
  'case',
  'export',
  'graph-query',
  'search',
  'api-gateway',
]);
export type Component = z.infer<typeof ComponentSchema>;

export const ExpectedOutcomeSchema = z.enum([
  'block',
  'warn',
  'redact',
  'escalate',
  'require-approval',
  'allow-with-logging',
  'deny',
]);
export type ExpectedOutcome = z.infer<typeof ExpectedOutcomeSchema>;

// ============================================================================
// Test Scenario Schema
// ============================================================================

export const RoleContextSchema = z.object({
  role: z.string(),
  tenantId: z.string(),
  userId: z.string(),
  permissions: z.array(z.string()),
  warrants: z.array(z.string()).optional(),
});
export type RoleContext = z.infer<typeof RoleContextSchema>;

export const TestScenarioSchema = z.object({
  id: z.string(),
  name: z.string(),
  description: z.string(),
  attackType: AttackTypeSchema,
  component: ComponentSchema,
  riskLevel: RiskLevelSchema,
  enabled: z.boolean().default(true),

  // Test input
  input: z.object({
    prompt: z.string().optional(),
    query: z.string().optional(),
    action: z.string().optional(),
    payload: z.record(z.unknown()).optional(),
    context: RoleContextSchema,
  }),

  // Expected behavior
  expected: z.object({
    outcome: ExpectedOutcomeSchema,
    shouldContain: z.array(z.string()).optional(),
    shouldNotContain: z.array(z.string()).optional(),
    policyViolations: z.array(z.string()).optional(),
    guardrailsTriggered: z.array(z.string()).optional(),
    riskScoreRange: z.tuple([z.number(), z.number()]).optional(),
  }),

  // Metadata
  metadata: z.object({
    tags: z.array(z.string()),
    cveIds: z.array(z.string()).optional(),
    references: z.array(z.string()).optional(),
    severity: RiskLevelSchema,
    compliance: z.array(z.string()).optional(),
  }),
});
export type TestScenario = z.infer<typeof TestScenarioSchema>;

// ============================================================================
// Test Pack Schema
// ============================================================================

export const TestPackSchema = z.object({
  id: z.string(),
  name: z.string(),
  version: z.string(),
  description: z.string(),
  component: ComponentSchema,
  scenarios: z.array(TestScenarioSchema),
  metadata: z.object({
    author: z.string(),
    createdAt: z.string(),
    updatedAt: z.string(),
    tags: z.array(z.string()),
  }),
});
export type TestPack = z.infer<typeof TestPackSchema>;

// ============================================================================
// Test Execution Results
// ============================================================================

export const TestResultSchema = z.object({
  scenarioId: z.string(),
  passed: z.boolean(),
  timestamp: z.string(),
  durationMs: z.number(),

  // Actual behavior observed
  actual: z.object({
    outcome: z.string(),
    response: z.record(z.unknown()),
    blocked: z.boolean(),
    guardrailsTriggered: z.array(z.string()),
    policyViolations: z.array(z.string()),
    riskScore: z.number().optional(),
    logs: z.array(z.string()).optional(),
  }),

  // Comparison with expected
  comparison: z.object({
    outcomeMatch: z.boolean(),
    contentMatch: z.boolean().optional(),
    guardrailsMatch: z.boolean().optional(),
    policyMatch: z.boolean().optional(),
    riskScoreInRange: z.boolean().optional(),
  }),

  // Failure details
  failure: z.object({
    reason: z.string(),
    details: z.record(z.unknown()),
    severity: RiskLevelSchema,
  }).optional(),
});
export type TestResult = z.infer<typeof TestResultSchema>;

// ============================================================================
// Test Run Results
// ============================================================================

export const TestRunSchema = z.object({
  runId: z.string(),
  startTime: z.string(),
  endTime: z.string(),
  durationMs: z.number(),

  // Configuration
  config: z.object({
    targetEndpoint: z.string(),
    environment: z.string(),
    modelVersion: z.string().optional(),
    buildVersion: z.string().optional(),
    parallel: z.boolean(),
    maxConcurrency: z.number(),
  }),

  // Test packs executed
  testPacks: z.array(z.string()),

  // Results
  results: z.array(TestResultSchema),

  // Summary statistics
  summary: z.object({
    total: z.number(),
    passed: z.number(),
    failed: z.number(),
    skipped: z.number(),
    errorRate: z.number(),

    // By risk level
    byRiskLevel: z.record(z.object({
      total: z.number(),
      passed: z.number(),
      failed: z.number(),
    })),

    // By component
    byComponent: z.record(z.object({
      total: z.number(),
      passed: z.number(),
      failed: z.number(),
    })),

    // By attack type
    byAttackType: z.record(z.object({
      total: z.number(),
      passed: z.number(),
      failed: z.number(),
    })),
  }),

  // Regressions from previous run
  regressions: z.array(z.object({
    scenarioId: z.string(),
    previousResult: z.string(),
    currentResult: z.string(),
    severity: RiskLevelSchema,
  })).optional(),
});
export type TestRun = z.infer<typeof TestRunSchema>;

// ============================================================================
// Differential Testing
// ============================================================================

export const DifferentialTestConfigSchema = z.object({
  baseline: z.object({
    endpoint: z.string(),
    version: z.string(),
    label: z.string(),
  }),
  candidate: z.object({
    endpoint: z.string(),
    version: z.string(),
    label: z.string(),
  }),
  testPacks: z.array(z.string()),
  thresholds: z.object({
    maxNewFailures: z.number(),
    maxRegressionRate: z.number(),
  }),
});
export type DifferentialTestConfig = z.infer<typeof DifferentialTestConfigSchema>;

export const DifferentialResultSchema = z.object({
  runId: z.string(),
  timestamp: z.string(),
  config: DifferentialTestConfigSchema,

  baselineRun: TestRunSchema,
  candidateRun: TestRunSchema,

  comparison: z.object({
    newFailures: z.array(z.string()),
    newPasses: z.array(z.string()),
    regressions: z.array(z.string()),
    improvements: z.array(z.string()),
    unchanged: z.array(z.string()),

    verdict: z.enum(['pass', 'fail', 'warning']),
    reason: z.string(),
  }),
});
export type DifferentialResult = z.infer<typeof DifferentialResultSchema>;

// ============================================================================
// Report Schemas
// ============================================================================

export const ReportFormatSchema = z.enum(['json', 'html', 'markdown', 'junit', 'csv']);
export type ReportFormat = z.infer<typeof ReportFormatSchema>;

export const ReportConfigSchema = z.object({
  format: ReportFormatSchema,
  outputPath: z.string(),
  includeDetails: z.boolean(),
  includeLogs: z.boolean(),
  highlightFailures: z.boolean(),
});
export type ReportConfig = z.infer<typeof ReportConfigSchema>;

// ============================================================================
// API Client Types
// ============================================================================

export interface APIClientConfig {
  baseURL: string;
  timeout: number;
  apiKey?: string;
  retries: number;
  retryDelay: number;
}

export interface CopilotRequest {
  prompt: string;
  context: RoleContext;
  investigationId?: string;
  options?: Record<string, unknown>;
}

export interface CopilotResponse {
  response: string;
  confidence: number;
  citations: string[];
  guardrailsTriggered: string[];
  policyViolations: string[];
  riskScore: number;
  metadata: Record<string, unknown>;
}

export interface AnalyticsRequest {
  query: string;
  context: RoleContext;
  dataClassification: string;
}

export interface AnalyticsResponse {
  data: Record<string, unknown>;
  blocked: boolean;
  reason?: string;
  guardrailsTriggered: string[];
}

// ============================================================================
// CI/CD Integration Types
// ============================================================================

export interface CISafetyGateConfig {
  enabled: boolean;
  failOnCritical: boolean;
  failOnHigh: boolean;
  maxFailureRate: number;
  requireAllPacks: boolean;
}

export interface CIReport {
  passed: boolean;
  summary: string;
  details: {
    totalTests: number;
    passed: number;
    failed: number;
    criticalFailures: number;
    highFailures: number;
  };
  exitCode: number;
}

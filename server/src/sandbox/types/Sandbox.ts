/**
 * Sandbox Types
 *
 * Type definitions for the sandbox testing environment.
 *
 * SOC 2 Controls: CC7.1 (System Operations), CC8.1 (Change Management)
 *
 * @module sandbox/types/Sandbox
 */

/**
 * Governance verdict type for sandbox
 */
export type SandboxVerdict = 'ALLOW' | 'DENY' | 'FLAG' | 'REVIEW_REQUIRED';

/**
 * Sandbox environment status
 */
export type SandboxStatus = 'created' | 'running' | 'completed' | 'failed' | 'expired';

/**
 * Sandbox configuration
 */
export interface SandboxConfig {
  id: string;
  name: string;
  tenantId: string;
  createdBy: string;
  createdAt: string;
  expiresAt: string;
  status: SandboxStatus;

  /** Cloned policies for testing */
  policies: SandboxPolicy[];

  /** Test data configuration */
  testData: TestDataConfig;

  /** Execution limits */
  limits: SandboxLimits;
}

/**
 * Sandbox policy (cloned from production)
 */
export interface SandboxPolicy {
  id: string;
  originalId?: string;
  name: string;
  description: string;
  rules: PolicyRule[];
  status: 'draft' | 'active';
  modifiedInSandbox: boolean;
}

/**
 * Policy rule
 */
export interface PolicyRule {
  id: string;
  condition: string;
  action: 'allow' | 'deny' | 'flag' | 'review';
  priority: number;
  metadata?: Record<string, unknown>;
}

/**
 * Test data configuration
 */
export interface TestDataConfig {
  /** Use synthetic data */
  synthetic: boolean;

  /** Generate random entities */
  entityCount: number;

  /** Custom test scenarios */
  scenarios: TestScenario[];

  /** Predefined user personas */
  personas: TestPersona[];
}

/**
 * Test scenario
 */
export interface TestScenario {
  id: string;
  name: string;
  description: string;

  /** Actor performing the action */
  actor: {
    type: 'user' | 'system' | 'integration';
    id?: string;
    role?: string;
    attributes?: Record<string, unknown>;
  };

  /** Action being performed */
  action: string;

  /** Resource being accessed */
  resource: {
    type: string;
    id?: string;
    attributes?: Record<string, unknown>;
  };

  /** Additional context */
  context?: Record<string, unknown>;

  /** Expected outcome */
  expectedVerdict?: SandboxVerdict;
}

/**
 * Test persona for simulation
 */
export interface TestPersona {
  id: string;
  name: string;
  role: string;
  department?: string;
  clearance?: string[];
  attributes: Record<string, unknown>;
}

/**
 * Sandbox execution limits
 */
export interface SandboxLimits {
  /** Maximum execution time in ms */
  maxExecutionTime: number;

  /** Maximum evaluations per session */
  maxEvaluations: number;

  /** Maximum memory usage in MB */
  maxMemory: number;

  /** Maximum scenarios */
  maxScenarios: number;
}

/**
 * Sandbox execution request
 */
export interface SandboxExecutionRequest {
  sandboxId: string;

  /** Scenario to execute, or run all */
  scenarioId?: string;

  /** Execute with specific policy version */
  policyId?: string;

  /** Override context */
  contextOverrides?: Record<string, unknown>;
}

/**
 * Sandbox execution result
 */
export interface SandboxExecutionResult {
  sandboxId: string;
  executionId: string;
  startedAt: string;
  completedAt: string;
  status: 'success' | 'partial' | 'failed';

  /** Overall statistics */
  summary: ExecutionSummary;

  /** Individual scenario results */
  scenarioResults: ScenarioResult[];

  /** Policy coverage analysis */
  coverage: PolicyCoverage;

  /** Detected issues */
  issues: DetectedIssue[];
}

/**
 * Execution summary statistics
 */
export interface ExecutionSummary {
  totalScenarios: number;
  passed: number;
  failed: number;
  skipped: number;
  executionTime: number;
  evaluationsPerformed: number;

  /** Verdict distribution */
  verdictDistribution: {
    allow: number;
    deny: number;
    flag: number;
    reviewRequired: number;
  };
}

/**
 * Individual scenario result
 */
export interface ScenarioResult {
  scenarioId: string;
  scenarioName: string;
  status: 'passed' | 'failed' | 'skipped';

  /** Actual verdict */
  verdict: SandboxVerdict;

  /** Expected verdict if defined */
  expectedVerdict?: SandboxVerdict;

  /** Rules that matched */
  matchedRules: string[];

  /** Evaluation path */
  evaluationPath: string[];

  /** Execution time */
  executionTime: number;

  /** Failure reason if failed */
  failureReason?: string;
}

/**
 * Policy coverage analysis
 */
export interface PolicyCoverage {
  totalPolicies: number;
  policiesTested: number;
  totalRules: number;
  rulesCovered: number;
  coveragePercent: number;

  /** Rules that were never hit */
  uncoveredRules: Array<{
    policyId: string;
    ruleId: string;
    condition: string;
  }>;

  /** Rules that were hit most frequently */
  hotRules: Array<{
    policyId: string;
    ruleId: string;
    hitCount: number;
  }>;
}

/**
 * Detected issue from sandbox execution
 */
export interface DetectedIssue {
  type: 'conflict' | 'gap' | 'redundancy' | 'performance' | 'security';
  severity: 'critical' | 'high' | 'medium' | 'low';
  description: string;
  affectedPolicies: string[];
  affectedRules?: string[];
  recommendation: string;
}

/**
 * Sandbox comparison result
 */
export interface SandboxComparison {
  baselineExecutionId: string;
  comparisonExecutionId: string;

  /** Scenarios with different outcomes */
  divergentScenarios: Array<{
    scenarioId: string;
    baselineVerdict: SandboxVerdict;
    comparisonVerdict: SandboxVerdict;
    impact: 'high' | 'medium' | 'low';
  }>;

  /** Performance differences */
  performanceDelta: {
    averageExecutionTime: number;
    worstCaseScenario?: string;
  };

  /** Coverage differences */
  coverageDelta: {
    baselineCoverage: number;
    comparisonCoverage: number;
    newlyUncoveredRules: string[];
  };
}

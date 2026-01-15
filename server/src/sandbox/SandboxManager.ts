/**
 * Sandbox Manager
 *
 * Manages sandbox environments for policy testing.
 *
 * SOC 2 Controls: CC7.1 (System Operations), CC8.1 (Change Management)
 *
 * @module sandbox/SandboxManager
 */

import { v4 as uuidv4 } from 'uuid';
import { createDataEnvelope, GovernanceResult } from '../types/data-envelope.js';
import type { GovernanceVerdict, DataEnvelope } from '../types/data-envelope.js';
import type {
  SandboxConfig,
  SandboxPolicy,
  TestScenario,
  TestPersona,
  SandboxLimits,
  SandboxExecutionRequest,
  SandboxExecutionResult,
  ScenarioResult,
  ExecutionSummary,
  PolicyCoverage,
  DetectedIssue,
} from './types/Sandbox.js';
import logger from '../utils/logger.js';

/**
 * Default sandbox limits
 */
const DEFAULT_LIMITS: SandboxLimits = {
  maxExecutionTime: 60000,
  maxEvaluations: 1000,
  maxMemory: 256,
  maxScenarios: 100,
};

/**
 * Default personas for testing
 */
const DEFAULT_PERSONAS: TestPersona[] = [
  {
    id: 'admin',
    name: 'Administrator',
    role: 'admin',
    department: 'IT',
    clearance: ['top-secret', 'secret', 'confidential'],
    attributes: { privileged: true },
  },
  {
    id: 'analyst',
    name: 'Intelligence Analyst',
    role: 'analyst',
    department: 'Intelligence',
    clearance: ['secret', 'confidential'],
    attributes: { specialization: 'OSINT' },
  },
  {
    id: 'viewer',
    name: 'Read-Only User',
    role: 'viewer',
    department: 'Operations',
    clearance: ['confidential'],
    attributes: { readOnly: true },
  },
  {
    id: 'external',
    name: 'External Partner',
    role: 'external',
    department: 'External',
    clearance: [],
    attributes: { external: true },
  },
];

/**
 * Create a governance verdict helper
 */
function createVerdict(result: GovernanceResult, reason?: string): GovernanceVerdict {
  return {
    verdictId: `verdict-${uuidv4()}`,
    policyId: 'sandbox-policy',
    result,
    decidedAt: new Date(),
    reason,
    evaluator: 'SandboxManager',
  };
}

/**
 * Wrap data in DataEnvelope with proper governance
 */
function wrapInEnvelope<T>(
  data: T,
  tenantId: string,
  operation: string,
  result: GovernanceResult,
  actor?: string
): DataEnvelope<T> {
  return createDataEnvelope(data, {
    source: 'SandboxManager',
    actor,
    governanceVerdict: createVerdict(result),
  });
}

/**
 * Sandbox Manager
 */
class SandboxManager {
  private sandboxes: Map<string, SandboxConfig> = new Map();
  private executions: Map<string, SandboxExecutionResult> = new Map();
  private cleanupInterval: NodeJS.Timeout | null = null;

  constructor() {
    this.cleanupInterval = setInterval(() => {
      this.cleanupExpired();
    }, 60000);
  }

  /**
   * Create a new sandbox environment
   */
  async create(options: {
    name: string;
    tenantId: string;
    createdBy: string;
    policies?: SandboxPolicy[];
    scenarios?: TestScenario[];
    personas?: TestPersona[];
    limits?: Partial<SandboxLimits>;
    expiresIn?: number;
  }): Promise<DataEnvelope<SandboxConfig>> {
    const now = new Date();
    const expiresAt = new Date(now.getTime() + (options.expiresIn || 24) * 60 * 60 * 1000);

    const sandbox: SandboxConfig = {
      id: `sandbox-${uuidv4()}`,
      name: options.name,
      tenantId: options.tenantId,
      createdBy: options.createdBy,
      createdAt: now.toISOString(),
      expiresAt: expiresAt.toISOString(),
      status: 'created',
      policies: options.policies || [],
      testData: {
        synthetic: true,
        entityCount: 100,
        scenarios: options.scenarios || this.generateDefaultScenarios(),
        personas: options.personas || DEFAULT_PERSONAS,
      },
      limits: {
        ...DEFAULT_LIMITS,
        ...options.limits,
      },
    };

    this.sandboxes.set(sandbox.id, sandbox);

    logger.info('Sandbox created', {
      sandboxId: sandbox.id,
      tenantId: options.tenantId,
      createdBy: options.createdBy,
    });

    return wrapInEnvelope(
      sandbox,
      options.tenantId,
      'sandbox.create',
      GovernanceResult.ALLOW,
      options.createdBy
    );
  }

  /**
   * Get sandbox by ID
   */
  getSandbox(sandboxId: string): DataEnvelope<SandboxConfig | null> {
    const sandbox = this.sandboxes.get(sandboxId);

    return wrapInEnvelope(
      sandbox || null,
      sandbox?.tenantId || 'unknown',
      'sandbox.get',
      sandbox ? GovernanceResult.ALLOW : GovernanceResult.DENY
    );
  }

  /**
   * List sandboxes for a tenant
   */
  listSandboxes(tenantId: string): DataEnvelope<SandboxConfig[]> {
    const sandboxes = Array.from(this.sandboxes.values()).filter(
      (s) => s.tenantId === tenantId
    );

    return wrapInEnvelope(sandboxes, tenantId, 'sandbox.list', GovernanceResult.ALLOW);
  }

  /**
   * Update sandbox configuration
   */
  async updateSandbox(
    sandboxId: string,
    updates: Partial<Pick<SandboxConfig, 'name' | 'policies' | 'testData' | 'limits'>>
  ): Promise<DataEnvelope<SandboxConfig | null>> {
    const sandbox = this.sandboxes.get(sandboxId);

    if (!sandbox) {
      return wrapInEnvelope(null, 'unknown', 'sandbox.update', GovernanceResult.DENY);
    }

    if (sandbox.status !== 'created' && sandbox.status !== 'completed') {
      throw new Error('Cannot update sandbox in current state');
    }

    const updated: SandboxConfig = {
      ...sandbox,
      ...updates,
      testData: updates.testData
        ? { ...sandbox.testData, ...updates.testData }
        : sandbox.testData,
      limits: updates.limits
        ? { ...sandbox.limits, ...updates.limits }
        : sandbox.limits,
    };

    this.sandboxes.set(sandboxId, updated);

    return wrapInEnvelope(updated, sandbox.tenantId, 'sandbox.update', GovernanceResult.ALLOW);
  }

  /**
   * Add scenario to sandbox
   */
  addScenario(
    sandboxId: string,
    scenario: Omit<TestScenario, 'id'>
  ): DataEnvelope<TestScenario> {
    const sandbox = this.sandboxes.get(sandboxId);

    if (!sandbox) {
      throw new Error('Sandbox not found');
    }

    if (sandbox.testData.scenarios.length >= sandbox.limits.maxScenarios) {
      throw new Error('Maximum scenarios reached');
    }

    const newScenario: TestScenario = {
      ...scenario,
      id: `scenario-${uuidv4()}`,
    };

    sandbox.testData.scenarios.push(newScenario);

    return wrapInEnvelope(
      newScenario,
      sandbox.tenantId,
      'sandbox.addScenario',
      GovernanceResult.ALLOW
    );
  }

  /**
   * Execute sandbox scenarios
   */
  async execute(
    request: SandboxExecutionRequest
  ): Promise<DataEnvelope<SandboxExecutionResult>> {
    const sandbox = this.sandboxes.get(request.sandboxId);

    if (!sandbox) {
      throw new Error('Sandbox not found');
    }

    if (new Date(sandbox.expiresAt) < new Date()) {
      sandbox.status = 'expired';
      throw new Error('Sandbox has expired');
    }

    sandbox.status = 'running';
    const executionId = `exec-${uuidv4()}`;
    const startedAt = new Date();

    try {
      const scenariosToRun = request.scenarioId
        ? sandbox.testData.scenarios.filter((s) => s.id === request.scenarioId)
        : sandbox.testData.scenarios;

      const scenarioResults: ScenarioResult[] = [];
      const ruleCoverage: Map<string, number> = new Map();
      let evaluationsPerformed = 0;

      for (const scenario of scenariosToRun) {
        if (evaluationsPerformed >= sandbox.limits.maxEvaluations) {
          break;
        }

        const result = await this.executeScenario(
          scenario,
          sandbox.policies,
          request.contextOverrides
        );

        scenarioResults.push(result);
        evaluationsPerformed++;

        result.matchedRules.forEach((ruleId) => {
          ruleCoverage.set(ruleId, (ruleCoverage.get(ruleId) || 0) + 1);
        });
      }

      const completedAt = new Date();
      const executionTime = completedAt.getTime() - startedAt.getTime();

      const summary = this.calculateSummary(scenarioResults, executionTime, evaluationsPerformed);
      const coverage = this.calculateCoverage(sandbox.policies, ruleCoverage);
      const issues = this.detectIssues(scenarioResults, coverage, sandbox.policies);

      const result: SandboxExecutionResult = {
        sandboxId: request.sandboxId,
        executionId,
        startedAt: startedAt.toISOString(),
        completedAt: completedAt.toISOString(),
        status: issues.some((i) => i.severity === 'critical') ? 'partial' : 'success',
        summary,
        scenarioResults,
        coverage,
        issues,
      };

      sandbox.status = 'completed';
      this.executions.set(executionId, result);

      logger.info('Sandbox execution completed', {
        sandboxId: sandbox.id,
        executionId,
        scenarios: scenarioResults.length,
        passed: summary.passed,
        failed: summary.failed,
      });

      return wrapInEnvelope(result, sandbox.tenantId, 'sandbox.execute', GovernanceResult.ALLOW);
    } catch (error: any) {
      sandbox.status = 'failed';
      throw error;
    }
  }

  /**
   * Execute a single scenario
   */
  private async executeScenario(
    scenario: TestScenario,
    policies: SandboxPolicy[],
    contextOverrides?: Record<string, unknown>
  ): Promise<ScenarioResult> {
    const startTime = Date.now();
    const matchedRules: string[] = [];
    const evaluationPath: string[] = [];

    let verdict: GovernanceResult = GovernanceResult.ALLOW;

    for (const policy of policies.filter((p) => p.status === 'active')) {
      evaluationPath.push(`Evaluating policy: ${policy.name}`);

      for (const rule of policy.rules.sort((a, b) => a.priority - b.priority)) {
        const matched = this.evaluateCondition(rule.condition, {
          actor: scenario.actor,
          action: scenario.action,
          resource: scenario.resource,
          context: { ...scenario.context, ...contextOverrides },
        });

        if (matched) {
          matchedRules.push(`${policy.id}:${rule.id}`);
          evaluationPath.push(`Rule matched: ${rule.id} -> ${rule.action}`);

          switch (rule.action) {
            case 'deny':
              verdict = GovernanceResult.DENY;
              break;
            case 'flag':
              if (verdict === GovernanceResult.ALLOW) {
                verdict = GovernanceResult.FLAG;
              }
              break;
            case 'review':
              if (verdict === GovernanceResult.ALLOW || verdict === GovernanceResult.FLAG) {
                verdict = GovernanceResult.REVIEW_REQUIRED;
              }
              break;
          }

          if (verdict === GovernanceResult.DENY) {
            break;
          }
        }
      }

      if (verdict === GovernanceResult.DENY) {
        break;
      }
    }

    const executionTime = Date.now() - startTime;

    // Map GovernanceResult to the verdict type expected by TestScenario
    const verdictStr = verdict as unknown as 'ALLOW' | 'DENY' | 'FLAG' | 'REVIEW_REQUIRED';
    const expectedStr = scenario.expectedVerdict as unknown as 'ALLOW' | 'DENY' | 'FLAG' | 'REVIEW_REQUIRED' | undefined;

    const passed = !expectedStr || verdictStr === expectedStr;

    return {
      scenarioId: scenario.id,
      scenarioName: scenario.name,
      status: passed ? 'passed' : 'failed',
      verdict: verdictStr,
      expectedVerdict: expectedStr,
      matchedRules,
      evaluationPath,
      executionTime,
      failureReason: passed
        ? undefined
        : `Expected ${scenario.expectedVerdict}, got ${verdict}`,
    };
  }

  /**
   * Evaluate a condition (simplified simulation)
   */
  private evaluateCondition(
    condition: string,
    context: {
      actor: TestScenario['actor'];
      action: string;
      resource: TestScenario['resource'];
      context?: Record<string, unknown>;
    }
  ): boolean {
    try {
      if (condition.includes('actor.role')) {
        const roleMatch = condition.match(/actor\.role\s*[=!]=\s*["'](\w+)["']/);
        if (roleMatch) {
          const expectedRole = roleMatch[1];
          const isEquals = condition.includes('==');
          return isEquals
            ? context.actor.role === expectedRole
            : context.actor.role !== expectedRole;
        }
      }

      if (condition.includes('resource.type')) {
        const typeMatch = condition.match(/resource\.type\s*==\s*["'](\w+)["']/);
        if (typeMatch) {
          return context.resource.type === typeMatch[1];
        }
      }

      if (condition.includes('action')) {
        const actionMatch = condition.match(/action\s*==\s*["'](\w+)["']/);
        if (actionMatch) {
          return context.action === actionMatch[1];
        }
      }

      return Math.random() > 0.5;
    } catch {
      return false;
    }
  }

  /**
   * Calculate execution summary
   */
  private calculateSummary(
    results: ScenarioResult[],
    executionTime: number,
    evaluationsPerformed: number
  ): ExecutionSummary {
    const verdictCounts = {
      allow: 0,
      deny: 0,
      flag: 0,
      reviewRequired: 0,
    };

    let passed = 0;
    let failed = 0;

    results.forEach((r: any) => {
      if (r.status === 'passed') passed++;
      else if (r.status === 'failed') failed++;

      switch (r.verdict) {
        case 'ALLOW':
          verdictCounts.allow++;
          break;
        case 'DENY':
          verdictCounts.deny++;
          break;
        case 'FLAG':
          verdictCounts.flag++;
          break;
        case 'REVIEW_REQUIRED':
          verdictCounts.reviewRequired++;
          break;
      }
    });

    return {
      totalScenarios: results.length,
      passed,
      failed,
      skipped: results.filter((r: any) => r.status === 'skipped').length,
      executionTime,
      evaluationsPerformed,
      verdictDistribution: verdictCounts,
    };
  }

  /**
   * Calculate policy coverage
   */
  private calculateCoverage(
    policies: SandboxPolicy[],
    ruleCoverage: Map<string, number>
  ): PolicyCoverage {
    const allRules: Array<{ policyId: string; ruleId: string; condition: string }> = [];
    const coveredRules = new Set<string>();
    const hotRules: Array<{ policyId: string; ruleId: string; hitCount: number }> = [];

    policies.forEach((policy) => {
      policy.rules.forEach((rule) => {
        allRules.push({
          policyId: policy.id,
          ruleId: rule.id,
          condition: rule.condition,
        });

        const key = `${policy.id}:${rule.id}`;
        const hits = ruleCoverage.get(key);
        if (hits) {
          coveredRules.add(key);
          hotRules.push({
            policyId: policy.id,
            ruleId: rule.id,
            hitCount: hits,
          });
        }
      });
    });

    const uncoveredRules = allRules.filter(
      (r: any) => !coveredRules.has(`${r.policyId}:${r.ruleId}`)
    );

    const testedPolicies = new Set<string>();
    ruleCoverage.forEach((_, key) => {
      testedPolicies.add(key.split(':')[0]);
    });

    return {
      totalPolicies: policies.length,
      policiesTested: testedPolicies.size,
      totalRules: allRules.length,
      rulesCovered: coveredRules.size,
      coveragePercent:
        allRules.length > 0 ? Math.round((coveredRules.size / allRules.length) * 100) : 0,
      uncoveredRules,
      hotRules: hotRules.sort((a, b) => b.hitCount - a.hitCount).slice(0, 10),
    };
  }

  /**
   * Detect issues from execution results
   */
  private detectIssues(
    results: ScenarioResult[],
    coverage: PolicyCoverage,
    policies: SandboxPolicy[]
  ): DetectedIssue[] {
    const issues: DetectedIssue[] = [];

    if (coverage.coveragePercent < 50) {
      issues.push({
        type: 'gap',
        severity: 'high',
        description: `Only ${coverage.coveragePercent}% of rules were tested`,
        affectedPolicies: policies.map((p) => p.id),
        recommendation: 'Add more test scenarios to improve coverage',
      });
    }

    if (coverage.uncoveredRules.length > 0) {
      issues.push({
        type: 'gap',
        severity: 'medium',
        description: `${coverage.uncoveredRules.length} rules were never triggered`,
        affectedPolicies: [...new Set(coverage.uncoveredRules.map((r: any) => r.policyId))],
        affectedRules: coverage.uncoveredRules.map((r: any) => r.ruleId),
        recommendation: 'Review uncovered rules for relevance or add scenarios to test them',
      });
    }

    const failedResults = results.filter((r: any) => r.status === 'failed');
    if (failedResults.length > 0) {
      issues.push({
        type: 'conflict',
        severity: 'high',
        description: `${failedResults.length} scenarios produced unexpected verdicts`,
        affectedPolicies: [
          ...new Set(failedResults.flatMap((r: any) => r.matchedRules.map((m: any) => m.split(':')[0]))),
        ],
        recommendation: 'Review policy rules for conflicts or update expected outcomes',
      });
    }

    const slowScenarios = results.filter((r: any) => r.executionTime > 100);
    if (slowScenarios.length > 0) {
      issues.push({
        type: 'performance',
        severity: 'low',
        description: `${slowScenarios.length} scenarios took >100ms to evaluate`,
        affectedPolicies: policies.map((p) => p.id),
        recommendation: 'Consider optimizing policy rule conditions',
      });
    }

    return issues;
  }

  /**
   * Get execution result
   */
  getExecution(executionId: string): DataEnvelope<SandboxExecutionResult | null> {
    const result = this.executions.get(executionId);

    return wrapInEnvelope(
      result || null,
      'unknown',
      'sandbox.getExecution',
      result ? GovernanceResult.ALLOW : GovernanceResult.DENY
    );
  }

  /**
   * Delete sandbox
   */
  deleteSandbox(sandboxId: string): DataEnvelope<{ deleted: boolean }> {
    const sandbox = this.sandboxes.get(sandboxId);

    if (!sandbox) {
      return wrapInEnvelope(
        { deleted: false },
        'unknown',
        'sandbox.delete',
        GovernanceResult.DENY
      );
    }

    this.sandboxes.delete(sandboxId);

    logger.info('Sandbox deleted', { sandboxId });

    return wrapInEnvelope(
      { deleted: true },
      sandbox.tenantId,
      'sandbox.delete',
      GovernanceResult.ALLOW
    );
  }

  /**
   * Generate default test scenarios
   */
  private generateDefaultScenarios(): TestScenario[] {
    return [
      {
        id: 'default-admin-read',
        name: 'Admin reads sensitive document',
        description: 'Administrator accessing classified document',
        actor: { type: 'user', role: 'admin' },
        action: 'read',
        resource: { type: 'document', attributes: { classification: 'secret' } },
        expectedVerdict: 'ALLOW' as any,
      },
      {
        id: 'default-analyst-read',
        name: 'Analyst reads report',
        description: 'Analyst accessing intelligence report',
        actor: { type: 'user', role: 'analyst' },
        action: 'read',
        resource: { type: 'report', attributes: { classification: 'confidential' } },
        expectedVerdict: 'ALLOW' as any,
      },
      {
        id: 'default-external-denied',
        name: 'External user denied access',
        description: 'External user trying to access internal document',
        actor: { type: 'user', role: 'external' },
        action: 'read',
        resource: { type: 'document', attributes: { internal: true } },
        expectedVerdict: 'DENY' as any,
      },
      {
        id: 'default-viewer-write-denied',
        name: 'Viewer cannot write',
        description: 'Read-only user trying to modify document',
        actor: { type: 'user', role: 'viewer' },
        action: 'write',
        resource: { type: 'document' },
        expectedVerdict: 'DENY' as any,
      },
    ];
  }

  /**
   * Cleanup expired sandboxes
   */
  private cleanupExpired(): void {
    const now = new Date();
    let cleaned = 0;

    this.sandboxes.forEach((sandbox: any, id: string) => {
      if (new Date(sandbox.expiresAt) < now) {
        this.sandboxes.delete(id);
        cleaned++;
      }
    });

    if (cleaned > 0) {
      logger.info('Cleaned up expired sandboxes', { count: cleaned });
    }
  }

  /**
   * Shutdown manager
   */
  shutdown(): void {
    if (this.cleanupInterval) {
      clearInterval(this.cleanupInterval);
      this.cleanupInterval = null;
    }
  }
}

export const sandboxManager = new SandboxManager();
export default sandboxManager;

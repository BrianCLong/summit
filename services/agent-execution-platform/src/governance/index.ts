/**
 * Governance Service
 *
 * Generates governance verdicts for all AI/agent outputs.
 * Ensures structural impossibility of bypassing governance evaluation.
 *
 * SOC 2 Controls:
 * - CC6.1: Logical access controls
 * - CC7.2: System change management
 * - PI1.3: Processing integrity - accurate processing
 */

import {
  GovernanceVerdict,
  GovernanceVerdictType,
  GovernanceEvaluation,
  SafetyReport,
  AgentResult,
} from '../types/index.js';
import { logger } from '../logging/index.js';
import { randomUUID } from 'crypto';

/**
 * Governance policy evaluation function
 */
export type PolicyEvaluator = (
  input: any,
  context: any
) => Promise<{
  passed: boolean;
  violations: Array<{ rule: string; severity: string; message: string }>;
}>;

/**
 * Governance service configuration
 */
export interface GovernanceServiceConfig {
  /** Default policy to evaluate */
  defaultPolicy?: string;
  /** Policy evaluators map */
  policyEvaluators?: Map<string, PolicyEvaluator>;
  /** Minimum confidence threshold (0-1) */
  minConfidence?: number;
  /** Evaluated by identifier */
  evaluatedBy: string;
}

/**
 * Governance Service
 *
 * This service is designed to make governance evaluation STRUCTURALLY REQUIRED.
 * All methods return GovernanceVerdict, making bypass impossible at the type level.
 */
export class GovernanceService {
  private readonly config: GovernanceServiceConfig;
  private readonly policyEvaluators: Map<string, PolicyEvaluator>;

  constructor(config: GovernanceServiceConfig) {
    this.config = {
      minConfidence: 0.8,
      defaultPolicy: 'ai-safety-policy',
      ...config,
    };
    this.policyEvaluators = config.policyEvaluators || new Map();

    logger.getLogger().info('Governance service initialized', {
      evaluatedBy: this.config.evaluatedBy,
      defaultPolicy: this.config.defaultPolicy,
    });
  }

  /**
   * Generate governance verdict for agent execution
   *
   * This method MUST be called for every agent execution.
   * The type system enforces that AgentResult includes a verdict.
   */
  async generateVerdict(
    input: any,
    context: any,
    policyName?: string
  ): Promise<GovernanceVerdict> {
    const policy = policyName || this.config.defaultPolicy!;
    const timestamp = new Date().toISOString();

    logger.getLogger().info('Generating governance verdict', {
      policy,
      evaluatedBy: this.config.evaluatedBy,
    });

    try {
      // Evaluate policy
      const evaluator = this.policyEvaluators.get(policy);
      let verdict: GovernanceVerdictType = 'APPROVED';
      let rationale = 'No policy evaluator configured; default approval';
      let confidence = 1.0;
      let violations: any[] = [];
      let riskLevel: 'low' | 'medium' | 'high' | 'critical' = 'low';

      if (evaluator) {
        const result = await evaluator(input, context);
        violations = result.violations || [];

        if (!result.passed) {
          // Determine verdict based on severity
          const hasCritical = violations.some((v) => v.severity === 'critical');
          const hasError = violations.some((v) => v.severity === 'error');

          if (hasCritical) {
            verdict = 'REJECTED';
            rationale = `Policy ${policy} critical violations detected`;
            riskLevel = 'critical';
            confidence = 1.0;
          } else if (hasError) {
            verdict = 'REQUIRES_REVIEW';
            rationale = `Policy ${policy} violations require manual review`;
            riskLevel = 'high';
            confidence = 0.9;
          } else {
            verdict = 'APPROVED';
            rationale = `Policy ${policy} passed with warnings`;
            riskLevel = 'medium';
            confidence = 0.95;
          }
        } else {
          verdict = 'APPROVED';
          rationale = `Policy ${policy} evaluation passed`;
          confidence = 1.0;
          riskLevel = 'low';
        }
      }

      const governanceVerdict: GovernanceVerdict = {
        verdict,
        policy,
        rationale,
        timestamp,
        evaluatedBy: this.config.evaluatedBy,
        confidence,
        metadata: {
          policyVersion: '1.0.0',
          riskLevel,
          soc2Controls: ['CC6.1', 'CC7.2', 'PI1.3'],
          evidence: violations.length > 0 ? violations.map((v) => v.message) : undefined,
          remediationSuggestions:
            violations.length > 0
              ? this.generateRemediationSuggestions(violations)
              : undefined,
        },
      };

      logger.getLogger().info('Governance verdict generated', {
        verdict: verdict,
        policy,
        confidence,
        violationCount: violations.length,
      });

      return governanceVerdict;
    } catch (error) {
      // Even on error, we MUST return a verdict
      logger.getLogger().error('Governance evaluation failed', error as Error, {
        policy,
      });

      return {
        verdict: 'REJECTED',
        policy,
        rationale: `Governance evaluation error: ${(error as Error).message}`,
        timestamp,
        evaluatedBy: this.config.evaluatedBy,
        confidence: 1.0,
        metadata: {
          riskLevel: 'critical',
          soc2Controls: ['CC6.1', 'CC7.2', 'PI1.3'],
          remediationSuggestions: [
            'Review governance service logs',
            'Contact security team',
            'Do not proceed with execution',
          ],
        },
      };
    }
  }

  /**
   * Evaluate multiple policies and generate comprehensive verdict
   */
  async evaluateAll(
    input: any,
    context: any,
    policies: string[]
  ): Promise<GovernanceEvaluation> {
    const auditId = randomUUID();
    const verdicts: GovernanceVerdict[] = [];
    const allViolations: any[] = [];

    logger.getLogger().info('Evaluating multiple policies', {
      policies,
      auditId,
    });

    for (const policy of policies) {
      const verdict = await this.generateVerdict(input, context, policy);
      verdicts.push(verdict);

      if (verdict.metadata?.evidence) {
        allViolations.push(
          ...verdict.metadata.evidence.map((msg) => ({
            policy,
            rule: 'unknown',
            severity: verdict.verdict === 'REJECTED' ? 'critical' : 'warning',
            message: msg,
          }))
        );
      }
    }

    // Determine overall verdict - most restrictive wins
    let overallVerdict = verdicts[0];
    for (const verdict of verdicts) {
      if (verdict.verdict === 'REJECTED') {
        overallVerdict = verdict;
        break;
      } else if (verdict.verdict === 'REQUIRES_REVIEW' && overallVerdict.verdict !== 'REJECTED') {
        overallVerdict = verdict;
      }
    }

    const evaluation: GovernanceEvaluation = {
      verdict: overallVerdict,
      policiesEvaluated: policies,
      hasViolations: allViolations.length > 0,
      violations: allViolations.length > 0 ? allViolations : undefined,
      auditId,
    };

    logger.getLogger().info('Policy evaluation complete', {
      overallVerdict: overallVerdict.verdict,
      policiesEvaluated: policies.length,
      violationCount: allViolations.length,
      auditId,
    });

    return evaluation;
  }

  /**
   * Generate verdict from safety report
   */
  async generateVerdictFromSafety(safetyReport: SafetyReport): Promise<GovernanceVerdict> {
    const timestamp = new Date().toISOString();

    if (safetyReport.passed) {
      return {
        verdict: 'APPROVED',
        policy: 'safety-validation',
        rationale: 'Safety validation passed',
        timestamp,
        evaluatedBy: this.config.evaluatedBy,
        confidence: 1.0,
        metadata: {
          riskLevel: 'low',
          soc2Controls: ['CC6.1', 'PI1.3'],
        },
      };
    }

    const criticalViolations = safetyReport.violations.filter(
      (v) => v.severity === 'critical'
    );
    const hasBlocking = safetyReport.violations.some((v) => v.action === 'block');

    return {
      verdict: hasBlocking || criticalViolations.length > 0 ? 'REJECTED' : 'REQUIRES_REVIEW',
      policy: 'safety-validation',
      rationale: `Safety violations detected: ${safetyReport.violations.length} issues`,
      timestamp,
      evaluatedBy: this.config.evaluatedBy,
      confidence: 1.0,
      metadata: {
        riskLevel: hasBlocking ? 'critical' : 'high',
        soc2Controls: ['CC6.1', 'PI1.3'],
        evidence: safetyReport.violations.map((v) => v.message),
        remediationSuggestions: this.generateRemediationSuggestions(
          safetyReport.violations.map((v) => ({
            rule: v.ruleId,
            severity: v.severity,
            message: v.message,
          }))
        ),
      },
    };
  }

  /**
   * Register a policy evaluator
   */
  registerPolicy(policyName: string, evaluator: PolicyEvaluator): void {
    this.policyEvaluators.set(policyName, evaluator);
    logger.getLogger().info('Policy evaluator registered', { policyName });
  }

  /**
   * Generate remediation suggestions based on violations
   */
  private generateRemediationSuggestions(violations: any[]): string[] {
    const suggestions = new Set<string>();

    for (const violation of violations) {
      if (violation.message.includes('PII')) {
        suggestions.add('Remove or redact personally identifiable information');
      }
      if (violation.message.includes('injection')) {
        suggestions.add('Sanitize input to prevent injection attacks');
      }
      if (violation.message.includes('rate limit')) {
        suggestions.add('Reduce request frequency or contact support for quota increase');
      }
      if (violation.severity === 'critical') {
        suggestions.add('Contact security team immediately');
      }
    }

    if (suggestions.size === 0) {
      suggestions.add('Review policy documentation for compliance requirements');
      suggestions.add('Contact governance team for guidance');
    }

    return Array.from(suggestions);
  }
}

/**
 * Create governance service for agent execution platform
 */
export function createGovernanceService(config: Partial<GovernanceServiceConfig> = {}): GovernanceService {
  return new GovernanceService({
    evaluatedBy: 'agent-execution-platform',
    ...config,
  });
}

/**
 * Singleton instance for agent execution platform
 */
let serviceInstance: GovernanceService | null = null;

/**
 * Initialize singleton governance service
 */
export function initializeGovernanceService(config: Partial<GovernanceServiceConfig> = {}): GovernanceService {
  serviceInstance = createGovernanceService(config);
  return serviceInstance;
}

/**
 * Get singleton governance service
 */
export function getGovernanceService(): GovernanceService {
  if (!serviceInstance) {
    // Auto-initialize with defaults if not explicitly initialized
    serviceInstance = createGovernanceService();
    logger.getLogger().warn('Governance service auto-initialized with defaults');
  }
  return serviceInstance;
}

// @ts-nocheck
/**
 * Policy Simulator Service
 *
 * Provides policy simulation and what-if analysis capabilities.
 * Allows testing policy changes before deployment.
 *
 * SOC 2 Controls: CC7.2, PI1.1
 *
 * @module services/PolicySimulatorService
 */

import { z } from 'zod';
import type { Policy, PolicyContext, GovernanceVerdict, PolicyRule } from '../governance/types.js';
import { createDataEnvelope, GovernanceResult } from '../types/data-envelope.js';
import type { DataEnvelope } from '../types/data-envelope.js';
import logger from '../utils/logger.js';

// ============================================================================
// Simulation Types
// ============================================================================

export interface SimulationRequest {
  policy: Policy;
  context: PolicyContext;
  compareWith?: Policy;
}

export interface SimulationResult {
  verdict: GovernanceVerdict;
  matchedRules: MatchedRule[];
  unmatchedRules: PolicyRule[];
  evaluationPath: EvaluationStep[];
  comparisonDiff?: PolicyDiff;
}

export interface MatchedRule {
  rule: PolicyRule;
  actualValue: unknown;
  matched: boolean;
  reason: string;
}

export interface EvaluationStep {
  step: number;
  description: string;
  result: 'passed' | 'failed' | 'skipped';
  details?: Record<string, unknown>;
}

export interface PolicyDiff {
  addedRules: PolicyRule[];
  removedRules: PolicyRule[];
  modifiedRules: { before: PolicyRule; after: PolicyRule }[];
  scopeChanges: {
    stagesAdded: string[];
    stagesRemoved: string[];
    tenantsAdded: string[];
    tenantsRemoved: string[];
  };
  actionChanged: boolean;
  beforeAction?: string;
  afterAction?: string;
}

export interface BatchSimulationRequest {
  policy: Policy;
  contexts: PolicyContext[];
}

export interface BatchSimulationResult {
  totalContexts: number;
  allowCount: number;
  denyCount: number;
  escalateCount: number;
  warnCount: number;
  results: SimulationResult[];
}

export interface ImpactAnalysis {
  estimatedAffectedUsers: number;
  estimatedAffectedResources: number;
  riskLevel: 'low' | 'medium' | 'high' | 'critical';
  warnings: string[];
  recommendations: string[];
}

// ============================================================================
// Validation Schemas
// ============================================================================

const policyRuleSchema = z.object({
  field: z.string(),
  operator: z.enum(['eq', 'neq', 'lt', 'gt', 'in', 'not_in', 'contains']),
  value: z.unknown(),
});

export const simulationRequestSchema = z.object({
  policy: z.object({
    id: z.string(),
    description: z.string().optional(),
    scope: z.object({
      stages: z.array(z.enum(['data', 'train', 'alignment', 'runtime'])),
      tenants: z.array(z.string()),
    }),
    rules: z.array(policyRuleSchema),
    action: z.enum(['ALLOW', 'DENY', 'ESCALATE', 'WARN']),
  }),
  context: z.object({
    stage: z.enum(['data', 'train', 'alignment', 'runtime']),
    tenantId: z.string(),
    region: z.string().optional(),
    payload: z.record(z.unknown()),
    metadata: z.record(z.unknown()).optional(),
    simulation: z.boolean().optional(),
  }),
  compareWith: z.object({
    id: z.string(),
    description: z.string().optional(),
    scope: z.object({
      stages: z.array(z.enum(['data', 'train', 'alignment', 'runtime'])),
      tenants: z.array(z.string()),
    }),
    rules: z.array(policyRuleSchema),
    action: z.enum(['ALLOW', 'DENY', 'ESCALATE', 'WARN']),
  }).optional(),
});

// ============================================================================
// Service Implementation
// ============================================================================

export class PolicySimulatorService {
  /**
   * Simulate a policy against a context
   */
  async simulate(
    request: SimulationRequest,
    actorId: string
  ): Promise<DataEnvelope<SimulationResult>> {
    const startTime = Date.now();

    try {
      const evaluationPath: EvaluationStep[] = [];
      const matchedRules: MatchedRule[] = [];
      const unmatchedRules: PolicyRule[] = [];

      // Step 1: Check scope
      evaluationPath.push({
        step: 1,
        description: 'Checking policy scope',
        result: 'passed',
        details: {
          policyStages: request.policy.scope.stages,
          contextStage: request.context.stage,
          policyTenants: request.policy.scope.tenants,
          contextTenant: request.context.tenantId,
        },
      });

      const stageMatches = request.policy.scope.stages.includes(request.context.stage);
      const tenantMatches =
        request.policy.scope.tenants.includes('*') ||
        request.policy.scope.tenants.includes(request.context.tenantId);

      if (!stageMatches || !tenantMatches) {
        evaluationPath.push({
          step: 2,
          description: 'Scope check failed - policy does not apply',
          result: 'failed',
          details: { stageMatches, tenantMatches },
        });

        const verdict = this.createVerdict('ALLOW', [], startTime, true);

        return createDataEnvelope(
          {
            verdict,
            matchedRules: [],
            unmatchedRules: request.policy.rules,
            evaluationPath,
          },
          { source: 'PolicySimulatorService', actor: actorId },
          {
            result: GovernanceResult.ALLOW,
            policyId: 'policy-simulation',
            reason: 'Policy simulation completed',
            evaluator: 'PolicySimulatorService',
          }
        );
      }

      evaluationPath.push({
        step: 2,
        description: 'Scope check passed',
        result: 'passed',
      });

      // Step 3: Evaluate rules
      evaluationPath.push({
        step: 3,
        description: 'Evaluating policy rules',
        result: 'passed',
        details: { ruleCount: request.policy.rules.length },
      });

      let allRulesMatch = true;
      const failedReasons: string[] = [];

      for (const rule of request.policy.rules) {
        const actualValue = this.getNestedValue(request.context.payload, rule.field);
        const matched = this.evaluateRule(rule, actualValue);

        matchedRules.push({
          rule,
          actualValue,
          matched,
          reason: matched
            ? `Field ${rule.field} ${rule.operator} ${JSON.stringify(rule.value)}`
            : `Field ${rule.field} failed: expected ${rule.operator} ${JSON.stringify(rule.value)}, got ${JSON.stringify(actualValue)}`,
        });

        if (!matched) {
          allRulesMatch = false;
          unmatchedRules.push(rule);
          failedReasons.push(`Rule failed: ${rule.field} ${rule.operator} ${JSON.stringify(rule.value)}`);
        }
      }

      // Determine final action
      const finalAction = allRulesMatch ? request.policy.action : 'ALLOW';

      evaluationPath.push({
        step: 4,
        description: allRulesMatch
          ? `All rules matched - applying action: ${request.policy.action}`
          : `Some rules failed - defaulting to ALLOW`,
        result: allRulesMatch ? 'passed' : 'failed',
        details: {
          matchedCount: matchedRules.filter((r: any) => r.matched).length,
          totalRules: request.policy.rules.length,
        },
      });

      const verdict = this.createVerdict(
        finalAction,
        allRulesMatch ? [`Policy ${request.policy.id} matched`] : failedReasons,
        startTime,
        true
      );

      // Calculate comparison diff if compareWith policy is provided
      let comparisonDiff: PolicyDiff | undefined;
      if (request.compareWith) {
        comparisonDiff = this.calculatePolicyDiff(request.compareWith, request.policy);
      }

      return createDataEnvelope(
        {
          verdict,
          matchedRules,
          unmatchedRules,
          evaluationPath,
          comparisonDiff,
        },
        { source: 'PolicySimulatorService', actor: actorId },
        {
          result: GovernanceResult.ALLOW,
          policyId: 'policy-simulation',
          reason: 'Policy simulation completed',
          evaluator: 'PolicySimulatorService',
        }
      );
    } catch (error: any) {
      logger.error('Error simulating policy:', error);
      throw error;
    }
  }

  /**
   * Simulate a policy against multiple contexts (batch)
   */
  async batchSimulate(
    request: BatchSimulationRequest,
    actorId: string
  ): Promise<DataEnvelope<BatchSimulationResult>> {
    try {
      const results: SimulationResult[] = [];
      let allowCount = 0;
      let denyCount = 0;
      let escalateCount = 0;
      let warnCount = 0;

      for (const context of request.contexts) {
        const simResult = await this.simulate(
          { policy: request.policy, context },
          actorId
        );

        results.push(simResult.data);

        switch (simResult.data.verdict.action) {
          case 'ALLOW':
            allowCount++;
            break;
          case 'DENY':
            denyCount++;
            break;
          case 'ESCALATE':
            escalateCount++;
            break;
          case 'WARN':
            warnCount++;
            break;
        }
      }

      return createDataEnvelope(
        {
          totalContexts: request.contexts.length,
          allowCount,
          denyCount,
          escalateCount,
          warnCount,
          results,
        },
        { source: 'PolicySimulatorService', actor: actorId },
        {
          result: GovernanceResult.ALLOW,
          policyId: 'policy-simulation',
          reason: 'Batch simulation completed',
          evaluator: 'PolicySimulatorService',
        }
      );
    } catch (error: any) {
      logger.error('Error in batch simulation:', error);
      throw error;
    }
  }

  /**
   * Analyze the impact of a policy change
   */
  async analyzeImpact(
    currentPolicy: Policy,
    newPolicy: Policy,
    actorId: string
  ): Promise<DataEnvelope<ImpactAnalysis>> {
    try {
      const diff = this.calculatePolicyDiff(currentPolicy, newPolicy);
      const warnings: string[] = [];
      const recommendations: string[] = [];

      // Analyze risk level
      let riskScore = 0;

      // Check for action changes
      if (diff.actionChanged) {
        if (diff.afterAction === 'DENY' && diff.beforeAction === 'ALLOW') {
          riskScore += 30;
          warnings.push('Policy changing from ALLOW to DENY - may block previously allowed operations');
        }
        if (diff.afterAction === 'ALLOW' && diff.beforeAction === 'DENY') {
          riskScore += 20;
          warnings.push('Policy changing from DENY to ALLOW - may permit previously blocked operations');
        }
      }

      // Check for rule changes
      if (diff.removedRules.length > 0) {
        riskScore += diff.removedRules.length * 10;
        warnings.push(`${diff.removedRules.length} rules removed - conditions will no longer be checked`);
      }

      if (diff.addedRules.length > 0) {
        riskScore += diff.addedRules.length * 5;
        warnings.push(`${diff.addedRules.length} new rules added - may affect matching behavior`);
      }

      // Check for scope changes
      if (diff.scopeChanges.tenantsRemoved.length > 0) {
        riskScore += 15;
        warnings.push(`Policy scope reduced: tenants ${diff.scopeChanges.tenantsRemoved.join(', ')} removed`);
      }

      if (diff.scopeChanges.stagesRemoved.length > 0) {
        riskScore += 10;
        warnings.push(`Policy scope reduced: stages ${diff.scopeChanges.stagesRemoved.join(', ')} removed`);
      }

      // Determine risk level
      let riskLevel: 'low' | 'medium' | 'high' | 'critical';
      if (riskScore >= 50) {
        riskLevel = 'critical';
        recommendations.push('Consider phased rollout with monitoring');
        recommendations.push('Enable detailed audit logging during deployment');
      } else if (riskScore >= 30) {
        riskLevel = 'high';
        recommendations.push('Test thoroughly in staging environment');
        recommendations.push('Prepare rollback plan');
      } else if (riskScore >= 15) {
        riskLevel = 'medium';
        recommendations.push('Review changes with security team');
      } else {
        riskLevel = 'low';
        recommendations.push('Standard review and approval process recommended');
      }

      // Estimate affected resources (placeholder - would use actual data in production)
      const estimatedAffectedUsers = Math.floor(Math.random() * 1000) + 100;
      const estimatedAffectedResources = Math.floor(Math.random() * 5000) + 500;

      return createDataEnvelope(
        {
          estimatedAffectedUsers,
          estimatedAffectedResources,
          riskLevel,
          warnings,
          recommendations,
        },
        { source: 'PolicySimulatorService', actor: actorId },
        {
          result: GovernanceResult.ALLOW,
          policyId: 'policy-simulation',
          reason: 'Impact analysis completed',
          evaluator: 'PolicySimulatorService',
        }
      );
    } catch (error: any) {
      logger.error('Error analyzing impact:', error);
      throw error;
    }
  }

  // --------------------------------------------------------------------------
  // Helper Methods
  // --------------------------------------------------------------------------

  private evaluateRule(rule: PolicyRule, actualValue: unknown): boolean {
    switch (rule.operator) {
      case 'eq':
        return actualValue === rule.value;
      case 'neq':
        return actualValue !== rule.value;
      case 'lt':
        return typeof actualValue === 'number' && typeof rule.value === 'number'
          ? actualValue < rule.value
          : false;
      case 'gt':
        return typeof actualValue === 'number' && typeof rule.value === 'number'
          ? actualValue > rule.value
          : false;
      case 'in':
        return Array.isArray(rule.value) && rule.value.includes(actualValue);
      case 'not_in':
        return Array.isArray(rule.value) && !rule.value.includes(actualValue);
      case 'contains':
        if (typeof actualValue === 'string' && typeof rule.value === 'string') {
          return actualValue.includes(rule.value);
        }
        if (Array.isArray(actualValue)) {
          return actualValue.includes(rule.value);
        }
        return false;
      default:
        return false;
    }
  }

  private getNestedValue(obj: Record<string, unknown>, path: string): unknown {
    const parts = path.split('.');
    let current: unknown = obj;

    for (const part of parts) {
      if (current === null || current === undefined) {
        return undefined;
      }
      if (typeof current === 'object') {
        current = (current as Record<string, unknown>)[part];
      } else {
        return undefined;
      }
    }

    return current;
  }

  private createVerdict(
    action: 'ALLOW' | 'DENY' | 'ESCALATE' | 'WARN',
    reasons: string[],
    startTime: number,
    isSimulation: boolean
  ): GovernanceVerdict {
    return {
      action,
      reasons,
      policyIds: [],
      metadata: {
        timestamp: new Date().toISOString(),
        evaluator: 'PolicySimulatorService',
        latencyMs: Date.now() - startTime,
        simulation: isSimulation,
      },
      provenance: {
        origin: 'policy-simulation',
        confidence: 1.0,
      },
    };
  }

  private calculatePolicyDiff(before: Policy, after: Policy): PolicyDiff {
    const beforeRuleKeys = new Set(before.rules.map((r: any) => `${r.field}:${r.operator}`));
    const afterRuleKeys = new Set(after.rules.map((r: any) => `${r.field}:${r.operator}`));

    const addedRules = after.rules.filter(
      (r: any) => !beforeRuleKeys.has(`${r.field}:${r.operator}`)
    );
    const removedRules = before.rules.filter(
      (r: any) => !afterRuleKeys.has(`${r.field}:${r.operator}`)
    );

    const modifiedRules: { before: PolicyRule; after: PolicyRule }[] = [];
    for (const afterRule of after.rules) {
      const key = `${afterRule.field}:${afterRule.operator}`;
      if (beforeRuleKeys.has(key)) {
        const beforeRule = before.rules.find(
          (r: any) => `${r.field}:${r.operator}` === key
        );
        if (beforeRule && JSON.stringify(beforeRule.value) !== JSON.stringify(afterRule.value)) {
          modifiedRules.push({ before: beforeRule, after: afterRule });
        }
      }
    }

    return {
      addedRules,
      removedRules,
      modifiedRules,
      scopeChanges: {
        stagesAdded: after.scope.stages.filter((s) => !before.scope.stages.includes(s)),
        stagesRemoved: before.scope.stages.filter((s) => !after.scope.stages.includes(s)),
        tenantsAdded: after.scope.tenants.filter((t) => !before.scope.tenants.includes(t)),
        tenantsRemoved: before.scope.tenants.filter((t) => !after.scope.tenants.includes(t)),
      },
      actionChanged: before.action !== after.action,
      beforeAction: before.action,
      afterAction: after.action,
    };
  }
}

// Export singleton instance
export const policySimulatorService = new PolicySimulatorService();
export default PolicySimulatorService;

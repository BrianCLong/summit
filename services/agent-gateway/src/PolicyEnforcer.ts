/**
 * Policy Enforcer
 * AGENT-3: Policy Compiler for Agents
 * Integrates with OPA (Open Policy Agent) to enforce agent-specific policies
 */

import fetch from 'node-fetch';
import type {
  Agent,
  AgentAction,
  PolicyDecision,
  PolicyObligation,
  OperationMode,
} from './types.js';

export interface PolicyEvaluationInput {
  agent: Agent;
  action: AgentAction;
  tenantId: string;
  projectId?: string;
  operationMode: OperationMode;
}

export class PolicyEnforcer {
  constructor(
    private opaEndpoint: string,
    private enableDryRun: boolean = false
  ) {}

  /**
   * Evaluate policy for an agent action
   * AGENT-3b: Implement agent-specific rules
   */
  async evaluate(input: PolicyEvaluationInput): Promise<PolicyDecision> {
    try {
      // Build OPA input
      const opaInput = this.buildOPAInput(input);

      // Call OPA
      const response = await fetch(`${this.opaEndpoint}/v1/data/summit/agent/decision`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ input: opaInput }),
      });

      if (!response.ok) {
        throw new Error(`OPA evaluation failed: ${response.statusText}`);
      }

      const result = await response.json();

      // Parse OPA result
      return this.parseOPAResult(result);
    } catch (error: any) {
      console.error('Policy evaluation error:', error);

      // In dry-run mode, allow by default
      if (this.enableDryRun) {
        return {
          allowed: true,
          reason: 'Policy evaluation failed, dry-run mode allows by default',
          obligations: [],
          matchedPolicies: [],
        };
      }

      // In production, deny by default on error (fail-safe)
      return {
        allowed: false,
        reason: `Policy evaluation error: ${error.message}`,
        obligations: [],
        matchedPolicies: [],
      };
    }
  }

  /**
   * Build OPA input structure
   * Maps our types to OPA's expected input format
   */
  private buildOPAInput(input: PolicyEvaluationInput): Record<string, unknown> {
    return {
      subject: {
        type: 'AGENT',
        id: input.agent.id,
        name: input.agent.name,
        agentType: input.agent.agentType,
        tenantScopes: input.agent.tenantScopes,
        projectScopes: input.agent.projectScopes,
        capabilities: input.agent.capabilities,
        restrictions: input.agent.restrictions,
        isCertified: input.agent.isCertified,
        certificationExpiresAt: input.agent.certificationExpiresAt?.toISOString(),
      },
      action: {
        type: input.action.actionType,
        target: input.action.actionTarget,
        riskLevel: input.action.riskLevel,
        riskFactors: input.action.riskFactors,
      },
      resource: {
        tenantId: input.tenantId,
        projectId: input.projectId,
      },
      context: {
        operationMode: input.operationMode,
        timestamp: new Date().toISOString(),
      },
    };
  }

  /**
   * Parse OPA result into our PolicyDecision format
   */
  private parseOPAResult(result: any): PolicyDecision {
    const decision = result.result || {};

    return {
      allowed: decision.allowed || false,
      reason: decision.reason || 'No reason provided',
      obligations: decision.obligations || [],
      matchedPolicies: decision.matched_policies || [],
    };
  }

  /**
   * Quick check if agent has a specific capability
   */
  hasCapability(agent: Agent, capability: string): boolean {
    return agent.capabilities.includes(capability);
  }

  /**
   * Check if action is allowed based on agent restrictions
   */
  isActionAllowed(agent: Agent, actionType: string): boolean {
    const restrictions = agent.restrictions;

    // Check denied operations
    if (restrictions.deniedOperations?.includes(actionType)) {
      return false;
    }

    // Check allowed operations (if specified)
    if (restrictions.allowedOperations && restrictions.allowedOperations.length > 0) {
      return restrictions.allowedOperations.includes(actionType);
    }

    return true;
  }

  /**
   * Check if risk level is within agent's allowed limit
   */
  isRiskLevelAllowed(agent: Agent, riskLevel: string): boolean {
    const riskHierarchy = ['low', 'medium', 'high', 'critical'];
    const maxRiskIndex = riskHierarchy.indexOf(agent.restrictions.maxRiskLevel);
    const actionRiskIndex = riskHierarchy.indexOf(riskLevel);

    return actionRiskIndex <= maxRiskIndex;
  }
}

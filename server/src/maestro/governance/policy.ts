
import { CapabilityDefinition, ResourceLimits, getLimitsForCapabilities, getCapability } from './registry';
import { logger } from '../../utils/logger';

export interface PolicyDecision {
  allowed: boolean;
  reason: string;
  constraints?: Partial<ResourceLimits>;
  violation?: string;
}

export interface AgentContext {
  tenantId: string;
  agentId: string;
  capabilities: string[];
  currentUsage: {
    actions: number;
    tokens: number;
    externalCalls: number;
    cost: number;
    startTime: number;
  };
}

export interface ActionRequest {
  action: string;
  resource?: string;
  params?: any;
}

export class PolicyEngine {

  /**
   * Evaluates if an agent is allowed to perform a specific action.
   * Enforces "Fail-Closed" logic.
   */
  async evaluateAction(context: AgentContext, request: ActionRequest): Promise<PolicyDecision> {
    try {
      // 1. Check Hard Caps
      const limits = getLimitsForCapabilities(context.capabilities);

      if (context.currentUsage.actions >= limits.maxActions) {
        return { allowed: false, reason: 'Max actions limit exceeded', violation: 'maxActions' };
      }

      const duration = Date.now() - context.currentUsage.startTime;
      if (duration >= limits.maxTimeMs) {
        return { allowed: false, reason: 'Max execution time exceeded', violation: 'maxTimeMs' };
      }

      if (context.currentUsage.tokens >= limits.maxTokens) {
        return { allowed: false, reason: 'Max token limit exceeded', violation: 'maxTokens' };
      }

      if (context.currentUsage.externalCalls >= limits.maxExternalCalls && this.isExternalCall(request.action)) {
         return { allowed: false, reason: 'Max external calls limit exceeded', violation: 'maxExternalCalls' };
      }

      if (context.currentUsage.cost >= limits.maxCostUsd) {
         return { allowed: false, reason: 'Max cost limit exceeded', violation: 'maxCostUsd' };
      }

      // 2. Check Capability Permissions
      const hasPermission = this.checkCapability(context.capabilities, request.action);
      if (!hasPermission) {
        return { allowed: false, reason: `Agent lacks capability for action: ${request.action}`, violation: 'missingCapability' };
      }

      // 3. OPA Check (Mocked for now, but structured for integration)
      const opaDecision = await this.checkOPA(context, request);
      if (!opaDecision.allowed) {
        return opaDecision;
      }

      return { allowed: true, reason: 'Policy check passed' };

    } catch (error) {
      logger.error('Policy evaluation failed', { error, context, request });
      // Fail-Closed
      return { allowed: false, reason: 'Internal policy error', violation: 'systemError' };
    }
  }

  private isExternalCall(action: string): boolean {
    return action.startsWith('http.') || action.startsWith('browser.');
  }

  private checkCapability(agentCapabilities: string[], action: string): boolean {
    for (const capId of agentCapabilities) {
      const cap = getCapability(capId);
      if (cap && cap.allowedActions.includes(action)) {
        return true;
      }
    }
    return false;
  }

  // Placeholder for OPA integration
  private async checkOPA(context: AgentContext, request: ActionRequest): Promise<PolicyDecision> {
    // In a real implementation, this would make an HTTP call to the OPA sidecar
    // For now, we implement basic logic that mimics OPA policies

    // Example Policy: Block access to internal metadata endpoints
    if (request.resource && request.resource.includes('/metadata/internal')) {
        return { allowed: false, reason: 'Access to internal metadata denied by OPA', violation: 'restrictedResource' };
    }

    return { allowed: true, reason: 'OPA allowed' };
  }
}

export const policyEngine = new PolicyEngine();

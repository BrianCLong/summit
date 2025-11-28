import { agentRegistry } from '../governance/agent-registry.js';
import { agentROITracker } from './roi-tracker.js';

class AgentControlPlane {
  /**
   * Checks if an agent is allowed to perform a specific action based on its policies.
   */
  async verifyAgentAction(
    agentId: string,
    action: string,
    context: Record<string, any>
  ): Promise<{ allowed: boolean; reason?: string }> {
    const policies = await agentRegistry.getPolicies(agentId);

    // Default to allowed if no policies exist? Or strict deny?
    // "Governance-First" implies strictness, but let's allow if no blocking policies found.

    for (const policy of policies) {
      if (!policy.isBlocking) continue;

      if (policy.policyType === 'MANUAL_APPROVAL') {
        // Mock check: if 'approved' is not in context, deny
        if (!context.approvalToken) {
            return { allowed: false, reason: `Policy ${policy.name} requires manual approval token.` };
        }
      }

      // Future: Evaluate OPA_REGO policies here
      if (policy.policyType === 'OPA_REGO') {
         // This would call the OPA service
         // For now, we assume passed if not explicitly implemented in this stub
      }
    }

    return { allowed: true };
  }

  /**
   * Calculates the health score of an agent based on its recent metrics.
   * Returns a score from 0 to 100.
   */
  async getAgentHealth(agentId: string): Promise<{ score: number; status: string }> {
    const metrics = await agentROITracker.getMetrics(agentId);

    // Simple heuristic: if there are recent errors, lower score.
    // Assuming we log 'error_count' as a metric with negative value or separate type?
    // For this MVP, we'll assume 'ERROR_RATE' metric exists.

    const recentErrors = metrics.filter(
        m => m.metricType === 'ERROR_RATE' &&
        m.recordedAt.getTime() > Date.now() - 3600000 // Last hour
    );

    if (recentErrors.length > 0) {
        // Average the error rate
        const avgError = recentErrors.reduce((acc, m) => acc + m.value, 0) / recentErrors.length;
        if (avgError > 0.1) return { score: 50, status: 'DEGRADED' };
        if (avgError > 0.5) return { score: 10, status: 'CRITICAL' };
    }

    return { score: 100, status: 'HEALTHY' };
  }
}

export const agentControlPlane = new AgentControlPlane();

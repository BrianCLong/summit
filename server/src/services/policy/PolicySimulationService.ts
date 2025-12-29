import { EnterprisePolicy } from './types.js';

interface SimulationResult {
    totalRuns: number;
    allowed: number;
    blocked: number;
    approvalRequired: number;
    details: { runId: string; outcome: string; reason?: string }[];
}

export class PolicySimulationService {
  private static instance: PolicySimulationService;

  private constructor() {}

  public static getInstance(): PolicySimulationService {
    if (!PolicySimulationService.instance) {
      PolicySimulationService.instance = new PolicySimulationService();
    }
    return PolicySimulationService.instance;
  }

  /**
   * Simulates a policy against a set of historical runs.
   * In a real implementation, this would fetch runs from the DB.
   * For MVP, we accept the runs as input or mock the fetch.
   */
  async simulate(policy: EnterprisePolicy, historicalRuns: any[]): Promise<SimulationResult> {
    const results: SimulationResult = {
      totalRuns: historicalRuns.length,
      allowed: 0,
      blocked: 0,
      approvalRequired: 0,
      details: []
    };

    for (const run of historicalRuns) {
      const decision = this.evaluateRunAgainstPolicy(run, policy);

      // Strict logic: Blocked if allow=false.
      // If allow=true, check obligation.

      if (!decision.allow) {
          results.blocked++;
      } else if (decision.obligation === 'APPROVAL_REQUIRED') {
          results.approvalRequired++;
      } else {
          results.allowed++;
      }

      if (!decision.allow || decision.obligation) {
          results.details.push({
              runId: run.id,
              outcome: !decision.allow ? 'BLOCKED' : 'ALLOWED_WITH_OBLIGATION',
              reason: decision.reason
          });
      }
    }

    return results;
  }

  // Reuse logic from PolicyService or duplicate for simulation safety (no side effects)
  private evaluateRunAgainstPolicy(run: any, policy: EnterprisePolicy): { allow: boolean; obligation?: string; reason?: string } {
      // 1. Check Capability
      // Assuming run has { tools: ['search', 'db_write'], cost: 0.5, context: ... }

      // Check Tool/Capability Whitelist
      // Cast run to any because it's untyped input in this context
      for (const tool of (run as any).tools || []) {
          // Simple logic: if capabilities define strict allowed actions, check them
          // This is a placeholder for complex matching logic
      }

      // 2. Check Budget
      if (policy.budgets?.maxTokensPerRequest && run.usage?.totalTokens > policy.budgets.maxTokensPerRequest) {
          return { allow: false, reason: 'Exceeds token budget' };
      }

      // 3. Check Approvals
      // e.g., if spend > threshold
      const cost = run.cost || 0;
      const spendApproval = policy.approvals.find(a => a.triggerEvent === 'SPEND_THRESHOLD');
      if (spendApproval && spendApproval.thresholdValue && cost > spendApproval.thresholdValue) {
          return { allow: true, obligation: 'APPROVAL_REQUIRED', reason: 'High spend detected' };
      }

      return { allow: true };
  }
}

export const policySimulationService = PolicySimulationService.getInstance();

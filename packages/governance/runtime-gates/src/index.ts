import { z } from 'zod';

export const AgentCharterSchema = z.object({
  agentId: z.string(),
  name: z.string(),
  version: z.string(),
  authority: z.object({
    scopes: z.array(z.string()),
    maxBudgetUSD: z.number(),
    maxTokensPerRun: z.number(),
    expiryDate: z.string().datetime(),
  }),
  gates: z.object({
    requireHumanApprovalFor: z.array(z.string()),
    allowedTools: z.array(z.string()),
  }),
  ownerSignature: z.string(),
});

export type AgentCharter = z.infer<typeof AgentCharterSchema>;

export interface GateResult {
  allowed: boolean;
  reason?: string;
}

export class PolicyGate {
  /**
   * Validate an action against the agent's charter.
   */
  validate(charter: AgentCharter, actionType: string, params: any, currentSpendUSD: number): GateResult {
    // 1. Check Expiry
    if (new Date(charter.authority.expiryDate) < new Date()) {
        return { allowed: false, reason: 'Charter expired' };
    }

    // 2. Check Budget
    if (currentSpendUSD > charter.authority.maxBudgetUSD) {
        return { allowed: false, reason: 'Budget exceeded' };
    }

    // 3. Check Tool Allowlist
    if (!charter.gates.allowedTools.includes(actionType)) {
        // Assume actionType maps to tool name
        // Strict allowlist
        return { allowed: false, reason: `Tool ${actionType} not in allowlist` };
    }

    // 4. Check Human Approval
    if (charter.gates.requireHumanApprovalFor.includes(actionType)) {
        // This gate just flags it. The orchestrator must handle the pause/ask.
        // For 'validate', we might say it's allowed BUT requires approval?
        // Or we say allowed=false, reason='approval_required'
        return { allowed: false, reason: 'approval_required' };
    }

    return { allowed: true };
  }
}

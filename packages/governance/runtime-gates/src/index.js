"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.PolicyGate = exports.AgentCharterSchema = void 0;
const zod_1 = require("zod");
exports.AgentCharterSchema = zod_1.z.object({
    agentId: zod_1.z.string(),
    name: zod_1.z.string(),
    version: zod_1.z.string(),
    authority: zod_1.z.object({
        scopes: zod_1.z.array(zod_1.z.string()),
        maxBudgetUSD: zod_1.z.number(),
        maxTokensPerRun: zod_1.z.number(),
        expiryDate: zod_1.z.string().datetime(),
    }),
    gates: zod_1.z.object({
        requireHumanApprovalFor: zod_1.z.array(zod_1.z.string()),
        allowedTools: zod_1.z.array(zod_1.z.string()),
    }),
    ownerSignature: zod_1.z.string(),
});
class PolicyGate {
    /**
     * Validate an action against the agent's charter.
     */
    validate(charter, actionType, params, currentSpendUSD) {
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
exports.PolicyGate = PolicyGate;

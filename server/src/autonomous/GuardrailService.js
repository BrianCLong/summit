"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.GuardrailService = void 0;
class GuardrailService {
    policyEngine;
    logger;
    constructor(policyEngine, logger) {
        this.policyEngine = policyEngine;
        this.logger = logger;
    }
    /**
     * Enforces the strict prohibitions defined in AUTONOMOUS_OPS_SCOPE.md
     */
    async checkGuardrails(req) {
        const { actionType, tenantId } = req;
        // 1. Prohibit Cross-Tenant Actions
        // If tenantId is missing or 'global'/'all', block it.
        if (!tenantId || tenantId === 'global' || tenantId === '*') {
            this.logger.warn({ actionType }, 'Blocked cross-tenant autonomous action');
            return { allowed: false, reason: 'Cross-tenant actions are strictly prohibited.' };
        }
        // 2. Prohibit Policy Changes
        if (this.isPolicyChange(actionType)) {
            this.logger.warn({ actionType, tenantId }, 'Blocked autonomous policy change');
            return { allowed: false, reason: 'Autonomous policy changes are strictly prohibited.' };
        }
        // 3. Prohibit Data Mutation (Business Data)
        if (this.isDataMutation(actionType)) {
            this.logger.warn({ actionType, tenantId }, 'Blocked autonomous data mutation');
            return { allowed: false, reason: 'Autonomous business data mutation is strictly prohibited.' };
        }
        // 4. Delegate remaining checks to the Policy Engine
        // Construct a context for the PolicyEngine
        const context = {
            tenantId: tenantId,
            autonomy: 1, // Assume low autonomy by default for safety
            action: {
                type: actionType,
                category: 'write', // Treat unknown as write for safety
            },
        };
        // We use a dummy subject 'autonomous-system'
        const decision = await this.policyEngine.evaluate('autonomous-system', actionType, req.resourceId || 'unknown-resource', context);
        return {
            allowed: decision.allowed,
            reason: decision.reason,
        };
    }
    isPolicyChange(actionType) {
        const policyKeywords = ['policy', 'role', 'permission', 'acl', 'guardrail', 'scope'];
        return policyKeywords.some(k => actionType.toLowerCase().includes(k));
    }
    isDataMutation(actionType) {
        // Whitelist allowed operational mutations
        const allowedMutations = [
            'throttle_tenant',
            'circuit_reset',
            'auto_retry',
            'send_alert',
            'create_ticket',
            'suggest_scale', // Suggestions are writes to ops tables, but not business data
            'log_event'
        ];
        if (allowedMutations.includes(actionType)) {
            return false;
        }
        // Block generic mutation keywords unless whitelisted
        const mutationKeywords = ['create', 'update', 'delete', 'modify', 'overwrite', 'insert', 'drop'];
        return mutationKeywords.some(k => actionType.toLowerCase().includes(k));
    }
}
exports.GuardrailService = GuardrailService;

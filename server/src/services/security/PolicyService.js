"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.PolicyService = void 0;
const AuditService_js_1 = require("./AuditService.js");
const AccessControl_js_1 = require("../AccessControl.js");
class PolicyService {
    /**
     * Evaluates a policy decision.
     * Currently wraps the existing AccessControl logic but provides a generic interface.
     */
    static async evaluate(input) {
        const start = Date.now();
        // Use existing evaluation logic
        const decision = await (0, AccessControl_js_1.evaluate)(input.action, input.user, input.resource || {}, input.env || {});
        // Default deny if decision is null/undefined
        const result = {
            allow: decision?.allow || false,
            reason: decision?.reason || 'No matching policy allowed this action',
            obligations: []
        };
        // Audit the decision
        await AuditService_js_1.AuditService.log({
            userId: input.user?.id,
            action: 'POLICY_EVALUATION',
            resourceType: 'policy',
            resourceId: input.action,
            details: {
                input: {
                    action: input.action,
                    resourceId: input.resource?.id,
                    resourceType: input.resource?.type
                },
                decision: result,
                durationMs: Date.now() - start
            }
        });
        return result;
    }
}
exports.PolicyService = PolicyService;

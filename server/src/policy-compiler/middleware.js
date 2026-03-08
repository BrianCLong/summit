"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.enforcePolicy = void 0;
exports.withEnforcement = withEnforcement;
const EnforcementService_js_1 = require("./EnforcementService.js");
/**
 * Express Middleware for policy enforcement on routes.
 *
 * @param actionType 'query' | 'export' | 'runbook'
 * @param targetExtractor Function to extract the target resource from the request
 */
const enforcePolicy = (actionType, targetExtractor) => {
    return (req, res, next) => {
        const enforcement = EnforcementService_js_1.EnforcementService.getInstance();
        // Construct RuntimeContext from Request
        // This assumes req.user is populated by auth middleware
        const user = req.user;
        if (!user) {
            res.status(401).json({ error: 'Authentication required for policy enforcement' });
            return;
        }
        const target = targetExtractor(req);
        const context = {
            user: {
                id: user.id,
                roles: user.roles || [],
                clearanceLevel: user.clearanceLevel || 0
            },
            action: {
                type: actionType,
                target: target
            },
            activeAuthority: req.activeAuthority || [] // Assuming authority attached to req
        };
        let result;
        switch (actionType) {
            case 'query':
                result = enforcement.evaluateQuery(context);
                break;
            case 'export':
                result = enforcement.evaluateExport(context);
                break;
            case 'runbook':
                result = enforcement.evaluateRunbookStep(context);
                break;
        }
        if (!result.allowed) {
            res.status(403).json({
                error: 'Policy Enforcement Denied',
                decisionId: result.decisionId,
                reason: result.reason
            });
            return;
        }
        // Attach decision ID to request for audit logging downstream
        req.enforcementDecisionId = result.decisionId;
        next();
    };
};
exports.enforcePolicy = enforcePolicy;
/**
 * Helper to wrap a function (e.g. GraphQL resolver) with enforcement.
 */
async function withEnforcement(context, action) {
    const enforcement = EnforcementService_js_1.EnforcementService.getInstance();
    let result;
    switch (context.action.type) {
        case 'query':
            result = enforcement.evaluateQuery(context);
            break;
        case 'export':
            result = enforcement.evaluateExport(context);
            break;
        case 'runbook':
            result = enforcement.evaluateRunbookStep(context);
            break;
    }
    if (!result.allowed) {
        throw new Error(`Policy Denied: ${result.reason?.humanMessage} (Code: ${result.reason?.code})`);
    }
    return action();
}

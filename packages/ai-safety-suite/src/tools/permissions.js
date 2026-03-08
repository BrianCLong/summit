"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.ToolPermissionGateway = void 0;
class ToolPermissionGateway {
    allowlist = new Map();
    auditLog = [];
    setPolicies(route, policies) {
        this.allowlist.set(route, policies);
    }
    evaluate(toolName, context, requestReason) {
        const policies = this.allowlist.get(context.route) ?? [];
        const allowed = policies.some((policy) => {
            if (policy.toolName !== toolName) {
                return false;
            }
            if (!policy.minRiskLevel) {
                return true;
            }
            const riskOrder = ['low', 'medium', 'high'];
            return riskOrder.indexOf(context.riskLevel) >= riskOrder.indexOf(policy.minRiskLevel);
        });
        const decision = {
            allowed,
            code: allowed ? 'TOOL_ALLOWED' : 'TOOL_DENIED',
            reason: allowed ? 'Tool is allowlisted for route' : 'Tool is not allowlisted for this route/risk',
        };
        this.auditLog.push({
            timestamp: Date.now(),
            tenantId: context.tenantId,
            route: context.route,
            toolName,
            allowed,
            reason: decision.reason,
            context: { ...context, requestReason },
        });
        return decision;
    }
    getAuditLog() {
        return [...this.auditLog];
    }
}
exports.ToolPermissionGateway = ToolPermissionGateway;

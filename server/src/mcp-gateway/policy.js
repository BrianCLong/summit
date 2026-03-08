"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.PolicyEngine = void 0;
class PolicyEngine {
    async checkPolicy(context) {
        // In a real implementation, this would call OPA or check a database.
        // For now, we allow-list specific tools and deny others.
        if (!context.toolId && !context.resourceId) {
            return false; // Must request something
        }
        // Example allow-list logic
        const allowedTools = [
            'summit.github.create_issue',
            'summit.logs.read',
            'summit.echo'
        ];
        if (context.toolId) {
            if (allowedTools.includes(context.toolId)) {
                return true;
            }
            console.warn(`[MCP-Policy] Denied access to tool: ${context.toolId} for user: ${context.userId}`);
            return false;
        }
        // Default deny for resources for now
        if (context.resourceId) {
            console.warn(`[MCP-Policy] Denied access to resource: ${context.resourceId} for user: ${context.userId}`);
            return false;
        }
        return false;
    }
}
exports.PolicyEngine = PolicyEngine;

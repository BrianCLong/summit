"use strict";
/**
 * Policy Engine Gateway Adapter
 * Provides policy reasoner guardrail messages to the gateway
 * Auto-loaded by gateway from adapters/policy-engine/
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.gatewayPlugin = exports.PolicyEngineAdapter = void 0;
const POLICY_ENGINE_URL = process.env.POLICY_ENGINE_URL || 'http://localhost:4040';
// ============================================================================
// Gateway Adapter
// ============================================================================
class PolicyEngineAdapter {
    baseUrl;
    constructor(baseUrl = POLICY_ENGINE_URL) {
        this.baseUrl = baseUrl;
    }
    /**
     * Check policy guardrails before executing a query
     * Called by gateway for every GraphQL operation
     */
    async checkGuardrails(context) {
        try {
            const response = await fetch(`${this.baseUrl}/gateway/guardrail`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ queryPlan: context }),
            });
            if (!response.ok) {
                console.error(`[PolicyEngineAdapter] Guardrail check failed: ${response.status}`);
                // Fail open in case of policy engine errors (configurable)
                return { blocked: false, warnings: ['Policy check unavailable'] };
            }
            return await response.json();
        }
        catch (error) {
            console.error('[PolicyEngineAdapter] Error checking guardrails:', error);
            // Fail open - don't block if policy engine is down
            return { blocked: false, warnings: ['Policy engine unreachable'] };
        }
    }
    /**
     * Check license for a specific dataset operation
     */
    async checkLicense(datasetId, purpose, requesterId, operation) {
        try {
            const response = await fetch(`${this.baseUrl}/license/check`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    datasetId,
                    purpose,
                    requesterId,
                    operation,
                }),
            });
            if (!response.ok) {
                return {
                    allowed: false,
                    decision: 'License check service unavailable',
                };
            }
            return await response.json();
        }
        catch (error) {
            console.error('[PolicyEngineAdapter] Error checking license:', error);
            return {
                allowed: false,
                decision: 'License check failed due to service error',
            };
        }
    }
    /**
     * Format a blocked response for the gateway to return to the client
     */
    formatBlockedResponse(result) {
        return {
            errors: [
                {
                    message: result.message || 'Operation blocked by policy',
                    extensions: {
                        code: 'POLICY_VIOLATION',
                        policyViolation: true,
                        licenses: result.affectedLicenses,
                        overrideWorkflow: result.overrideWorkflow,
                    },
                },
            ],
        };
    }
    /**
     * Add policy warnings to response extensions
     */
    addWarningsToResponse(response, warnings) {
        return {
            ...response,
            extensions: {
                ...response.extensions,
                policyWarnings: warnings,
            },
        };
    }
}
exports.PolicyEngineAdapter = PolicyEngineAdapter;
// ============================================================================
// Gateway Plugin Export
// ============================================================================
/**
 * Gateway plugin interface
 * Auto-registered when gateway loads adapters
 */
exports.gatewayPlugin = {
    name: 'policy-engine',
    version: '1.0.0',
    /**
     * Called on every request before execution
     */
    async onRequest(context) {
        const adapter = new PolicyEngineAdapter();
        // Map GraphQL operation to policy context
        const queryContext = {
            queryId: `gql_${Date.now()}`,
            operation: mapOperationType(context.operation),
            targetDatasets: extractDatasets(context.operation, context.variables),
            purpose: context.variables?.purpose || 'investigation',
            requester: {
                userId: context.user?.id || 'anonymous',
                roles: context.user?.roles || [],
                authorityBindingId: context.user?.authorityBindingId,
            },
        };
        const result = await adapter.checkGuardrails(queryContext);
        if (result.blocked) {
            return {
                proceed: false,
                response: adapter.formatBlockedResponse(result),
            };
        }
        return { proceed: true };
    },
    /**
     * Called after execution to potentially modify response
     */
    async onResponse(context, response) {
        // Add any policy warnings to response
        if (context.policyWarnings?.length > 0) {
            const adapter = new PolicyEngineAdapter();
            return adapter.addWarningsToResponse(response, context.policyWarnings);
        }
        return response;
    },
};
// ============================================================================
// Helper Functions
// ============================================================================
function mapOperationType(operation) {
    const lowerOp = operation.toLowerCase();
    if (lowerOp.includes('export') || lowerOp.includes('download')) {
        return 'EXPORT';
    }
    if (lowerOp.includes('delete') || lowerOp.includes('remove')) {
        return 'DELETE';
    }
    if (lowerOp.includes('aggregate') || lowerOp.includes('count') || lowerOp.includes('sum')) {
        return 'AGGREGATE';
    }
    if (lowerOp.includes('join') || lowerOp.includes('merge')) {
        return 'JOIN';
    }
    return 'READ';
}
function extractDatasets(operation, variables) {
    const datasets = [];
    // Extract from common variable patterns
    if (variables?.datasetId) {
        datasets.push(variables.datasetId);
    }
    if (variables?.datasetIds) {
        datasets.push(...variables.datasetIds);
    }
    if (variables?.caseId) {
        datasets.push(`case:${variables.caseId}`);
    }
    // If no explicit datasets, infer from operation name
    if (datasets.length === 0) {
        const entityMatch = operation.match(/(\w+)(?:Query|Mutation)/);
        if (entityMatch) {
            datasets.push(`entity:${entityMatch[1].toLowerCase()}`);
        }
    }
    return datasets.length > 0 ? datasets : ['default'];
}
exports.default = PolicyEngineAdapter;

"use strict";
// @ts-nocheck
/**
 * Policy Enforcer
 * AGENT-3: Policy Compiler for Agents
 * Integrates with OPA (Open Policy Agent) to enforce agent-specific policies
 */
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.PolicyEnforcer = void 0;
const node_fetch_1 = __importDefault(require("node-fetch"));
class PolicyEnforcer {
    opaEndpoint;
    enableDryRun;
    constructor(opaEndpoint, enableDryRun = false) {
        this.opaEndpoint = opaEndpoint;
        this.enableDryRun = enableDryRun;
    }
    /**
     * Evaluate policy for an agent action
     * AGENT-3b: Implement agent-specific rules
     */
    async evaluate(input) {
        try {
            // Build OPA input
            const opaInput = this.buildOPAInput(input);
            // Call OPA
            const response = await (0, node_fetch_1.default)(`${this.opaEndpoint}/v1/data/summit/agent/decision`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ input: opaInput }),
            });
            if (!response.ok) {
                throw new Error(`OPA evaluation failed: ${response.statusText}`);
            }
            const result = await response.json();
            // Parse OPA result
            return this.parseOPAResult(result);
        }
        catch (error) {
            console.error('Policy evaluation error:', error);
            // In dry-run mode, allow by default
            if (this.enableDryRun) {
                return {
                    allowed: true,
                    reason: 'Policy evaluation failed, dry-run mode allows by default',
                    obligations: [],
                    matchedPolicies: [],
                };
            }
            // In production, deny by default on error (fail-safe)
            return {
                allowed: false,
                reason: `Policy evaluation error: ${error.message}`,
                obligations: [],
                matchedPolicies: [],
            };
        }
    }
    /**
     * Build OPA input structure
     * Maps our types to OPA's expected input format
     */
    buildOPAInput(input) {
        return {
            subject: {
                type: 'AGENT',
                id: input.agent.id,
                name: input.agent.name,
                agentType: input.agent.agentType,
                tenantScopes: input.agent.tenantScopes,
                projectScopes: input.agent.projectScopes,
                capabilities: input.agent.capabilities,
                restrictions: input.agent.restrictions,
                isCertified: input.agent.isCertified,
                certificationExpiresAt: input.agent.certificationExpiresAt?.toISOString(),
            },
            action: {
                type: input.action.actionType,
                target: input.action.actionTarget,
                riskLevel: input.action.riskLevel,
                riskFactors: input.action.riskFactors,
            },
            resource: {
                tenantId: input.tenantId,
                projectId: input.projectId,
            },
            context: {
                operationMode: input.operationMode,
                timestamp: new Date().toISOString(),
            },
        };
    }
    /**
     * Parse OPA result into our PolicyDecision format
     */
    parseOPAResult(result) {
        const decision = result.result || {};
        return {
            allowed: decision.allowed || false,
            reason: decision.reason || 'No reason provided',
            obligations: decision.obligations || [],
            matchedPolicies: decision.matched_policies || [],
        };
    }
    /**
     * Quick check if agent has a specific capability
     */
    hasCapability(agent, capability) {
        return agent.capabilities.includes(capability);
    }
    /**
     * Check if action is allowed based on agent restrictions
     */
    isActionAllowed(agent, actionType) {
        const restrictions = agent.restrictions;
        // Check denied operations
        if (restrictions.deniedOperations?.includes(actionType)) {
            return false;
        }
        // Check allowed operations (if specified)
        if (restrictions.allowedOperations && restrictions.allowedOperations.length > 0) {
            return restrictions.allowedOperations.includes(actionType);
        }
        return true;
    }
    /**
     * Check if risk level is within agent's allowed limit
     */
    isRiskLevelAllowed(agent, riskLevel) {
        const riskHierarchy = ['low', 'medium', 'high', 'critical'];
        const maxRiskIndex = riskHierarchy.indexOf(agent.restrictions.maxRiskLevel);
        const actionRiskIndex = riskHierarchy.indexOf(riskLevel);
        return actionRiskIndex <= maxRiskIndex;
    }
}
exports.PolicyEnforcer = PolicyEnforcer;

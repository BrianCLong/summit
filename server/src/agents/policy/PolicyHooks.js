"use strict";
/**
 * Agent Policy & Approval Hooks
 *
 * Integrates policy checks at agent intent time (pre-execution).
 * Enforces gated actions through approval workflows.
 * Provides post-execution policy evaluation for sanity checks and drift detection.
 *
 * Design: Intent → Policy → Approval (if needed) → Execution → Post-Check
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.policyHooks = exports.PolicyHooks = void 0;
const crypto_1 = require("crypto");
const database_js_1 = require("../../config/database.js");
const AgentAuditLogger_js_1 = require("../audit/AgentAuditLogger.js");
class AgentPolicyEngine {
    async evaluateAction(context) {
        // Simple policy evaluation - in production this would call OPA or a full policy engine
        const isHighRiskAction = context.action.type.includes('delete') ||
            context.action.type.includes('destroy') ||
            context.action.type.includes('drop');
        if (isHighRiskAction) {
            return {
                allowed: true,
                obligations: [{ type: 'approval_required', details: { reason: 'High-risk action' } }],
                reason: 'High-risk action requires approval',
            };
        }
        return {
            allowed: true,
            obligations: [],
            reason: 'Policy evaluation passed',
        };
    }
}
// ============================================================================
// Policy Hooks
// ============================================================================
class PolicyHooks {
    pool;
    policyEngine;
    constructor() {
        this.pool = (0, database_js_1.getPostgresPool)();
        this.policyEngine = new AgentPolicyEngine();
    }
    // ==========================================================================
    // Pre-Execution Policy Check
    // ==========================================================================
    async preExecutionCheck(context) {
        const startTime = Date.now();
        // Build OPA policy input
        const policyInput = {
            agent: {
                id: context.agent_id,
                version: context.agent_version,
                type: context.agent_type,
                status: context.agent_status,
            },
            action: {
                type: context.action_type,
                target: context.action_target,
                capability: context.capability,
            },
            context: {
                tenant_id: context.tenant_id,
                project_id: context.project_id,
                user_id: context.user_id,
                operation_mode: context.operation_mode,
            },
        };
        try {
            // Evaluate main action policy
            const decision = await this.policyEngine.evaluateAction({
                agent_id: context.agent_id,
                agent_name: context.agent_id,
                agent_type: context.agent_type,
                trust_level: 'basic', // Would be looked up from registry
                action: {
                    type: context.action_type,
                    target: context.action_target,
                    metadata: {},
                },
                user_clearance: 'basic',
                data_classification: 'internal',
                tenant_id: context.tenant_id,
                timestamp: new Date(),
            });
            const evaluationTime = Date.now() - startTime;
            // Map decision to result
            const allowed = decision.allowed;
            const decisionType = decision.allowed
                ? decision.obligations.length > 0
                    ? 'conditional'
                    : 'allow'
                : 'deny';
            // Determine if approval is required
            const requiresApproval = decision.obligations.some((o) => o.type === 'approval_required');
            // Determine risk level from decision
            const riskLevel = this.determineRiskLevel(context, decision);
            // Map obligations
            const obligations = decision.obligations.map((o) => ({
                type: o.type || 'audit_enhanced',
                details: o.details || {},
            }));
            // Determine approval class
            let approvalClass;
            if (requiresApproval) {
                if (riskLevel === 'critical') {
                    approvalClass = 'human_in_the_loop';
                }
                else if (riskLevel === 'high') {
                    approvalClass = 'gated';
                }
                else {
                    approvalClass = 'auto';
                }
            }
            return {
                allowed,
                decision: decisionType,
                reason: decision.reason || (allowed ? 'Policy evaluation passed' : 'Policy evaluation failed'),
                policy_path: 'agents/governance/action',
                evaluation_time_ms: evaluationTime,
                obligations,
                requires_approval: requiresApproval,
                approval_class: approvalClass,
                risk_level: riskLevel,
            };
        }
        catch (error) {
            const evaluationTime = Date.now() - startTime;
            // Fail-closed on policy evaluation error
            return {
                allowed: false,
                decision: 'deny',
                reason: `Policy evaluation error: ${error.message}`,
                policy_path: 'agents/governance/action',
                evaluation_time_ms: evaluationTime,
                obligations: [],
                requires_approval: false,
                risk_level: 'high',
            };
        }
    }
    // ==========================================================================
    // Approval Workflow
    // ==========================================================================
    async createApprovalRequest(request) {
        const approvalId = (0, crypto_1.randomUUID)();
        const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000); // 24 hours
        const query = `
      INSERT INTO agent_approvals (
        id, agent_id, run_id, action_id,
        request_summary, request_details, risk_level,
        assigned_to, assigned_roles, status, expires_at
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
      RETURNING id
    `;
        const values = [
            approvalId,
            request.agent_id,
            request.run_id,
            request.action_id || null,
            request.request_summary || 'Approval required',
            JSON.stringify(request.request_details || {}),
            request.risk_level || 'medium',
            request.assigned_to || [],
            request.assigned_roles || [],
            'pending',
            expiresAt,
        ];
        await this.pool.query(query, values);
        // Log lifecycle event
        await AgentAuditLogger_js_1.agentAuditLogger.logLifecycleEvent({
            agent_id: request.agent_id,
            event_type: 'approval_required',
            event_category: 'execution',
            event_severity: 'info',
            actor_id: 'system',
            actor_type: 'system',
            metadata: {
                approval_id: approvalId,
                risk_level: request.risk_level,
                approval_class: request.approval_class,
            },
        });
        return approvalId;
    }
    async checkApprovalStatus(approvalId) {
        const query = 'SELECT * FROM agent_approvals WHERE id = $1';
        const result = await this.pool.query(query, [approvalId]);
        if (result.rows.length === 0) {
            return null;
        }
        const row = result.rows[0];
        return {
            id: row.id,
            agent_id: row.agent_id,
            run_id: row.run_id,
            action_id: row.action_id,
            request_summary: row.request_summary,
            request_details: row.request_details,
            risk_level: row.risk_level,
            assigned_to: row.assigned_to,
            assigned_roles: row.assigned_roles,
            approval_class: 'gated', // Would be from record
            status: row.status,
            expires_at: row.expires_at,
            decision_made_by: row.decision_made_by,
            decision_made_at: row.decision_made_at,
            decision_reason: row.decision_reason,
        };
    }
    async approveRequest(approvalId, approvedBy, reason) {
        const query = `
      UPDATE agent_approvals
      SET status = 'approved',
          decision_made_by = $2,
          decision_made_at = NOW(),
          decision_reason = $3
      WHERE id = $1 AND status = 'pending'
      RETURNING agent_id
    `;
        const result = await this.pool.query(query, [approvalId, approvedBy, reason || null]);
        if (result.rows.length === 0) {
            return false;
        }
        // Log lifecycle event
        await AgentAuditLogger_js_1.agentAuditLogger.logLifecycleEvent({
            agent_id: result.rows[0].agent_id,
            event_type: 'approval_granted',
            event_category: 'execution',
            event_severity: 'info',
            actor_id: approvedBy,
            actor_type: 'user',
            metadata: {
                approval_id: approvalId,
                reason,
            },
        });
        return true;
    }
    async rejectRequest(approvalId, rejectedBy, reason) {
        const query = `
      UPDATE agent_approvals
      SET status = 'rejected',
          decision_made_by = $2,
          decision_made_at = NOW(),
          decision_reason = $3
      WHERE id = $1 AND status = 'pending'
      RETURNING agent_id
    `;
        const result = await this.pool.query(query, [approvalId, rejectedBy, reason]);
        if (result.rows.length === 0) {
            return false;
        }
        // Log lifecycle event
        await AgentAuditLogger_js_1.agentAuditLogger.logLifecycleEvent({
            agent_id: result.rows[0].agent_id,
            event_type: 'approval_rejected',
            event_category: 'execution',
            event_severity: 'warning',
            actor_id: rejectedBy,
            actor_type: 'user',
            metadata: {
                approval_id: approvalId,
                reason,
            },
        });
        return true;
    }
    async expireOldApprovals() {
        const query = `
      UPDATE agent_approvals
      SET status = 'expired'
      WHERE status = 'pending' AND expires_at < NOW()
      RETURNING id
    `;
        const result = await this.pool.query(query);
        return result.rows.length;
    }
    // ==========================================================================
    // Post-Execution Policy Check
    // ==========================================================================
    async postExecutionCheck(context) {
        const violations = [];
        const recommendations = [];
        // 1. Check for drift - did agent do what it said it would?
        // (In a real implementation, compare declared actions with executed actions)
        // 2. Check for policy violations during execution
        // (Evaluate if any actions violated policies post-facto)
        // 3. Check for anomalies
        // (Detect unusual patterns, resource usage, etc.)
        // For now, return a pass
        return {
            passed: true,
            violations,
            recommendations,
        };
    }
    // ==========================================================================
    // Policy Invariants
    // ==========================================================================
    async checkInvariants(context) {
        const violations = [];
        // 1. Check agent is in registry
        // 2. Check agent status is active
        // 3. Check agent has valid capabilities
        // 4. Check quotas not exceeded
        // 5. Check certification not expired
        return {
            valid: violations.length === 0,
            violations,
        };
    }
    // ==========================================================================
    // Helper Methods
    // ==========================================================================
    determineRiskLevel(context, decision) {
        // Determine risk based on action type and context
        if (context.action_type.includes('delete') || context.action_type.includes('destroy')) {
            return 'critical';
        }
        if (context.action_type.includes('write') || context.action_type.includes('modify')) {
            return 'high';
        }
        if (context.capability.includes('secret')) {
            return 'critical';
        }
        if (context.capability.includes('database')) {
            return 'high';
        }
        return 'low';
    }
}
exports.PolicyHooks = PolicyHooks;
// ============================================================================
// Singleton Export
// ============================================================================
exports.policyHooks = new PolicyHooks();

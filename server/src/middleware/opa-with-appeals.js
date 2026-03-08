"use strict";
/**
 * Enhanced OPA Middleware with Appeal System - GA Core Implementation
 *
 * Features:
 * - Policy-by-default denials with structured appeal paths
 * - Appeal SLA tracking and escalation
 * - Complete audit trail for policy decisions
 * - UI-friendly denial payloads with reason + appeal info
 * - Data Steward role integration
 */
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.opaWithAppeals = exports.OPAWithAppealsMiddleware = void 0;
const axios_1 = __importDefault(require("axios"));
const node_crypto_1 = require("node:crypto");
const logger_js_1 = __importDefault(require("../config/logger.js"));
const database_js_1 = require("../config/database.js");
const audit_js_1 = require("../utils/audit.js");
const log = logger_js_1.default.child({ name: 'OPAWithAppeals' });
// GA Core appeal configuration
const APPEAL_CONFIG = {
    defaultSlaHours: 24,
    escalationHours: 48,
    requiredRole: 'DATA_STEWARD',
    maxAppealRequests: 3,
};
class OPAWithAppealsMiddleware {
    opaUrl;
    policyCache = new Map();
    cacheTtl = 300000; // 5 minutes
    constructor(opaUrl = process.env.OPA_URL || 'http://localhost:8181') {
        this.opaUrl = opaUrl;
    }
    /**
     * Express middleware for OPA policy evaluation with appeals
     */
    middleware() {
        return async (req, res, next) => {
            try {
                const decision = await this.evaluatePolicy(req);
                if (decision.allowed) {
                    // Log successful authorization
                    await this.auditDecision(req, decision, 'ALLOWED');
                    return next();
                }
                // Policy denied - return structured response with appeal path
                await this.auditDecision(req, decision, 'DENIED');
                return res.status(403).json({
                    error: 'Access Denied',
                    code: 'POLICY_VIOLATION',
                    decision,
                    // Include appeal information in response
                    appeal: decision.appeal,
                });
            }
            catch (error) {
                log.error({ error: error.message, path: req.path }, 'OPA evaluation failed');
                // Fail secure - deny access on policy evaluation errors
                const failSecureDecision = {
                    allowed: false,
                    policy: 'system.fail_secure',
                    reason: 'Policy evaluation failed - access denied for security',
                    decisionId: (0, node_crypto_1.randomUUID)(),
                    timestamp: new Date().toISOString(),
                    appeal: this.createAppealPath('SYSTEM_ERROR'),
                };
                await this.auditDecision(req, failSecureDecision, 'ERROR');
                return res.status(503).json({
                    error: 'Policy Service Unavailable',
                    code: 'POLICY_SERVICE_ERROR',
                    decision: failSecureDecision,
                });
            }
        };
    }
    /**
     * GraphQL resolver wrapper for field-level authorization
     */
    wrapResolver(originalResolver, resourceType) {
        return async (parent, args, context, info) => {
            const policyInput = {
                user: context.user,
                action: `graphql.${info.operation.operation}`,
                resource: {
                    type: resourceType,
                    field: info.fieldName,
                    path: info.path,
                    args: args,
                },
                context: {
                    tenantId: context.user?.tenantId,
                    ip: context.req?.ip,
                    userAgent: context.req?.get('user-agent'),
                },
            };
            const decision = await this.evaluatePolicy(policyInput);
            if (!decision.allowed) {
                await this.auditDecision(policyInput, decision, 'DENIED');
                throw new Error(`Access denied: ${decision.reason}${decision.appeal?.available
                    ? ` (Appeal ID: ${decision.appeal.appealId})`
                    : ''}`);
            }
            await this.auditDecision(policyInput, decision, 'ALLOWED');
            return originalResolver(parent, args, context, info);
        };
    }
    /**
     * Evaluate policy with OPA and create appeal path if denied
     */
    async evaluatePolicy(input) {
        let policyInput;
        if ('method' in input) {
            // Express Request
            policyInput = this.buildPolicyInputFromRequest(input);
        }
        else {
            // Direct PolicyInput
            policyInput = input;
        }
        // Check cache first
        const cacheKey = this.getCacheKey(policyInput);
        const cached = this.policyCache.get(cacheKey);
        if (cached && cached.expires > Date.now()) {
            return cached.decision;
        }
        try {
            // Evaluate policy with OPA
            const response = await axios_1.default.post(`${this.opaUrl}/v1/data/intelgraph/allow`, {
                input: policyInput,
            }, { timeout: 5000 });
            const opaResult = response.data.result;
            const decision = {
                allowed: opaResult.allow || false,
                policy: opaResult.policy || 'unknown',
                reason: opaResult.reason || 'Access denied by policy',
                decisionId: (0, node_crypto_1.randomUUID)(),
                timestamp: new Date().toISOString(),
                ttl: this.cacheTtl,
                metadata: opaResult.metadata,
            };
            // Add appeal path if access is denied
            if (!decision.allowed) {
                decision.appeal = this.createAppealPath(opaResult.policy, policyInput, decision.decisionId);
            }
            // Cache the decision
            this.policyCache.set(cacheKey, {
                decision,
                expires: Date.now() + this.cacheTtl,
            });
            return decision;
        }
        catch (error) {
            log.error({ error: error.message, input: policyInput }, 'OPA request failed');
            throw error;
        }
    }
    /**
     * Create structured appeal path based on policy violation
     */
    createAppealPath(policy, policyInput, decisionId) {
        const appealId = (0, node_crypto_1.randomUUID)();
        // Determine if appeal is available based on policy type
        const appealable = !policy.includes('security.critical') &&
            !policy.includes('compliance.mandatory');
        if (!appealable) {
            return {
                available: false,
                requiredRole: APPEAL_CONFIG.requiredRole,
                slaHours: 0,
                escalationHours: 0,
                instructions: 'This policy violation cannot be appealed due to security or compliance requirements.',
                submitUrl: '',
            };
        }
        // Calculate SLA based on resource sensitivity
        let slaHours = APPEAL_CONFIG.defaultSlaHours;
        let escalationHours = APPEAL_CONFIG.escalationHours;
        if (policyInput?.resource.type === 'sensitive_data' ||
            policyInput?.context.investigationId) {
            slaHours = 12; // Faster SLA for sensitive resources
            escalationHours = 24;
        }
        return {
            available: true,
            appealId,
            requiredRole: APPEAL_CONFIG.requiredRole,
            slaHours,
            escalationHours,
            instructions: this.getAppealInstructions(policy),
            submitUrl: `/api/policy/appeals`,
            statusUrl: `/api/policy/appeals/${appealId}/status`,
        };
    }
    /**
     * Get contextual appeal instructions based on policy
     */
    getAppealInstructions(policy) {
        const instructions = {
            'data.access_denied': 'To appeal this data access denial, provide business justification and specify the minimum data needed.',
            'export.volume_exceeded': 'To appeal this export limit, justify the business need for the full dataset and confirm data handling procedures.',
            'query.complexity_exceeded': 'To appeal this query complexity limit, provide technical justification and confirm query optimization attempts.',
            'time.outside_hours': 'To appeal this time restriction, provide urgency justification and manager approval.',
            default: 'To appeal this policy decision, provide detailed business justification and specify the duration needed.',
        };
        return instructions[policy] || instructions.default;
    }
    /**
     * Submit appeal request
     */
    async submitAppeal(decisionId, userId, justification, businessNeed, urgency, requestedDuration) {
        const pool = (0, database_js_1.getPostgresPool)();
        const appealRequest = {
            id: (0, node_crypto_1.randomUUID)(),
            decisionId,
            userId,
            justification,
            businessNeed,
            urgency,
            requestedDuration,
            status: 'PENDING',
            createdAt: new Date(),
        };
        try {
            await pool.query(`
        INSERT INTO policy_appeals (
          id, decision_id, user_id, justification, business_need,
          urgency, requested_duration, status, created_at
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
      `, [
                appealRequest.id,
                appealRequest.decisionId,
                appealRequest.userId,
                appealRequest.justification,
                appealRequest.businessNeed,
                appealRequest.urgency,
                appealRequest.requestedDuration,
                appealRequest.status,
                appealRequest.createdAt,
            ]);
            // Create audit entry
            await (0, audit_js_1.writeAudit)({
                action: 'POLICY_APPEAL_SUBMITTED',
                userId: appealRequest.userId,
                resourceType: 'PolicyDecision',
                resourceId: appealRequest.decisionId,
                details: {
                    appealId: appealRequest.id,
                    urgency: appealRequest.urgency,
                    justification: appealRequest.justification.substring(0, 100),
                },
            });
            log.info({
                appealId: appealRequest.id,
                decisionId,
                userId,
                urgency,
            }, 'Policy appeal submitted');
            return appealRequest;
        }
        catch (error) {
            log.error({
                error: error.message,
                decisionId,
                userId,
            }, 'Failed to submit policy appeal');
            throw error;
        }
    }
    /**
     * Process appeal response (Data Steward action)
     */
    async processAppealResponse(appealId, responderId, approved, reason, grantedDuration) {
        const pool = (0, database_js_1.getPostgresPool)();
        try {
            const result = await pool.query(`
        UPDATE policy_appeals 
        SET status = $1, responded_at = NOW(), responded_by = $2, response_reason = $3
        WHERE id = $4
        RETURNING *
      `, [approved ? 'APPROVED' : 'DENIED', responderId, reason, appealId]);
            if (result.rows.length === 0) {
                throw new Error('Appeal not found');
            }
            const appeal = result.rows[0];
            // If approved, create temporary policy override
            if (approved) {
                await this.createPolicyOverride(appeal.decision_id, appeal.user_id, grantedDuration || '24 hours', responderId);
            }
            // Audit the response
            await (0, audit_js_1.writeAudit)({
                action: approved ? 'POLICY_APPEAL_APPROVED' : 'POLICY_APPEAL_DENIED',
                userId: responderId,
                resourceType: 'PolicyAppeal',
                resourceId: appealId,
                details: {
                    originalUserId: appeal.user_id,
                    decisionId: appeal.decision_id,
                    reason,
                    grantedDuration: approved ? grantedDuration : null,
                },
            });
            log.info({
                appealId,
                approved,
                responderId,
                originalUserId: appeal.user_id,
            }, 'Policy appeal processed');
            return {
                id: appeal.id,
                decisionId: appeal.decision_id,
                userId: appeal.user_id,
                justification: appeal.justification,
                businessNeed: appeal.business_need,
                urgency: appeal.urgency,
                requestedDuration: appeal.requested_duration,
                status: appeal.status,
                createdAt: appeal.created_at,
                respondedAt: appeal.responded_at,
                respondedBy: appeal.responded_by,
                responseReason: appeal.response_reason,
            };
        }
        catch (error) {
            log.error({
                error: error.message,
                appealId,
                responderId,
            }, 'Failed to process appeal response');
            throw error;
        }
    }
    async createPolicyOverride(decisionId, userId, duration, approvedBy) {
        const pool = (0, database_js_1.getPostgresPool)();
        const expiresAt = new Date();
        // Parse duration (simple implementation)
        const hours = parseInt(duration.match(/(\d+)\s*hour/i)?.[1] || '24');
        expiresAt.setHours(expiresAt.getHours() + hours);
        await pool.query(`
      INSERT INTO policy_overrides (
        id, decision_id, user_id, approved_by, expires_at, created_at
      ) VALUES ($1, $2, $3, $4, $5, NOW())
    `, [(0, node_crypto_1.randomUUID)(), decisionId, userId, approvedBy, expiresAt]);
        log.info({
            decisionId,
            userId,
            approvedBy,
            expiresAt,
        }, 'Policy override created');
    }
    buildPolicyInputFromRequest(req) {
        return {
            user: req.user,
            action: `http.${req.method.toLowerCase()}`,
            resource: {
                type: 'api_endpoint',
                path: req.path,
                method: req.method,
                params: req.params,
                query: req.query,
            },
            context: {
                tenantId: req.user?.tenantId,
                ip: req.ip,
                userAgent: req.get('user-agent'),
            },
        };
    }
    getCacheKey(input) {
        return JSON.stringify({
            user: input.user?.id,
            action: input.action,
            resource: input.resource,
            tenant: input.context.tenantId,
        });
    }
    async auditDecision(input, decision, outcome) {
        let userId;
        let resourceType;
        let resourceId;
        if ('method' in input) {
            userId = input.user?.id;
            resourceType = 'APIEndpoint';
            resourceId = input.path;
        }
        else {
            userId = input.user?.id;
            resourceType = input.resource.type;
            resourceId = input.resource.path || input.resource.field || 'unknown';
        }
        await (0, audit_js_1.writeAudit)({
            action: `POLICY_DECISION_${outcome}`,
            userId: userId || 'anonymous',
            resourceType,
            resourceId,
            details: {
                decisionId: decision.decisionId,
                policy: decision.policy,
                reason: decision.reason,
                appealAvailable: decision.appeal?.available,
                appealId: decision.appeal?.appealId,
            },
        });
    }
}
exports.OPAWithAppealsMiddleware = OPAWithAppealsMiddleware;
// Export singleton instance
exports.opaWithAppeals = new OPAWithAppealsMiddleware();

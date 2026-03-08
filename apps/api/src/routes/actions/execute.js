"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.createExecuteRouter = void 0;
const node_crypto_1 = __importDefault(require("node:crypto"));
const express_1 = require("express");
const correlation_js_1 = require("../../lib/correlation.js");
const hash_js_1 = require("../../lib/hash.js");
const security_js_1 = require("../../middleware/security.js");
const isExpired = (preflight) => {
    if (!preflight.expiresAt) {
        return false;
    }
    return new Date(preflight.expiresAt).getTime() <= Date.now();
};
const buildExecutionRecord = (correlationId) => ({
    executionId: `exec_${node_crypto_1.default.randomUUID()}`,
    correlationId,
    executedAt: new Date().toISOString(),
});
const createExecuteRouter = (store, events, policyService, rbacManager, auditSink) => {
    const router = (0, express_1.Router)();
    router.post('/execute', rbacManager ? (0, security_js_1.requirePermission)(rbacManager, 'actions:execute', 'invoke') : (_req, _res, next) => next(), async (req, res) => {
        const correlationId = (0, correlation_js_1.resolveCorrelationId)(req, res);
        const { preflight_id: preflightId, action, input } = req.body ?? {};
        if (!preflightId || typeof preflightId !== 'string') {
            return res.status(400).json({
                error: 'invalid_preflight_id',
                message: 'preflight_id is required',
                correlation_id: correlationId,
            });
        }
        if (typeof input === 'undefined') {
            return res.status(400).json({
                error: 'invalid_input',
                message: 'input payload is required',
                correlation_id: correlationId,
            });
        }
        const preflight = await store.getPreflight(preflightId);
        if (!preflight) {
            return res.status(404).json({
                error: 'preflight_not_found',
                correlation_id: correlationId,
            });
        }
        if (isExpired(preflight)) {
            return res.status(410).json({
                error: 'preflight_expired',
                correlation_id: correlationId,
            });
        }
        const expectedHash = preflight.inputHash;
        const candidateHash = (0, hash_js_1.hashExecutionInput)({
            action: action ?? preflight.action,
            input: input,
        });
        if (expectedHash !== candidateHash) {
            return res.status(400).json({
                error: 'preflight_hash_mismatch',
                correlation_id: correlationId,
            });
        }
        // CRITICAL SECURITY FIX (CN-002): Re-evaluate policy at execution time
        // This prevents time-of-check/time-of-use vulnerabilities
        if (policyService && preflight.request) {
            try {
                const currentDecision = await policyService.simulate(preflight.request);
                if (!currentDecision.allow) {
                    if (auditSink) {
                        await auditSink.securityAlert('Policy denied at execution time (TOCTOU prevention)', {
                            correlationId,
                            preflightId,
                            action: action ?? preflight.action,
                            reason: currentDecision.reason,
                            userId: req.user?.id,
                            tenantId: req.tenantId,
                        });
                    }
                    return res.status(403).json({
                        error: 'policy_denied_at_execution',
                        message: 'Policy decision changed since preflight; action denied',
                        reason: currentDecision.reason,
                        correlation_id: correlationId,
                    });
                }
                // Verify tenant isolation at execution time
                if (req.tenantId && preflight.request.subject?.tenantId !== req.tenantId) {
                    if (auditSink) {
                        await auditSink.securityAlert('Tenant isolation violation detected at execution', {
                            correlationId,
                            preflightId,
                            requestTenantId: preflight.request.subject?.tenantId,
                            activeTenantId: req.tenantId,
                            userId: req.user?.id,
                        });
                    }
                    return res.status(403).json({
                        error: 'tenant_isolation_violation',
                        message: 'Tenant context mismatch between preflight and execution',
                        correlation_id: correlationId,
                    });
                }
            }
            catch (error) {
                return res.status(502).json({
                    error: 'policy_reevaluation_failed',
                    message: error instanceof Error ? error.message : 'Unknown error',
                    correlation_id: correlationId,
                });
            }
        }
        const execution = buildExecutionRecord(correlationId);
        await store.recordExecution(preflightId, execution);
        if (auditSink) {
            await auditSink.recordEvent({
                eventType: 'task_complete',
                level: 'info',
                correlationId,
                action: action ?? preflight.action,
                message: `Action executed: ${action ?? preflight.action}`,
                details: { preflightId, executionId: execution.executionId },
                userId: req.user?.id,
                tenantId: req.tenantId ?? 'unknown',
            });
        }
        events.publish({
            type: 'action.executed',
            preflightId,
            correlationId,
            action: action ?? preflight.action,
            payload: input,
        });
        return res.status(200).json({
            status: 'accepted',
            execution_id: execution.executionId,
            correlation_id: correlationId,
        });
    });
    return router;
};
exports.createExecuteRouter = createExecuteRouter;

"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.highRiskApprovalMiddleware = void 0;
exports.createHighRiskApprovalMiddleware = createHighRiskApprovalMiddleware;
const appendOnlyAuditStore_js_1 = require("../audit/appendOnlyAuditStore.js");
const crypto_1 = require("crypto");
const defaultAuditStore = new appendOnlyAuditStore_js_1.AppendOnlyAuditStore();
const DEFAULT_ROUTES = ['/api/exports', '/api/analytics/export'];
function matches(req, routes) {
    const path = `${req.baseUrl || ''}${req.path}`;
    return routes.some((prefix) => path.startsWith(prefix));
}
function createHighRiskApprovalMiddleware(options = {}) {
    const routes = options.routes ?? DEFAULT_ROUTES;
    const auditStore = options.auditStore ?? defaultAuditStore;
    const action = options.action ?? 'high_risk_action';
    return async function highRiskApproval(req, res, next) {
        if (!matches(req, routes))
            return next();
        const stepUpToken = req.headers['x-step-up-token'];
        const approvalToken = req.headers['x-approval-token'];
        if (!stepUpToken && !approvalToken) {
            await auditStore.append({
                version: 'audit_event_v1',
                actor: {
                    type: 'user',
                    id: req.user?.id || req.user?.sub,
                },
                action,
                resource: {
                    type: req.method,
                    name: req.path,
                    owner: req.tenantId ||
                        req.tenant_id ||
                        req.headers['x-tenant-id'] ||
                        'unknown',
                },
                classification: 'restricted',
                policy_version: process.env.OPA_POLICY_VERSION || '1.0',
                decision_id: (0, crypto_1.randomUUID)(),
                trace_id: req.traceId || (0, crypto_1.randomUUID)(),
                timestamp: new Date().toISOString(),
                customer: req.tenantId ||
                    req.tenant_id ||
                    req.headers['x-tenant-id'] ||
                    'unknown',
                metadata: {
                    decision: 'deny',
                    reason: 'approval_required',
                },
            });
            return res.status(403).json({
                code: 'APPROVAL_REQUIRED',
                requiresApproval: true,
                requiresStepUp: true,
                message: 'This high-risk action requires step-up authentication or an approval token.',
            });
        }
        await auditStore.append({
            version: 'audit_event_v1',
            actor: {
                type: 'user',
                id: req.user?.id || req.user?.sub,
            },
            action,
            resource: {
                type: req.method,
                name: req.path,
                owner: req.tenantId ||
                    req.tenant_id ||
                    req.headers['x-tenant-id'] ||
                    'unknown',
            },
            classification: 'restricted',
            policy_version: process.env.OPA_POLICY_VERSION || '1.0',
            decision_id: (0, crypto_1.randomUUID)(),
            trace_id: req.traceId || (0, crypto_1.randomUUID)(),
            timestamp: new Date().toISOString(),
            customer: req.tenantId ||
                req.tenant_id ||
                req.headers['x-tenant-id'] ||
                'unknown',
            metadata: {
                decision: 'allow',
                stepUpToken: stepUpToken ? 'present' : 'missing',
                approvalToken: approvalToken ? 'present' : 'missing',
            },
        });
        return next();
    };
}
exports.highRiskApprovalMiddleware = createHighRiskApprovalMiddleware();

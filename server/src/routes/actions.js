"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.actionsRouter = void 0;
const express_1 = __importDefault(require("express"));
const auth_js_1 = require("../middleware/auth.js");
const ActionPolicyService_js_1 = require("../services/ActionPolicyService.js");
const router = express_1.default.Router();
const actionPolicyService = new ActionPolicyService_js_1.ActionPolicyService();
router.use(express_1.default.json());
const buildRequest = (req) => {
    const user = req.user || {};
    const action = String(req.body.action || '').toUpperCase();
    const policyVersion = req.body.policyVersion || req.body.context?.policyVersion;
    return {
        action,
        actor: {
            id: user.sub || user.id || 'anonymous',
            role: user.role,
            tenantId: user.tenantId || user.tenant_id,
        },
        resource: req.body.resource,
        payload: req.body.payload,
        approvers: Array.isArray(req.body.approvers)
            ? req.body.approvers.map((id) => String(id))
            : undefined,
        context: { ...(req.body.context || {}), policyVersion },
    };
};
router.post('/preflight', auth_js_1.ensureAuthenticated, async (req, res, next) => {
    try {
        const request = buildRequest(req);
        if (!request.action) {
            return res.status(400).json({ error: 'action is required' });
        }
        const result = await actionPolicyService.preflight(request, {
            correlationId: req.correlationId,
            ip: req.ip,
            userAgent: req.get('user-agent') || undefined,
        });
        return res.status(result.decision.allow ? 200 : 403).json({
            preflight_id: result.preflightId,
            decision: result.decision,
            request_hash: result.requestHash,
            correlation_id: req.correlationId,
        });
    }
    catch (error) {
        next(error);
    }
});
router.post('/execute', auth_js_1.ensureAuthenticated, async (req, res, next) => {
    try {
        const preflightId = req.body.preflight_id;
        if (!preflightId) {
            return res
                .status(428)
                .json({ error: 'preflight_id is required to execute this action' });
        }
        const request = buildRequest(req);
        if (!request.action) {
            return res.status(400).json({ error: 'action is required' });
        }
        const validation = await actionPolicyService.validateExecution(preflightId, request);
        switch (validation.status) {
            case 'missing':
                return res.status(404).json({ error: 'preflight decision not found' });
            case 'expired':
                return res.status(410).json({
                    error: 'preflight decision expired',
                    expires_at: validation.expiresAt,
                });
            case 'hash_mismatch':
                return res.status(409).json({
                    error: 'request does not match preflight hash',
                    expected: validation.expected,
                    actual: validation.actual,
                });
            case 'blocked':
                return res.status(403).json({
                    error: validation.reason || 'policy obligations not met',
                    obligation: validation.obligation,
                });
            case 'ok':
                return res.status(200).json({
                    ok: true,
                    correlation_id: req.correlationId,
                    request_hash: validation.requestHash,
                    decision: validation.decision,
                });
            default:
                return res.status(500).json({ error: 'unknown preflight validation state' });
        }
    }
    catch (error) {
        next(error);
    }
});
router.get('/hash', auth_js_1.ensureAuthenticated, (req, res) => {
    const request = buildRequest(req);
    return res.json({ request_hash: (0, ActionPolicyService_js_1.calculateRequestHash)(request) });
});
exports.actionsRouter = router;

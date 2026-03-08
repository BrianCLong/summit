"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.buildSecureRouter = void 0;
const express_1 = require("express");
const metrics_js_1 = require("../observability/metrics.js");
const parseAmount = (value) => {
    const parsed = Number(value);
    if (Number.isNaN(parsed) || parsed < 0)
        return undefined;
    return parsed;
};
const buildSecureRouter = (policyEvaluator) => {
    const router = (0, express_1.Router)();
    router.post('/payments/:id/approve', async (req, res) => {
        const amount = parseAmount(req.body?.amount);
        if (amount === undefined) {
            metrics_js_1.httpRequestErrors.inc({ method: req.method, route: req.route.path, status: 400 });
            return res.status(400).json({ message: 'invalid_amount' });
        }
        const userId = req.header('x-user-id');
        if (!userId) {
            metrics_js_1.httpRequestErrors.inc({ method: req.method, route: req.route.path, status: 401 });
            return res.status(401).json({ message: 'missing_user' });
        }
        const user = { id: userId, roles: req.header('x-user-roles')?.split(',').map((r) => r.trim()).filter(Boolean) };
        const action = { verb: 'approve', resourceType: 'payment', amount, requires_step_up: true };
        const resource = { id: req.params.id, tenant: req.header('x-tenant') };
        const context = { ip: req.ip, userAgent: req.header('user-agent') };
        const decision = await policyEvaluator(user, resource, action, context);
        if (!decision.allow) {
            metrics_js_1.httpRequestErrors.inc({ method: req.method, route: req.route.path, status: 403 });
            return res.status(403).json({ message: 'forbidden', reason: decision.reason, stepUpRequired: decision.stepUpRequired });
        }
        if (decision.stepUpRequired) {
            const assertion = req.header('x-step-up-token');
            if (!assertion) {
                metrics_js_1.httpRequestErrors.inc({ method: req.method, route: req.route.path, status: 401 });
                return res.status(401).json({ message: 'step-up-required', reason: 'missing_assertion' });
            }
        }
        metrics_js_1.httpRequestTotal.inc({ method: req.method, route: req.route.path, status: 200 });
        return res.status(200).json({ status: 'approved', trace: decision.reason || 'policy_allow' });
    });
    return router;
};
exports.buildSecureRouter = buildSecureRouter;

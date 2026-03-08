"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.customerReadGuard = customerReadGuard;
const opa_client_1 = require("./opa-client");
async function customerReadGuard(req, res, next) {
    if (!req.subject) {
        return res.status(401).json({ error: "unauthenticated" });
    }
    const resource = {
        type: "customer",
        id: req.params.id,
        tenant_id: req.params.tenantId ?? req.subject.tenant_id,
        region: req.params.region ?? req.header("x-resource-region") ?? "us",
    };
    const input = {
        subject: req.subject,
        resource,
        action: "customer:read",
    };
    try {
        const decision = await (0, opa_client_1.evaluateCustomerRead)(input);
        req.log?.info?.({
            subject_id: req.subject.id,
            resource,
            action: input.action,
            decision: decision.allow,
            reason: decision.reason,
        }, "authz_decision");
        if (!decision.allow) {
            return res.status(403).json({
                error: "forbidden",
                reason: decision.reason ?? "policy_denied",
            });
        }
        return next();
    }
    catch (err) {
        req.log?.error?.({ err }, "authz_error");
        return res.status(503).json({ error: "authorization_unavailable" });
    }
}

"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.authzMiddleware = authzMiddleware;
const crypto_1 = require("crypto");
const logger_1 = require("../logger");
const DEFAULT_DECISION_URL = process.env.OPA_DECISION_URL ||
    "http://localhost:8181/v1/data/policy/authz/abac/decision";
const redacted = (value) => value ? (0, crypto_1.createHash)("sha256").update(value).digest("hex").slice(0, 8) : undefined;
function buildInput(req) {
    const roles = req.headers["x-roles"]?.split(",") || [];
    const tenantHeader = req.headers["x-tenant"] ||
        req.headers["x-tenant-id"] ||
        "unknown";
    const classification = req.headers["x-resource-classification"] || "internal";
    const reason = req.headers["x-reason"] ||
        (typeof req.body?.reason === "string" ? req.body.reason : undefined);
    return {
        subject: {
            id: req.headers["x-subject-id"] || "anonymous",
            roles,
            tenant: tenantHeader,
            clearance: req.headers["x-clearance"] || "internal",
            mfa: req.headers["x-mfa"] || "unknown",
        },
        resource: {
            type: req.headers["x-resource-type"]?.toString() || req.path,
            id: req.headers["x-resource-id"]?.toString() || "na",
            tenant: tenantHeader,
            classification,
        },
        action: req.headers["x-action"] || `${req.method.toLowerCase()}:${req.path}`,
        context: {
            env: req.headers["x-env"] || "dev",
            request_ip: req.ip || 'unknown',
            time: new Date().toISOString(),
            reason,
            risk: req.headers["x-risk"] || "low",
            warrant_id: req.headers["x-warrant-id"] || undefined,
        },
    };
}
async function authzMiddleware(req, res, next) {
    if (req.path === "/healthz")
        return next();
    const traceId = req.headers["x-trace-id"] || (0, crypto_1.randomUUID)();
    res.setHeader("x-trace-id", traceId);
    const input = buildInput(req);
    try {
        const response = await fetch(DEFAULT_DECISION_URL, {
            method: "POST",
            headers: { "content-type": "application/json" },
            body: JSON.stringify({ input }),
        });
        if (!response.ok) {
            logger_1.logger.warn("OPA decision endpoint returned non-200", {
                status: response.status,
                traceId,
            });
            return res.status(503).json({ error: "authz_unavailable", traceId });
        }
        const body = (await response.json());
        const decision = body.result;
        if (!decision) {
            return res.status(503).json({ error: "authz_unavailable", traceId });
        }
        const denyReasons = Array.isArray(decision.deny) ? decision.deny : [];
        logger_1.logger.info("authz_decision", {
            traceId,
            subject: redacted(input.subject.id),
            roles: input.subject.roles,
            action: input.action,
            tenant: input.resource.tenant,
            decision: decision.allow ? "allow" : "deny",
            deny_reasons: denyReasons,
        });
        if (!decision.allow) {
            if (decision.obligations?.step_up_auth) {
                res.setHeader("x-step-up-required", "true");
            }
            if (denyReasons.length > 0) {
                res.setHeader("x-deny-reason", denyReasons.join(","));
            }
            return res
                .status(403)
                .json({ error: "forbidden", reasons: denyReasons, traceId });
        }
        return next();
    }
    catch (error) {
        logger_1.logger.error("authz_middleware_failure", error, { traceId });
        return res.status(503).json({ error: "authz_unavailable", traceId });
    }
}

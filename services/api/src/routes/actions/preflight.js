"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.actionsPreflightRouter = void 0;
exports.mapRedactions = mapRedactions;
exports.createActionsPreflightRouter = createActionsPreflightRouter;
const node_crypto_1 = require("node:crypto");
const express_1 = require("express");
const jsonwebtoken_1 = __importDefault(require("jsonwebtoken"));
const postgres_js_1 = require("../../db/postgres.js");
const auth_js_1 = require("../../middleware/auth.js");
const logger_js_1 = require("../../utils/logger.js");
function getAuthzUrl() {
    return (process.env.AUTHZ_GATEWAY_URL || 'http://localhost:4000')
        .replace(/\/$/, '')
        .concat('/authorize');
}
function buildServiceToken(scopes) {
    const secret = process.env.SERVICE_AUTH_SHARED_SECRET || 'dev-service-shared-secret';
    const audience = process.env.SERVICE_AUTH_AUDIENCE || 'authz-gateway';
    const issuer = process.env.SERVICE_AUTH_ISSUER || 'summit-service-issuer';
    const serviceId = process.env.SERVICE_AUTH_SERVICE_ID || 'api';
    const keyId = process.env.SERVICE_AUTH_KEY_ID || 'v1-dev';
    return jsonwebtoken_1.default.sign({ scp: scopes }, secret, {
        algorithm: 'HS256',
        audience,
        issuer,
        subject: serviceId,
        keyid: keyId,
        expiresIn: 5 * 60,
    });
}
function mapRedactions(obligations) {
    const out = new Set();
    for (const obl of obligations) {
        if (obl.type === 'redact' && typeof obl.target === 'string') {
            out.add(obl.target);
        }
        if (obl.type === 'redact_fields' &&
            Array.isArray(obl.fields) &&
            obl.fields.length > 0) {
            for (const f of obl.fields) {
                if (typeof f === 'string')
                    out.add(f);
            }
        }
    }
    return Array.from(out);
}
async function simulateWithGateway(body, user) {
    const token = buildServiceToken(['abac:decide']);
    const url = getAuthzUrl();
    const payload = {
        subject: {
            id: user?.id,
            tenantId: user?.tenantId,
            roles: user?.role ? [user.role] : [],
            entitlements: Array.isArray(user?.permissions) ? user.permissions : [],
            residency: user?.residency || user?.tenantId || 'unknown',
            clearance: user?.role || 'analyst',
            loa: body.context?.acr || 'loa1',
            riskScore: 0,
            groups: [],
            metadata: {},
        },
        resource: {
            id: body.resource?.id || 'inline',
            tenantId: body.resource?.tenantId || user?.tenantId,
            classification: body.resource?.classification || 'public',
            residency: body.resource?.residency || user?.residency || 'unknown',
            tags: body.resource?.tags || [],
        },
        action: body.action,
        context: {
            requestTime: new Date().toISOString(),
            currentAcr: body.context?.acr || 'loa1',
            purpose: body.context?.purpose,
            environment: body.context?.environment,
        },
    };
    try {
        const res = await fetch(url, {
            method: 'POST',
            headers: {
                'content-type': 'application/json',
                'x-service-token': token,
            },
            body: JSON.stringify(payload),
        });
        if (!res.ok) {
            return {
                allow: false,
                reason: `gateway_error_${res.status}`,
                obligations: [],
                redactions: [],
            };
        }
        const data = await res.json();
        const obligations = Array.isArray(data?.obligations)
            ? data.obligations
            : [];
        const allow = Boolean(data?.allow);
        const reason = typeof data?.reason === 'string'
            ? data.reason
            : allow
                ? 'allow'
                : 'deny';
        return {
            allow,
            reason,
            obligations,
            redactions: mapRedactions(obligations),
        };
    }
    catch (error) {
        logger_js_1.logger.warn({
            error: error instanceof Error ? error.message : String(error),
        }, 'authz_gateway_simulation_failed');
        return {
            allow: false,
            reason: 'gateway_unreachable',
            obligations: [],
            redactions: [],
        };
    }
}
async function persistDecision(decision, body, user) {
    const id = (0, node_crypto_1.randomUUID)();
    try {
        await postgres_js_1.postgresPool.insert('policy_decisions', {
            id,
            subject_id: user?.id,
            tenant_id: user?.tenantId,
            action: body.action,
            resource_id: body.resource?.id || null,
            allowed: decision.allow,
            reason: decision.reason,
            obligations: JSON.stringify(decision.obligations || []),
            redactions: JSON.stringify(decision.redactions || []),
            created_at: new Date(),
        });
    }
    catch (error) {
        logger_js_1.logger.warn({
            error: error instanceof Error ? error.message : String(error),
            decision_id: id,
        }, 'failed_to_persist_policy_decision');
    }
    return id;
}
function createActionsPreflightRouter() {
    const router = (0, express_1.Router)();
    router.post('/preflight', auth_js_1.authMiddleware, (0, auth_js_1.requirePermission)('entity:read'), async (req, res) => {
        const body = req.body;
        if (!body?.action) {
            return res
                .status(400)
                .json({ ok: false, error: 'action_required', decision: null });
        }
        const user = req.user;
        const decision = await simulateWithGateway(body, user);
        const decisionId = await persistDecision(decision, body, user);
        const response = {
            ...decision,
            decisionId,
        };
        return res.json({ ok: true, decision: response });
    });
    return router;
}
exports.actionsPreflightRouter = createActionsPreflightRouter();

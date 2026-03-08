"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.createPolicyMiddleware = createPolicyMiddleware;
const policy_1 = require("../policy");
const config_1 = require("../config");
const audit_1 = require("../audit");
function defaultInputBuilder(req, action) {
    const user = req.user;
    const roles = user?.roles || [];
    const tenantId = String(user?.tenantId || req.headers['x-tenant-id'] || '');
    const purpose = String(req.headers['x-purpose'] || '');
    const authority = String(req.headers['x-authority'] || '');
    return {
        user: {
            sub: String(user?.sub || ''),
            tenantId,
            roles,
            ...user,
        },
        resource: {
            path: req.originalUrl,
            tenantId: String(req.headers['x-tenant-id'] || ''),
            attributes: {
                needToKnow: req.headers['x-needtoknow'] || undefined,
            },
        },
        action,
        purpose,
        authority,
    };
}
function createPolicyMiddleware(options) {
    return async (req, res, next) => {
        if (!config_1.features.policyReasoner) {
            return next();
        }
        const input = options.buildInput
            ? options.buildInput(req)
            : defaultInputBuilder(req, options.action);
        const decision = await (0, policy_1.authorize)(input);
        const audit = (0, audit_1.log)({
            subject: String(input.user.sub || 'anonymous'),
            action: options.action,
            resource: JSON.stringify(input.resource),
            tenantId: String(input.user.tenantId || ''),
            decision,
            purpose: input.purpose,
            authority: input.authority,
        });
        res.setHeader('X-Audit-Id', audit.id);
        if (!decision.allowed) {
            return res.status(403).json({
                error: 'forbidden',
                reason: decision.reason,
                policy: decision.policyId,
                appealLink: decision.appealLink,
                appealToken: decision.appealToken,
            });
        }
        req.policyDecision = decision;
        return next();
    };
}

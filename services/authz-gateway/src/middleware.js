"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.requireAuth = requireAuth;
const pino_1 = __importDefault(require("pino"));
const policy_1 = require("./policy");
const audit_1 = require("./audit");
const session_1 = require("./session");
const break_glass_1 = require("./break-glass");
const decision_record_1 = require("./decision-record");
async function buildResource(attributeService, req, subject, headerName) {
    const resourceIdHeader = headerName ?? 'x-resource-id';
    const resourceId = req.headers[resourceIdHeader];
    if (typeof resourceId === 'string' && resourceId.length > 0) {
        return attributeService.getResourceAttributes(resourceId);
    }
    const tenantId = String(req.headers['x-tenant-id'] || subject.tenantId);
    const residency = String(req.headers['x-resource-residency'] || subject.residency);
    const classification = String(req.headers['x-resource-classification'] || subject.clearance);
    const tagsHeader = req.headers['x-resource-tags'];
    const tags = typeof tagsHeader === 'string'
        ? tagsHeader
            .split(',')
            .map((tag) => tag.trim())
            .filter(Boolean)
        : [];
    return {
        id: req.path,
        tenantId,
        residency,
        classification,
        tags,
    };
}
const logger = (0, pino_1.default)({ name: 'authz-require-auth' });
function requireAuth(attributeService, options) {
    return async (req, res, next) => {
        const auth = req.headers.authorization;
        if (!auth) {
            return res.status(401).json({ error: 'missing_token' });
        }
        try {
            const token = auth.replace('Bearer ', '');
            const { payload } = await session_1.sessionManager.validate(token, { consume: true });
            if (options.requiredAcr && payload.acr !== options.requiredAcr) {
                return res
                    .status(401)
                    .set('WWW-Authenticate', `acr=${options.requiredAcr}`)
                    .json({ error: 'step_up_required' });
            }
            const subject = await attributeService.getSubjectAttributes(String(payload.sub || ''));
            const resource = await buildResource(attributeService, req, subject, options.resourceIdHeader);
            if (!options.skipAuthorization) {
                const input = {
                    subject,
                    resource,
                    action: options.action,
                    context: attributeService.getDecisionContext(String(payload.acr || 'loa1'), payload.breakGlass
                        ? {
                            breakGlass: payload.breakGlass,
                        }
                        : {}),
                };
                const decision = await (0, policy_1.authorize)(input);
                const enrichedDecision = (0, decision_record_1.enrichDecision)(decision, input);
                await (0, audit_1.log)({
                    subject: String(payload.sub || ''),
                    action: options.action,
                    resource: JSON.stringify(resource),
                    tenantId: subject.tenantId,
                    allowed: enrichedDecision.allowed,
                    reason: enrichedDecision.reason,
                    decisionId: enrichedDecision.decisionId,
                    policyVersion: enrichedDecision.policyVersion,
                    inputsHash: enrichedDecision.inputsHash,
                    breakGlass: payload.breakGlass,
                });
                if (payload.breakGlass) {
                    break_glass_1.breakGlassManager.recordUsage(String(payload.sid || ''), {
                        action: options.action,
                        resource: resource.id,
                        tenantId: subject.tenantId,
                        allowed: enrichedDecision.allowed,
                    });
                }
                if (!enrichedDecision.allowed) {
                    if (enrichedDecision.obligations.length > 0) {
                        req.obligations = enrichedDecision.obligations;
                        return res
                            .status(401)
                            .set('WWW-Authenticate', 'acr=loa2 step-up=webauthn')
                            .json({
                            error: 'step_up_required',
                            obligations: enrichedDecision.obligations,
                            reason: enrichedDecision.reason,
                        });
                    }
                    return res
                        .status(403)
                        .json({ error: 'forbidden', reason: enrichedDecision.reason });
                }
                req.obligations = enrichedDecision.obligations;
            }
            req.user = payload;
            req.subjectAttributes = subject;
            req.resourceAttributes = resource;
            res.locals.tenantId = subject.tenantId;
            res.locals.resourceId = resource.id;
            res.locals.action = options.action;
            return next();
        }
        catch (error) {
            const message = error.message;
            if (message === 'session_expired') {
                return res.status(401).json({ error: 'session_expired' });
            }
            if (message === 'session_not_found') {
                return res.status(401).json({ error: 'invalid_session' });
            }
            if (process.env.NODE_ENV !== 'test') {
                logger.error({ err: error }, 'Authorization error');
            }
            return res.status(401).json({ error: 'invalid_token' });
        }
    };
}

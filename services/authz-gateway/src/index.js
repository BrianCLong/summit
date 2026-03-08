"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.createApp = createApp;
const express_1 = __importDefault(require("express"));
const http_proxy_middleware_1 = require("http-proxy-middleware");
const pino_1 = __importDefault(require("pino"));
const pino_http_1 = __importDefault(require("pino-http"));
const keys_1 = require("./keys");
const auth_1 = require("./auth");
const middleware_1 = require("./middleware");
const observability_1 = require("./observability");
const attribute_service_1 = require("./attribute-service");
const stepup_1 = require("./stepup");
const policy_1 = require("./policy");
const session_1 = require("./session");
const service_auth_1 = require("./service-auth");
const break_glass_1 = require("./break-glass");
const slo_1 = require("./slo");
const incidents_1 = require("./incidents");
const standards_1 = require("./standards");
const abac_local_evaluator_1 = require("./abac-local-evaluator");
const audit_1 = require("./audit");
async function createApp() {
    await (0, keys_1.initKeys)();
    await (0, observability_1.startObservability)();
    const attributeService = new attribute_service_1.AttributeService();
    const stepUpManager = new stepup_1.StepUpManager();
    const abacEvaluator = new abac_local_evaluator_1.AbacLocalEvaluator();
    const trustedServices = (process.env.SERVICE_AUTH_CALLERS || 'api-gateway,maestro')
        .split(',')
        .map((v) => v.trim())
        .filter(Boolean);
    const app = (0, express_1.default)();
    app.use(observability_1.tracingContextMiddleware);
    app.use((0, pino_http_1.default)());
    app.use(express_1.default.json());
    app.use(observability_1.requestMetricsMiddleware);
    app.use(slo_1.sloMiddleware);
    app.get('/metrics', observability_1.metricsHandler);
    app.get('/slo/:tenantId', (0, service_auth_1.requireServiceAuth)({
        audience: 'authz-gateway',
        allowedServices: trustedServices,
        requiredScopes: ['slo:read'],
    }), (req, res) => {
        const tenantId = String(req.params.tenantId || 'fleet');
        const route = req.query.route || 'fleet';
        const snapshot = slo_1.sloTracker.snapshot(tenantId, route);
        res.json(snapshot);
    });
    app.post('/incidents/evidence', (0, service_auth_1.requireServiceAuth)({
        audience: 'authz-gateway',
        allowedServices: trustedServices,
        requiredScopes: ['incident:evidence'],
    }), async (req, res) => {
        const evidence = await (0, incidents_1.generateIncidentEvidence)(req);
        res.json(evidence);
    });
    app.get('/standards/hooks', (0, service_auth_1.requireServiceAuth)({
        audience: 'authz-gateway',
        allowedServices: trustedServices,
        requiredScopes: ['standards:read'],
    }), (_req, res) => {
        res.json((0, standards_1.buildStandardHooks)());
    });
    app.get('/policy/bundle', (0, service_auth_1.requireServiceAuth)({
        audience: 'authz-gateway',
        allowedServices: trustedServices,
        requiredScopes: ['policy:export'],
    }), (_req, res) => {
        res.json((0, standards_1.buildPolicyBundle)());
    });
    app.post('/abac/demo/enforce', async (req, res) => {
        try {
            const subjectId = String(req.body?.subjectId || '');
            const action = String(req.body?.action || '').trim();
            if (!subjectId || !action) {
                return res.status(400).json({ error: 'subject_and_action_required' });
            }
            const subject = await attributeService.getSubjectAttributes(subjectId);
            const resource = {
                id: String(req.body?.resource?.id || 'inline'),
                tenantId: req.body?.resource?.tenantId || subject.tenantId,
                residency: req.body?.resource?.residency || subject.residency,
                classification: req.body?.resource?.classification || subject.clearance,
                owner: req.body?.resource?.owner || subject.org,
                customer_id: req.body?.resource?.customer_id,
                tags: req.body?.resource?.tags || [],
            };
            const input = {
                subject,
                resource,
                action,
                context: attributeService.getDecisionContext(String(req.body?.context?.currentAcr || subject.loa || 'loa1')),
            };
            const evaluation = abacEvaluator.evaluate(input);
            await (0, audit_1.log)({
                subject: subject.id,
                action,
                resource: JSON.stringify(resource),
                tenantId: subject.tenantId,
                allowed: evaluation.decision.allowed,
                reason: evaluation.decision.reason,
                decisionId: evaluation.decision.decisionId,
                policyVersion: evaluation.decision.policyVersion,
                inputsHash: evaluation.decision.inputsHash,
            });
            const status = evaluation.decision.allowed ? 200 : 403;
            res.status(status).json({
                policyVersion: evaluation.version,
                ...evaluation.decision,
            });
        }
        catch (error) {
            res.status(400).json({ error: error.message });
        }
    });
    app.post('/auth/login', async (req, res) => {
        try {
            const { username, password } = req.body;
            const token = await (0, auth_1.login)(username, password);
            res.json({ token });
        }
        catch {
            res.status(401).json({ error: 'invalid_credentials' });
        }
    });
    app.get('/.well-known/jwks.json', (_req, res) => {
        res.json({ keys: [(0, keys_1.getPublicJwk)()] });
    });
    app.post('/auth/oidc/callback', async (req, res) => {
        const { idToken } = req.body || {};
        if (!idToken) {
            return res.status(400).json({ error: 'id_token_required' });
        }
        try {
            const token = await (0, auth_1.oidcLogin)(idToken);
            res.json({ token });
        }
        catch (error) {
            res.status(401).json({ error: error.message });
        }
    });
    app.post('/auth/introspect', (0, service_auth_1.requireServiceAuth)({
        audience: 'authz-gateway',
        allowedServices: trustedServices,
        requiredScopes: ['auth:introspect'],
    }), async (req, res) => {
        try {
            const { token } = req.body;
            const payload = await (0, auth_1.introspect)(token);
            res.json(payload);
        }
        catch {
            res.status(401).json({ error: 'invalid_token' });
        }
    });
    app.get('/subject/:id/attributes', async (req, res) => {
        try {
            const { id } = req.params;
            if (req.query.refresh === 'true') {
                attributeService.invalidateSubject(id);
            }
            const attributes = await attributeService.getSubjectAttributes(id);
            res.json({ data: attributes, schema: attributeService.getIdpSchema() });
        }
        catch (error) {
            res.status(404).json({ error: error.message });
        }
    });
    app.get('/resource/:id/attributes', async (req, res) => {
        try {
            const { id } = req.params;
            if (req.query.refresh === 'true') {
                attributeService.invalidateResource(id);
            }
            const resource = await attributeService.getResourceAttributes(id);
            res.json({ data: resource });
        }
        catch (error) {
            res.status(404).json({ error: error.message });
        }
    });
    app.post('/authorize', (0, service_auth_1.requireServiceAuth)({
        audience: 'authz-gateway',
        allowedServices: trustedServices,
        requiredScopes: ['abac:decide'],
    }), async (req, res) => {
        try {
            const subjectId = req.body?.subject?.id;
            const action = req.body?.action;
            if (!subjectId || !action) {
                return res
                    .status(400)
                    .json({ error: 'subject_id_and_action_required' });
            }
            const subject = await attributeService.getSubjectAttributes(subjectId);
            let resource;
            if (req.body?.resource?.id) {
                try {
                    const fromCatalog = await attributeService.getResourceAttributes(req.body.resource.id);
                    resource = {
                        ...fromCatalog,
                        ...req.body.resource,
                    };
                }
                catch (error) {
                    if (req.body.resource.tenantId) {
                        resource = {
                            id: req.body.resource.id,
                            tenantId: req.body.resource.tenantId,
                            residency: req.body.resource.residency || subject.residency,
                            classification: req.body.resource.classification || subject.clearance,
                            tags: req.body.resource.tags || [],
                        };
                    }
                    else {
                        throw error;
                    }
                }
            }
            else {
                resource = {
                    id: req.body?.resource?.id || 'inline',
                    tenantId: req.body?.resource?.tenantId || subject.tenantId,
                    residency: req.body?.resource?.residency || subject.residency,
                    classification: req.body?.resource?.classification || subject.clearance,
                    tags: req.body?.resource?.tags || [],
                };
            }
            const decision = await (0, policy_1.authorize)({
                subject,
                resource,
                action,
                context: attributeService.getDecisionContext(String(req.body?.context?.currentAcr || 'loa1')),
            });
            res.json({
                allow: decision.allowed,
                reason: decision.reason,
                obligations: decision.obligations,
            });
        }
        catch (error) {
            res.status(400).json({ error: error.message });
        }
    });
    app.post('/access/break-glass/request', (0, middleware_1.requireAuth)(attributeService, {
        action: 'break-glass:request',
    }), (req, res) => {
        const justification = String(req.body?.justification || '').trim();
        const ticketId = String(req.body?.ticketId || '').trim();
        if (!justification || !ticketId) {
            return res
                .status(400)
                .json({ error: 'justification_and_ticket_required' });
        }
        const scope = Array.isArray(req.body?.scope)
            ? req.body.scope.map(String).filter(Boolean)
            : ['break_glass:elevated'];
        try {
            const record = break_glass_1.breakGlassManager.createRequest(String(req.user?.sub || ''), justification, ticketId, scope);
            return res.status(201).json({
                requestId: record.id,
                status: record.status,
                scope: record.scope,
            });
        }
        catch (error) {
            return res.status(400).json({ error: error.message });
        }
    });
    app.post('/access/break-glass/approve', (0, middleware_1.requireAuth)(attributeService, {
        action: 'break-glass:approve',
        requiredAcr: 'loa2',
    }), async (req, res) => {
        const requestId = String(req.body?.requestId || '').trim();
        if (!requestId) {
            return res.status(400).json({ error: 'request_id_required' });
        }
        try {
            const approval = await break_glass_1.breakGlassManager.approve(requestId, String(req.user?.sub || ''));
            return res.json(approval);
        }
        catch (error) {
            const message = error.message;
            if (message === 'request_not_found') {
                return res.status(404).json({ error: message });
            }
            if (message === 'request_already_approved') {
                return res.status(409).json({ error: message });
            }
            if (message === 'request_expired') {
                return res.status(410).json({ error: message });
            }
            return res.status(400).json({ error: message });
        }
    });
    app.post('/auth/webauthn/challenge', (0, middleware_1.requireAuth)(attributeService, {
        action: 'step-up:challenge',
        skipAuthorization: true,
    }), (req, res) => {
        try {
            const userId = String(req.user?.sub || '');
            const sessionId = String(req.user?.sid || '');
            const challenge = stepUpManager.createChallenge(userId, {
                sessionId,
                requestedAction: String(req.body?.action || 'step-up:challenge'),
                resourceId: req.body?.resourceId,
                classification: req.body?.classification,
                tenantId: req.subjectAttributes?.tenantId,
                currentAcr: String(req.user?.acr || 'loa1'),
            });
            res.json(challenge);
        }
        catch (error) {
            res.status(400).json({ error: error.message });
        }
    });
    app.post('/auth/step-up', (0, middleware_1.requireAuth)(attributeService, {
        action: 'step-up:verify',
        skipAuthorization: true,
    }), async (req, res) => {
        try {
            const userId = String(req.user?.sub || '');
            const { credentialId, signature, challenge } = req.body || {};
            if (!credentialId || !signature || !challenge) {
                return res.status(400).json({ error: 'missing_challenge_payload' });
            }
            stepUpManager.verifyResponse(userId, {
                credentialId,
                signature,
                challenge,
            }, String(req.user?.sid || ''));
            const sid = String(req.user?.sid || '');
            const token = await session_1.sessionManager.elevateSession(sid, {
                acr: 'loa2',
                amr: ['hwk', 'fido2'],
                extendSeconds: 30 * 60,
            });
            res.json({ token, acr: 'loa2', amr: ['hwk', 'fido2'] });
        }
        catch (error) {
            res.status(400).json({ error: error.message });
        }
    });
    const upstream = process.env.UPSTREAM || 'http://localhost:4001';
    app.use('/protected', (0, middleware_1.requireAuth)(attributeService, {
        action: 'dataset:read',
        resourceIdHeader: 'x-resource-id',
    }), (0, http_proxy_middleware_1.createProxyMiddleware)({
        target: upstream,
        changeOrigin: true,
        pathRewrite: { '^/protected': '' },
        onProxyReq: (proxyReq) => {
            (0, observability_1.injectTraceContext)(proxyReq);
        },
    }));
    return app;
}
if (process.env.NODE_ENV !== 'test') {
    createApp().then((app) => {
        const port = process.env.PORT || 4000;
        app.listen(port, () => {
            const logger = (0, pino_1.default)();
            logger.info(`AuthZ Gateway listening on ${port}`);
        });
    });
}

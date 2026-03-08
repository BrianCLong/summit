"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.requireScope = requireScope;
// @ts-nocheck
const express_1 = __importDefault(require("express"));
const api_1 = require("@opentelemetry/api");
const sessions_js_1 = require("./sessions.js");
const metrics_js_1 = require("../../monitoring/metrics.js");
const sessions_store_js_1 = require("./sessions-store.js");
const firewall_js_1 = require("../../capability-fabric/firewall.js");
const sessionsByRun = new Map();
const router = express_1.default.Router({ mergeParams: true });
router.use(express_1.default.json());
// POST /api/maestro/v1/runs/:id/mcp/sessions
router.post('/runs/:id/mcp/sessions', async (req, res) => {
    const tracer = api_1.trace.getTracer('maestro-mcp');
    tracer.startActiveSpan('mcp.session.create', async (span) => {
        const runId = req.params.id;
        const { scopes, servers } = req.body || {};
        if (!Array.isArray(scopes) || scopes.length === 0) {
            span.setAttribute('error', true);
            span.end();
            return res
                .status(400)
                .json({ error: 'scopes is required (non-empty array)' });
        }
        try {
            const actorScopes = String(req.headers['x-actor-scopes'] || '')
                .split(',')
                .map((value) => value.trim())
                .filter(Boolean);
            const approvalToken = req.headers['x-approval-token'];
            const tenantId = req.headers['x-tenant-id'] || 'system';
            const userId = req.user?.id || 'unknown';
            const pathValue = '/api/maestro/v1/runs/:id/mcp/sessions';
            const preflight = await firewall_js_1.capabilityFirewall.preflightHttpEndpoint(req.method, pathValue, { scopes, servers }, actorScopes, approvalToken, tenantId, userId);
            firewall_js_1.capabilityFirewall.logDecision(preflight.decision, preflight.inputHash);
        }
        catch (err) {
            span.setAttribute('error', true);
            span.end();
            const status = err?.message === 'rate_limited'
                ? 429
                : err?.message?.includes('schema')
                    ? 400
                    : 403;
            return res.status(status).json({
                error: 'capability_blocked',
                message: err?.message || 'capability_blocked',
            });
        }
        const { sid, token } = (0, sessions_js_1.signSession)({ runId, scopes, servers });
        const list = sessionsByRun.get(runId) || [];
        list.push({ sid, runId, scopes, servers, createdAt: Date.now() });
        sessionsByRun.set(runId, list);
        if (process.env.MCP_SESSIONS_PERSIST === 'true') {
            const payload = JSON.parse(Buffer.from(token.split('.')[0], 'base64url').toString('utf8'));
            (0, sessions_store_js_1.persistSession)(sid, runId, scopes, servers, payload.exp).catch(() => { });
        }
        try {
            metrics_js_1.mcpSessionsTotal.inc({ event: 'created' });
        }
        catch { }
        span.setAttribute('run.id', runId);
        span.setAttribute('session.sid', sid);
        span.end();
        return res.status(201).json({ sid, token, runId, scopes, servers });
    });
});
// DELETE /api/maestro/v1/runs/:id/mcp/sessions/:sid
router.delete('/runs/:id/mcp/sessions/:sid', (req, res) => {
    const tracer = api_1.trace.getTracer('maestro-mcp');
    tracer.startActiveSpan('mcp.session.revoke', (span) => {
        (0, sessions_js_1.revokeSession)(req.params.sid);
        const runId = req.params.id;
        const before = sessionsByRun.get(runId) || [];
        sessionsByRun.set(runId, before.filter((s) => s.sid !== req.params.sid));
        if (process.env.MCP_SESSIONS_PERSIST === 'true') {
            (0, sessions_store_js_1.revokeSessionPersist)(req.params.sid).catch(() => { });
        }
        try {
            metrics_js_1.mcpSessionsTotal.inc({ event: 'revoked' });
        }
        catch { }
        span.setAttribute('run.id', runId);
        span.setAttribute('session.sid', req.params.sid);
        span.end();
        return res.status(204).send();
    });
});
// GET active sessions for a run (UI)
router.get('/runs/:id/mcp/sessions', (req, res) => {
    const runId = req.params.id;
    const list = (sessionsByRun.get(runId) || []).filter((s) => !(0, sessions_js_1.isRevoked)(s.sid));
    return res.json(list.map(({ sid, scopes, servers, createdAt }) => ({
        sid,
        scopes,
        servers,
        createdAt,
    })));
});
// Middleware to verify session token and scopes
function requireScope(scope) {
    return (req, res, next) => {
        const auth = req.headers['authorization'] || '';
        const token = auth.startsWith('Bearer ') ? auth.slice(7) : undefined;
        const sess = (0, sessions_js_1.verifySessionToken)(token);
        if (!sess || (0, sessions_js_1.isRevoked)(sess.sid)) {
            return res.status(401).json({ error: 'invalid session token' });
        }
        if (!sess.scopes.includes(scope) && !sess.scopes.includes('*')) {
            return res
                .status(403)
                .json({ error: 'missing required scope', required: scope });
        }
        req.mcpSession = sess;
        next();
    };
}
exports.default = router;

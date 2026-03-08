"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
// @ts-nocheck
const express_1 = __importDefault(require("express"));
const api_1 = require("@opentelemetry/api");
const sessions_api_js_1 = require("./sessions-api.js");
const database_js_1 = require("../../config/database.js");
const client_js_1 = require("../../conductor/mcp/client.js");
const metrics_js_1 = require("../../monitoring/metrics.js");
const firewall_js_1 = require("../../capability-fabric/firewall.js");
const router = express_1.default.Router({ mergeParams: true });
router.use(express_1.default.json());
// POST /api/maestro/v1/runs/:id/mcp/invoke
router.post('/runs/:id/mcp/invoke', (0, sessions_api_js_1.requireScope)('mcp:invoke'), async (req, res) => {
    const tracer = api_1.trace.getTracer('maestro-mcp');
    return tracer.startActiveSpan('mcp.invoke', async (span) => {
        const { server, tool, args } = req.body || {};
        if (!server || !tool) {
            span.setAttribute('error', true);
            span.end();
            return res.status(400).json({ error: 'server and tool are required' });
        }
        try {
            const sess = req.mcpSession;
            const approvalToken = req.headers['x-approval-token'];
            const tenantId = req.headers['x-tenant-id'] || 'system';
            const userId = req.user?.id || 'unknown';
            const preflight = await firewall_js_1.capabilityFirewall.preflightMcpInvoke(server, tool, args || {}, sess?.scopes ?? [], approvalToken, tenantId, userId);
            // Lazy init client with current registry
            if (!client_js_1.mcpClient)
                (0, client_js_1.initializeMCPClient)({ timeout: 5000 });
            const result = await client_js_1.mcpClient.executeTool(server, tool, preflight.sanitizedArgs, sess?.scopes);
            const postflight = firewall_js_1.capabilityFirewall.postflightMcpInvoke(preflight.capability, server, tool, result || {});
            firewall_js_1.capabilityFirewall.logDecision(preflight.decision, preflight.inputHash, postflight.outputHash);
            // Audit log (best effort; do not fail invoke on audit failure)
            const argsHash = preflight.inputHash;
            const resultHash = postflight.outputHash;
            try {
                const pool = (0, database_js_1.getPostgresPool)();
                await pool.query(`INSERT INTO audit_logs (user_id, action, resource_type, resource_id, details)
         VALUES ($1, $2, $3, $4, $5)`, [
                    null,
                    'mcp_invoke',
                    'mcp',
                    req.params.id,
                    {
                        server,
                        tool,
                        argsHash,
                        resultHash,
                        capability_id: preflight.capability.capability_id,
                    },
                ]);
            }
            catch (e) {
                console.warn('Audit log insert failed (non-fatal):', e?.message || e);
            }
            try {
                metrics_js_1.mcpInvocationsTotal.inc({ status: 'success' });
            }
            catch { }
            span.setAttribute('run.id', req.params.id);
            span.setAttribute('mcp.server', server);
            span.setAttribute('mcp.tool', tool);
            span.end();
            res.json({
                server,
                tool,
                result: postflight.sanitizedResult,
                capability_id: preflight.capability.capability_id,
                audit: { argsHash, resultHash },
            });
        }
        catch (err) {
            if ([
                'capability_unregistered',
                'identity_not_allowed',
                'approval_required',
                'rate_limited',
                'input_schema_invalid',
                'output_schema_invalid',
            ].includes(err?.message)) {
                try {
                    metrics_js_1.mcpInvocationsTotal.inc({ status: 'error' });
                }
                catch { }
                span.setAttribute('error', true);
                span.end();
                const status = err.message === 'rate_limited'
                    ? 429
                    : err.message.includes('schema')
                        ? 400
                        : 403;
                return res.status(status).json({
                    error: 'capability_blocked',
                    message: err.message,
                });
            }
            if (err?.message?.includes('Insufficient scopes')) {
                try {
                    metrics_js_1.mcpInvocationsTotal.inc({ status: 'error' });
                }
                catch { }
                span.setAttribute('error', true);
                span.end();
                return res
                    .status(403)
                    .json({ error: 'forbidden', message: err.message });
            }
            console.error('Invoke failed:', err);
            try {
                metrics_js_1.mcpInvocationsTotal.inc({ status: 'error' });
            }
            catch { }
            span.setAttribute('error', true);
            span.end();
            res.status(500).json({
                error: 'invoke_failed',
                message: err?.message || 'Unknown error',
            });
        }
    });
});
exports.default = router;

"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const zod_1 = require("zod");
const postgres_js_1 = require("../../db/postgres.js");
const auth_js_1 = require("../../middleware/auth.js");
const rbac_js_1 = require("../../middleware/rbac.js");
const otel_tracing_js_1 = require("../../middleware/observability/otel-tracing.js");
const policy_action_gate_js_1 = require("../../middleware/policy-action-gate.js");
const http_param_js_1 = require("../../utils/http-param.js");
const router = express_1.default.Router();
router.use(express_1.default.json());
router.use(auth_js_1.ensureAuthenticated);
const OverrideRequestSchema = zod_1.z.object({
    model: zod_1.z.string().min(1),
    reason: zod_1.z.string().min(10).max(500),
});
// GET /api/maestro/v1/runs/:runId/nodes/:nodeId/routing
router.get('/runs/:runId/nodes/:nodeId/routing', (0, rbac_js_1.requirePermission)('run:read'), async (req, res) => {
    const span = otel_tracing_js_1.otelService.createSpan('routing.get_decision');
    try {
        const { runId, nodeId } = req.params;
        const pool = (0, postgres_js_1.getPostgresPool)();
        const { rows } = await pool.query(`SELECT 
        id, run_id, node_id, selected_model, candidates, 
        policy_applied, override_reason, created_at
      FROM router_decisions 
      WHERE run_id = $1 AND node_id = $2 
      ORDER BY created_at DESC 
      LIMIT 1`, [runId, nodeId]);
        if (!rows.length) {
            return res.status(404).json({ error: 'Router decision not found' });
        }
        const decision = rows[0];
        // Check if user can override (based on permissions/role)
        const user = req.user || {};
        const canOverride = user.permissions?.includes('routing:override') || user.role === 'ADMIN';
        const response = {
            id: decision.id,
            runId: decision.run_id,
            nodeId: decision.node_id,
            selectedModel: decision.selected_model,
            candidates: decision.candidates || [],
            policyApplied: decision.policy_applied,
            overrideReason: decision.override_reason,
            timestamp: decision.created_at,
            canOverride,
        };
        span?.addSpanAttributes({
            'routing.run_id': runId,
            'routing.node_id': nodeId,
            'routing.selected_model': decision.selected_model,
        });
        res.json(response);
    }
    catch (error) {
        console.error('Error fetching router decision:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
    finally {
        span?.end();
    }
});
// POST /api/maestro/v1/runs/:runId/nodes/:nodeId/override-routing
router.post('/runs/:runId/nodes/:nodeId/override-routing', (0, policy_action_gate_js_1.policyActionGate)({
    action: 'override',
    resource: 'maestro_run',
    resolveResourceId: (req) => (0, http_param_js_1.firstString)(req.params.runId),
    buildResourceAttributes: (req) => ({
        runId: req.params.runId,
        nodeId: req.params.nodeId,
    }),
}), (0, rbac_js_1.requirePermission)('routing:override'), async (req, res) => {
    const span = otel_tracing_js_1.otelService.createSpan('routing.override_decision');
    try {
        const { runId, nodeId } = req.params;
        const validation = OverrideRequestSchema.safeParse(req.body);
        if (!validation.success) {
            return res.status(400).json({
                error: 'Invalid input',
                details: validation.error.issues,
            });
        }
        const { model, reason } = validation.data;
        const user = req.user || {};
        const userId = user.id || user.email || 'unknown';
        const pool = (0, postgres_js_1.getPostgresPool)();
        // First check if decision exists
        const { rows: existing } = await pool.query('SELECT id, candidates FROM router_decisions WHERE run_id = $1 AND node_id = $2', [runId, nodeId]);
        if (!existing.length) {
            return res.status(404).json({ error: 'Router decision not found' });
        }
        const decision = existing[0];
        const candidates = decision.candidates || [];
        // Validate that the override model was a candidate
        const validModel = candidates.some((c) => c.model === model);
        if (!validModel) {
            return res.status(400).json({
                error: 'Override model must be one of the original candidates',
            });
        }
        // Update the decision with override
        await pool.query(`UPDATE router_decisions 
       SET selected_model = $1, override_reason = $2, updated_at = now()
       WHERE id = $3`, [model, reason, decision.id]);
        // Log the override event for audit
        await pool.query(`INSERT INTO run_event (run_id, kind, payload)
       VALUES ($1, 'routing.override', $2)`, [
            runId,
            {
                nodeId,
                originalModel: decision.selected_model,
                overrideModel: model,
                reason,
                userId,
                timestamp: new Date().toISOString(),
            },
        ]);
        span?.addSpanAttributes({
            'routing.override.run_id': runId,
            'routing.override.node_id': nodeId,
            'routing.override.user_id': userId,
            'routing.override.model': model,
        });
        res.json({
            success: true,
            message: 'Router decision overridden successfully',
        });
    }
    catch (error) {
        console.error('Error overriding router decision:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
    finally {
        span?.end();
    }
});
// GET /api/maestro/v1/audit/router-decisions/:decisionId/export
router.get('/audit/router-decisions/:decisionId/export', (0, rbac_js_1.requirePermission)('audit:read'), async (req, res) => {
    const span = otel_tracing_js_1.otelService.createSpan('routing.export_audit');
    try {
        const { decisionId } = req.params;
        const pool = (0, postgres_js_1.getPostgresPool)();
        const { rows } = await pool.query(`SELECT 
        rd.*, 
        re.payload as override_event
      FROM router_decisions rd
      LEFT JOIN run_event re ON re.run_id = rd.run_id 
        AND re.kind = 'routing.override'
        AND (re.payload->>'nodeId') = rd.node_id
      WHERE rd.id = $1`, [decisionId]);
        if (!rows.length) {
            return res.status(404).json({ error: 'Router decision not found' });
        }
        const decision = rows[0];
        const auditData = {
            id: decision.id,
            runId: decision.run_id,
            nodeId: decision.node_id,
            selectedModel: decision.selected_model,
            candidates: decision.candidates,
            policyApplied: decision.policy_applied,
            overrideReason: decision.override_reason,
            overrideEvent: decision.override_event,
            createdAt: decision.created_at,
            exportedAt: new Date().toISOString(),
            exportedBy: req.user?.id || 'unknown',
        };
        res.setHeader('Content-Type', 'application/json');
        res.setHeader('Content-Disposition', `attachment; filename=router-decision-${decisionId}.json`);
        res.json(auditData);
    }
    catch (error) {
        console.error('Error exporting router decision audit:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
    finally {
        span?.end();
    }
});
// GET /api/maestro/v1/routing/drift-analysis - Detect routing decision drift
router.get('/routing/drift-analysis', (0, rbac_js_1.requirePermission)('routing:read'), async (req, res) => {
    const span = otel_tracing_js_1.otelService.createSpan('routing.drift_analysis');
    try {
        const pool = (0, postgres_js_1.getPostgresPool)();
        // Analyze routing patterns over time
        const { rows } = await pool.query(`
      WITH recent_decisions AS (
        SELECT 
          selected_model,
          policy_applied,
          DATE_TRUNC('hour', created_at) as hour_bucket,
          COUNT(*) as decisions_count
        FROM router_decisions 
        WHERE created_at >= NOW() - INTERVAL '24 hours'
        GROUP BY selected_model, policy_applied, hour_bucket
      ),
      model_popularity AS (
        SELECT 
          selected_model,
          COUNT(*) as total_selections,
          COUNT(*) FILTER (WHERE override_reason IS NOT NULL) as override_count,
          AVG((candidates->0->>'score')::float) as avg_score
        FROM router_decisions 
        WHERE created_at >= NOW() - INTERVAL '7 days'
        GROUP BY selected_model
        ORDER BY total_selections DESC
      )
      SELECT * FROM model_popularity
    `);
        const driftMetrics = {
            modelPopularity: rows,
            timestamp: new Date().toISOString(),
            analysis: {
                mostUsedModel: rows[0]?.selected_model || null,
                overrideRate: rows.length
                    ? (rows.reduce((sum, r) => sum + r.override_count, 0) /
                        rows.reduce((sum, r) => sum + r.total_selections, 0)) *
                        100
                    : 0,
                avgScore: rows.length
                    ? rows.reduce((sum, r) => sum + parseFloat(r.avg_score || 0), 0) /
                        rows.length
                    : 0,
            },
        };
        res.json(driftMetrics);
    }
    catch (error) {
        console.error('Error analyzing routing drift:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
    finally {
        span?.end();
    }
});
exports.default = router;

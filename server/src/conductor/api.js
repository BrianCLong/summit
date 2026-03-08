"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const crypto_1 = __importDefault(require("crypto"));
const postgres_js_1 = require("../db/postgres.js");
const otel_tracing_js_1 = require("../middleware/observability/otel-tracing.js");
const router = express_1.default.Router();
// List pending approval tasks (fed from run_event + run_step)
router.get('/v1/approvals', async (_req, res) => {
    try {
        const span = otel_tracing_js_1.otelService.createSpan('conductor.approvals.list');
        const pool = (0, postgres_js_1.getPostgresPool)();
        const { rows } = await pool.query(`SELECT e.run_id, (e.payload->>'stepId') as step_id, e.ts as created_at, (e.payload->'labels') as labels
       FROM run_event e
       JOIN run_step s ON s.run_id = e.run_id AND s.step_id = (e.payload->>'stepId')
       WHERE e.kind = 'approval.created' AND s.status = 'BLOCKED'
       ORDER BY e.ts DESC LIMIT 200`);
        const items = rows.map((r) => ({
            runId: r.run_id,
            stepId: r.step_id,
            createdAt: r.created_at,
            labels: Array.isArray(r.labels) ? r.labels : [],
        }));
        span?.end();
        return res.json({ items });
    }
    catch (e) {
        return res.status(500).json({ error: e?.message || 'failed' });
    }
});
// Schedules CRUD
router.get('/v1/schedules', async (_req, res) => {
    try {
        const span = otel_tracing_js_1.otelService.createSpan('conductor.schedules.list');
        const pool = (0, postgres_js_1.getPostgresPool)();
        const { rows } = await pool.query(`SELECT id, runbook, cron, enabled, last_run_at FROM schedules ORDER BY runbook, id`);
        span?.end();
        res.json({ items: rows });
    }
    catch (e) {
        res.status(500).json({ error: e?.message || 'failed' });
    }
});
router.post('/v1/schedules', express_1.default.json(), async (req, res) => {
    try {
        const span = otel_tracing_js_1.otelService.createSpan('conductor.schedules.create');
        const pool = (0, postgres_js_1.getPostgresPool)();
        const id = crypto_1.default.randomUUID();
        const { runbook, cron, enabled } = req.body || {};
        if (!runbook || !cron)
            return res.status(400).json({ error: 'runbook and cron required' });
        await pool.query(`INSERT INTO schedules (id, runbook, cron, enabled) VALUES ($1,$2,$3,$4)`, [id, runbook, cron, enabled !== false]);
        span?.end();
        res.status(201).json({ id, runbook, cron, enabled: enabled !== false });
    }
    catch (e) {
        res.status(500).json({ error: e?.message || 'failed' });
    }
});
router.patch('/v1/schedules/:id', express_1.default.json(), async (req, res) => {
    try {
        const span = otel_tracing_js_1.otelService.createSpan('conductor.schedules.update');
        const pool = (0, postgres_js_1.getPostgresPool)();
        const { id } = req.params;
        const { enabled, cron } = req.body || {};
        const sets = [];
        const vals = [];
        if (typeof enabled === 'boolean') {
            sets.push(`enabled = $${sets.length + 1}`);
            vals.push(enabled);
        }
        if (typeof cron === 'string' && cron.length) {
            sets.push(`cron = $${sets.length + 1}`);
            vals.push(cron);
        }
        if (!sets.length)
            return res.status(400).json({ error: 'no fields to update' });
        vals.push(id);
        await pool.query(`UPDATE schedules SET ${sets.join(', ')} WHERE id=$${vals.length}`, vals);
        span?.end();
        res.json({ ok: true });
    }
    catch (e) {
        res.status(500).json({ error: e?.message || 'failed' });
    }
});
exports.default = router;

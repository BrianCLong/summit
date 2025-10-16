import express from 'express';
import crypto from 'crypto';
import { getPostgresPool } from '../db/postgres.js';
import { otelService } from '../middleware/observability/otel-tracing.js';

const router = express.Router();

// List pending approval tasks (fed from run_event + run_step)
router.get('/v1/approvals', async (_req, res) => {
  try {
    const span = otelService.createSpan('conductor.approvals.list');
    const pool = getPostgresPool();
    const { rows } = await pool.query(
      `SELECT e.run_id, (e.payload->>'stepId') as step_id, e.ts as created_at, (e.payload->'labels') as labels
       FROM run_event e
       JOIN run_step s ON s.run_id = e.run_id AND s.step_id = (e.payload->>'stepId')
       WHERE e.kind = 'approval.created' AND s.status = 'BLOCKED'
       ORDER BY e.ts DESC LIMIT 200`,
    );
    const items = rows.map((r) => ({
      runId: r.run_id,
      stepId: r.step_id,
      createdAt: r.created_at,
      labels: Array.isArray(r.labels) ? r.labels : [],
    }));
    span?.end();
    return res.json({ items });
  } catch (e: any) {
    return res.status(500).json({ error: e?.message || 'failed' });
  }
});

// Schedules CRUD
router.get('/v1/schedules', async (_req, res) => {
  try {
    const span = otelService.createSpan('conductor.schedules.list');
    const pool = getPostgresPool();
    const { rows } = await pool.query(
      `SELECT id, runbook, cron, enabled, last_run_at FROM schedules ORDER BY runbook, id`,
    );
    span?.end();
    res.json({ items: rows });
  } catch (e: any) {
    res.status(500).json({ error: e?.message || 'failed' });
  }
});

router.post('/v1/schedules', express.json(), async (req, res) => {
  try {
    const span = otelService.createSpan('conductor.schedules.create');
    const pool = getPostgresPool();
    const id = crypto.randomUUID();
    const { runbook, cron, enabled } = req.body || {};
    if (!runbook || !cron)
      return res.status(400).json({ error: 'runbook and cron required' });
    await pool.query(
      `INSERT INTO schedules (id, runbook, cron, enabled) VALUES ($1,$2,$3,$4)`,
      [id, runbook, cron, enabled !== false],
    );
    span?.end();
    res.status(201).json({ id, runbook, cron, enabled: enabled !== false });
  } catch (e: any) {
    res.status(500).json({ error: e?.message || 'failed' });
  }
});

router.patch('/v1/schedules/:id', express.json(), async (req, res) => {
  try {
    const span = otelService.createSpan('conductor.schedules.update');
    const pool = getPostgresPool();
    const { id } = req.params as any;
    const { enabled, cron } = req.body || {};
    const sets: string[] = [];
    const vals: any[] = [];
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
    await pool.query(
      `UPDATE schedules SET ${sets.join(', ')} WHERE id=$${vals.length}`,
      vals,
    );
    span?.end();
    res.json({ ok: true });
  } catch (e: any) {
    res.status(500).json({ error: e?.message || 'failed' });
  }
});

export default router;

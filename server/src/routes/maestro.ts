import express from 'express';
import pipelinesRouter from '../maestro/pipelines/pipelines-api.js';
import runsRouter from '../maestro/runs/runs-api.js';
import executorsRouter from '../maestro/executors/executors-api.js';

const router = express.Router();

// Mount sub-routers
// Note: These routers define their own paths (e.g. /pipelines, /runs),
// so we mount them at the root of this router.
// If this router is mounted at /api/maestro, the full paths will be:
// /api/maestro/pipelines
// /api/maestro/runs
// /api/maestro/executors

router.use('/', pipelinesRouter);
router.use('/', runsRouter);
router.use('/', executorsRouter);

// Alias /workflows to /pipelines for SM-101 compliance if needed,
// but currently the code implementation uses "pipelines".
// If strict /workflows support is needed, we would need to modify pipelines-api.ts
// or do a URL rewrite here. For now, we stick to the implementation.

export default router;

import { Router } from 'express';
import { ensureAuthenticated } from '../middleware/auth';
import { MaestroEngine } from '../maestro/engine';
import { MaestroTemplate } from '../maestro/model';
import { Pool } from 'pg';
import { logger } from '../utils/logger';
import { recordEndpointResult } from '../observability/reliability-metrics.js';

import { asyncHandler } from '../middleware/async-handler.js';
// Note: This assumes `req.user` is populated by auth middleware
// and `engine` and `db` are injected or available via singleton/context.
// For this file, I'll export a factory function.

export const createMaestroRouter = (engine: MaestroEngine, db: Pool) => {
  const router = Router();

  // --- Runs ---

  router.post('/runs', ensureAuthenticated, asyncHandler(async (req: any, res: any) => {
    const start = process.hrtime();
    const tenantId = req.user!.tenantId;

    const { templateId, input } = req.body;
    const principalId = req.user!.id;

    if (!templateId) {
      recordEndpointResult({
        endpoint: 'maestro_execution',
        statusCode: 400,
        durationSeconds: 0,
        tenantId
      });
      return res.status(400).json({ error: 'templateId required' });
    }

    const run = await engine.createRun(tenantId, templateId, input, principalId);

    const [seconds, nanoseconds] = process.hrtime(start);
    const duration = seconds + nanoseconds / 1e9;

    recordEndpointResult({
      endpoint: 'maestro_execution',
      statusCode: 201,
      durationSeconds: duration,
      tenantId
    });

    res.status(201).json(run);
  }));

  router.get('/runs/:runId', ensureAuthenticated, asyncHandler(async (req: any, res: any) => {
    const { runId } = req.params;
    const tenantId = req.user!.tenantId;

    const result = await db.query(
      `SELECT * FROM maestro_runs WHERE id = $1 AND tenant_id = $2`,
      [runId, tenantId]
    );

    if (result.rows.length === 0) return res.status(404).json({ error: 'Run not found' });
    res.json(result.rows[0]);
  }));

  router.get('/runs', ensureAuthenticated, asyncHandler(async (req: any, res: any) => {
    const tenantId = req.user!.tenantId;
    const { templateId, status, limit = 20 } = req.query;

    let query = `SELECT * FROM maestro_runs WHERE tenant_id = $1`;
    const params: any[] = [tenantId];
    let idx = 2;

    if (templateId) {
      query += ` AND template_id = $${idx++}`;
      params.push(templateId);
    }
    if (status) {
      query += ` AND status = $${idx++}`;
      params.push(status);
    }

    query += ` ORDER BY started_at DESC LIMIT $${idx}`;
    params.push(limit);

    const result = await db.query(query, params);
    res.json(result.rows);
  }));

  // --- Templates ---

  router.get('/templates', ensureAuthenticated, asyncHandler(async (req: any, res: any) => {
    const tenantId = req.user!.tenantId;
    const result = await db.query(
      `SELECT * FROM maestro_templates WHERE tenant_id = $1 ORDER BY created_at DESC`,
      [tenantId]
    );
    res.json(result.rows);
  }));

  router.post('/templates', ensureAuthenticated, asyncHandler(async (req: any, res: any) => {
    const tenantId = req.user!.tenantId;
    const template: MaestroTemplate = {
      ...req.body,
      id: req.body.id || crypto.randomUUID(),
      tenantId,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };

    // TODO: Validate Spec via MaestroDSL.validate(template.spec)

    await db.query(
      `INSERT INTO maestro_templates (id, tenant_id, name, version, kind, input_schema, output_schema, spec, metadata)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)`,
      [template.id, template.tenantId, template.name, template.version || 1, template.kind, template.inputSchema, template.outputSchema, template.spec, template.metadata]
    );

    res.status(201).json(template);
  }));

  return router;
};

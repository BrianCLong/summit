
import { Router } from 'express';
import { ensureAuthenticated } from '../middleware/auth';
import { MaestroEngine } from '../maestro/engine';
import { MaestroTemplate } from '../maestro/model';
import { Pool } from 'pg';
import { logger } from '../utils/logger';

// Note: This assumes `req.user` is populated by auth middleware
// and `engine` and `db` are injected or available via singleton/context.
// For this file, I'll export a factory function.

export const createMaestroRouter = (engine: MaestroEngine, db: Pool) => {
  const router = Router();

  // --- Runs ---

  router.post('/runs', ensureAuthenticated, async (req, res) => {
    try {
      const { templateId, input } = req.body;
      const tenantId = (req as any).user.tenantId;
      const principalId = (req as any).user.id;

      if (!templateId) return res.status(400).json({ error: 'templateId required' });

      const run = await engine.createRun(tenantId, templateId, input, principalId);
      res.status(201).json(run);
    } catch (err: any) {
      logger.error('Failed to create run', err);
      res.status(500).json({ error: err.message });
    }
  });

  router.get('/runs/:runId', ensureAuthenticated, async (req, res) => {
    try {
      const { runId } = req.params;
      const tenantId = (req as any).user.tenantId;

      const result = await db.query(
        `SELECT * FROM maestro_runs WHERE id = $1 AND tenant_id = $2`,
        [runId, tenantId]
      );

      if (result.rows.length === 0) return res.status(404).json({ error: 'Run not found' });
      res.json(result.rows[0]);
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  router.get('/runs', ensureAuthenticated, async (req, res) => {
    try {
      const tenantId = (req as any).user.tenantId;
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
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  // --- Templates ---

  router.get('/templates', ensureAuthenticated, async (req, res) => {
    try {
      const tenantId = (req as any).user.tenantId;
      const result = await db.query(
        `SELECT * FROM maestro_templates WHERE tenant_id = $1 ORDER BY created_at DESC`,
        [tenantId]
      );
      res.json(result.rows);
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  router.post('/templates', ensureAuthenticated, async (req, res) => {
    try {
      const tenantId = (req as any).user.tenantId;
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
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  return router;
};

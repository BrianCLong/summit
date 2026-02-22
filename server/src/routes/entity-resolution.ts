import express from 'express';
import { EntityResolutionService } from '../services/entity-resolution/service.js';
import { DataQualityService } from '../services/entity-resolution/quality.js';
import { EntityResolutionV2Service } from '../services/er/EntityResolutionV2Service.js';
import { getPostgresPool } from '../config/database.js';

const router = express.Router();
const erService = new EntityResolutionService();
const dqService = new DataQualityService();
const erV2Service = new EntityResolutionV2Service();

// Batch Resolution Endpoint
router.post('/resolve-batch', async (req, res) => {
  try {
    const { entities } = req.body;
    if (!Array.isArray(entities)) {
      return res.status(400).json({ error: 'Entities must be an array' });
    }

    // Inject tenantId from authenticated user context if not present on entities
    // Assuming req.user is populated by auth middleware
    const tenantId = (req as any).user?.tenantId;

    const enrichedEntities = entities.map(e => ({
        ...e,
        tenantId: e.tenantId || tenantId
    }));

    if (enrichedEntities.some(e => !e.tenantId)) {
        return res.status(400).json({ error: 'Tenant ID missing on some entities' });
    }

    const decisions = await erService.resolveBatch(enrichedEntities);
    res.json({ decisions });
  } catch (error: any) {
    console.error('Batch resolution error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Data Quality Metrics Endpoint
router.get('/quality/metrics', async (req, res) => {
  try {
    const tenantId = (req as any).user?.tenantId;
    if (!tenantId) {
        return res.status(400).json({ error: 'Tenant context required' });
    }

    const metrics = await dqService.getQualityMetrics(tenantId);
    res.json({ metrics });
  } catch (error: any) {
    console.error('Quality metrics error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Guardrail status endpoint
router.get('/guardrails/status', async (req, res) => {
  try {
    const datasetId = typeof (req.query.datasetId as any) === 'string' ? (req.query.datasetId as any) : undefined;
    const guardrails = erV2Service.evaluateGuardrails(datasetId);
    const pool = getPostgresPool();
    const overrideResult = await pool.query(
      `
        SELECT dataset_id, reason, actor_id, merge_id, created_at
        FROM er_guardrail_overrides
        WHERE dataset_id = $1
        ORDER BY created_at DESC
        LIMIT 1
      `,
      [guardrails.datasetId],
    );

    const latestOverride = overrideResult.rows[0]
      ? {
          datasetId: overrideResult.rows[0].dataset_id,
          reason: overrideResult.rows[0].reason,
          actorId: overrideResult.rows[0].actor_id,
          mergeId: overrideResult.rows[0].merge_id,
          createdAt: overrideResult.rows[0].created_at,
        }
      : null;

    res.json({
      ...guardrails,
      latestOverride,
    });
  } catch (error: any) {
    console.error('Guardrail status error:', error);
    res.status(500).json({ error: 'Failed to fetch guardrail status' });
  }
});

// Guardrail preflight evaluation (CI/merge gate)
router.post('/guardrails/preflight', async (req, res) => {
  try {
    const datasetId = req.body?.datasetId as string | undefined;
    const guardrails = erV2Service.evaluateGuardrails(datasetId);
    await erV2Service.recordGuardrailEvaluation(guardrails, {
      userId: (req as any).user?.id,
      tenantId: (req as any).user?.tenantId,
    });
    res.json(guardrails);
  } catch (error: any) {
    console.error('Guardrail preflight error:', error);
    res.status(500).json({ error: 'Failed to run guardrail preflight' });
  }
});

export default router;

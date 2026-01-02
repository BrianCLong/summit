// @ts-nocheck
import express from 'express';
import { z } from 'zod';
import Ajv from 'ajv';
import addFormats from 'ajv-formats';
import { pipelinesRepo } from './pipelines-repo.js';
import { ensureAuthenticated } from '../../middleware/auth.js';
import { requirePermission } from '../../middleware/rbac.js';
import { MaestroDSL } from '../dsl.js';
import { MAESTRO_DSL_SCHEMA } from '../dsl-schema.js';
import { pipelineScheduleService } from '../scheduler/PipelineScheduleService.js';

const router = express.Router();
router.use(express.json());
router.use(ensureAuthenticated); // Ensure all routes require authentication

const PipelineCreate = z.object({
  name: z.string().min(3).max(128),
  spec: z.record(z.any()).default({}),
});
const PipelineUpdate = z.object({
  name: z.string().min(3).max(128).optional(),
  spec: z.record(z.any()).optional(),
});

const PipelineSchedule = z.object({
  enabled: z.boolean(),
  cron: z.string().optional(),
  timezone: z.string().optional(),
});

const ajv = new Ajv({ allErrors: true, strict: false });
addFormats(ajv);
const validateDsl = ajv.compile(MAESTRO_DSL_SCHEMA);

router.get(
  '/pipelines',
  requirePermission('pipeline:read'),
  async (req, res) => {
    const tenantId = (req as any).tenant || (req as any).user?.tenantId || 'default';
    const items = await pipelinesRepo.list(tenantId);
    res.json(items);
  },
);

router.post(
  '/pipelines',
  requirePermission('pipeline:create'),
  async (req, res) => {
    const parse = PipelineCreate.safeParse(req.body || {});
    if (!parse.success)
      return res
        .status(400)
        .json({ error: 'invalid_input', details: parse.error.issues });
    const tenantId = (req as any).tenant || (req as any).user?.tenantId || 'default';
    const created = await pipelinesRepo.create(
      parse.data.name,
      parse.data.spec,
      tenantId,
    );
    res.status(201).json(created);
  },
);

router.get(
  '/pipelines/schema',
  requirePermission('pipeline:read'),
  (_req, res) => {
    res.json(MAESTRO_DSL_SCHEMA);
  },
);

router.post(
  '/pipelines/validate',
  requirePermission('pipeline:read'),
  (req, res) => {
    const spec = req.body?.spec ?? req.body;
    if (!spec || typeof spec !== 'object') {
      return res.status(400).json({ error: 'invalid_spec' });
    }

    const schemaValid = validateDsl(spec);
    const schemaErrors = schemaValid
      ? []
      : (validateDsl.errors || []).map((err: any) => ({
          path: err.instancePath || err.schemaPath,
          message: err.message,
        }));

    const dslResult = MaestroDSL.validate(spec as any);
    const dslError = dslResult.valid ? null : dslResult.error;

    const valid = schemaValid && dslResult.valid;
    return res.json({
      valid,
      schemaErrors,
      dslError,
    });
  },
);

router.post(
  '/pipelines/simulate',
  requirePermission('pipeline:read'),
  (req, res) => {
    const spec = req.body?.spec ?? req.body;
    if (!spec || typeof spec !== 'object') {
      return res.status(400).json({ error: 'invalid_spec' });
    }

    const schemaValid = validateDsl(spec);
    const dslResult = MaestroDSL.validate(spec as any);
    if (!schemaValid || !dslResult.valid) {
      return res.status(400).json({
        error: 'invalid_spec',
        schemaErrors: validateDsl.errors || [],
        dslError: dslResult.error,
      });
    }

    const nodeCount = Array.isArray(spec.nodes) ? spec.nodes.length : 0;
    const edgeCount = Array.isArray(spec.edges) ? spec.edges.length : 0;
    const taskNodes = Array.isArray(spec.nodes)
      ? spec.nodes.filter((node: any) => node.kind === 'task').length
      : 0;

    const estimatedDurationMs = Math.max(
      500,
      nodeCount * 750 + edgeCount * 220,
    );
    const estimatedCostUSD = Number(
      (0.002 * nodeCount + 0.001 * edgeCount + 0.003 * taskNodes).toFixed(4),
    );

    res.json({
      estimate: {
        estimatedCostUSD,
        estimatedDurationMs,
        nodes: nodeCount,
        edges: edgeCount,
        taskNodes,
      },
      explain: {
        assumptions: [
          'Cost scales with node count and task density.',
          'Edge count increases orchestration overhead.',
          'Durations are sampled using a 750ms baseline per node.',
        ],
      },
      sampledRuns: [
        {
          run: 1,
          estimatedCostUSD: Number((estimatedCostUSD * 0.92).toFixed(4)),
          estimatedDurationMs: Math.round(estimatedDurationMs * 0.9),
        },
        {
          run: 2,
          estimatedCostUSD: Number((estimatedCostUSD * 1.06).toFixed(4)),
          estimatedDurationMs: Math.round(estimatedDurationMs * 1.1),
        },
      ],
    });
  },
);

router.get(
  '/pipelines/:id',
  requirePermission('pipeline:read'),
  async (req, res) => {
    const tenantId = (req as any).tenant || (req as any).user?.tenantId || 'default';
    const got = await pipelinesRepo.get(req.params.id, tenantId);
    if (!got) return res.status(404).json({ error: 'not_found' });
    res.json(got);
  },
);

router.put(
  '/pipelines/:id',
  requirePermission('pipeline:update'),
  async (req, res) => {
    const parse = PipelineUpdate.safeParse(req.body || {});
    if (!parse.success)
      return res
        .status(400)
        .json({ error: 'invalid_input', details: parse.error.issues });
    const tenantId = (req as any).tenant || (req as any).user?.tenantId || 'default';
    const upd = await pipelinesRepo.update(req.params.id, parse.data, tenantId);
    if (!upd) return res.status(404).json({ error: 'not_found' });
    res.json(upd);
  },
);

router.put(
  '/pipelines/:id/schedule',
  requirePermission('pipeline:update'),
  async (req, res) => {
    const schedulePayload = req.body?.schedule ?? req.body;
    const scheduleParse = PipelineSchedule.safeParse(schedulePayload);
    if (!scheduleParse.success) {
      return res.status(400).json({
        error: 'invalid_schedule',
        details: scheduleParse.error.issues,
      });
    }

    const tenantId =
      (req as any).tenant || (req as any).user?.tenantId || 'default';
    const pipeline = await pipelinesRepo.get(req.params.id, tenantId);
    if (!pipeline) return res.status(404).json({ error: 'not_found' });

    const nextSpec = {
      ...(pipeline.spec || {}),
      schedule: scheduleParse.data,
    };

    const updated = await pipelinesRepo.update(
      req.params.id,
      { spec: nextSpec },
      tenantId,
    );

    try {
      const scheduleStatus = await pipelineScheduleService.applySchedule(
        req.params.id,
        tenantId,
        scheduleParse.data,
      );
      return res.json({
        pipeline: updated,
        schedule: scheduleParse.data,
        nextRunAt: scheduleStatus.nextRunAt,
      });
    } catch (error: any) {
      return res.status(400).json({
        error: 'invalid_schedule',
        message: error?.message || 'Schedule could not be applied',
      });
    }
  },
);

router.delete(
  '/pipelines/:id',
  requirePermission('pipeline:update'),
  async (req, res) => {
    const tenantId = (req as any).tenant || (req as any).user?.tenantId || 'default';
    const ok = await pipelinesRepo.delete(req.params.id, tenantId);
    res.status(ok ? 204 : 404).send();
  },
);

// Policy hints (stub)
router.post('/pipelines/hints', async (req, res) => {
  const spec = req.body && typeof req.body === 'object' ? req.body : {};
  const hints: string[] = [];
  // Static heuristics
  if ((spec as any).nodes?.length > 8)
    hints.push(
      'Consider breaking into stages; >8 nodes may impact readability and retries',
    );
  if (
    (spec as any).nodes?.some(
      (n: any) => n.type === 'llm' && n.temperature > 0.7,
    )
  )
    hints.push('High temperature; consider lower for determinism in CI flows');
  // OPA policy hints (if engine available)
  try {
    const mod = await import('../../conductor/governance/opa-integration.js');
    const engine: any = mod?.opaPolicyEngine;
    if (engine && typeof engine.evaluateTenantIsolation === 'function') {
      const context = {
        userId: (req as any).user?.id || 'unknown',
        pipeline: spec,
        action: 'plan',
        role: (req as any).user?.role || 'user',
        resource: 'pipeline',
        tenantId: (req as any).tenant || 'default',
      } as any;
      const decision = await engine.evaluatePolicy(
        'conductor/pipeline_hints',
        context,
      );
      if (decision?.conditions?.length)
        hints.push(...decision.conditions.map((w: any) => String(w)));
    }
  } catch {
    /* ignore OPA absence */
  }
  res.json({ hints });
});

// Copilot suggest (stub)
router.post('/pipelines/copilot/suggest', async (req, res) => {
  const prompt = String(req.body?.prompt || '');
  const suggestion = {
    name: 'Suggested Pipeline',
    spec: {
      nodes: [
        { id: 'source', type: 'ingest', config: { source: 'kb://docs' } },
        {
          id: 'transform',
          type: 'normalize',
          config: { policy: 'pii-redact' },
        },
        {
          id: 'analyze',
          type: 'llm',
          config: { model: 'gpt-4o', temperature: 0.2 },
        },
      ],
      edges: [
        { from: 'source', to: 'transform' },
        { from: 'transform', to: 'analyze' },
      ],
    },
    notes: [`Generated from: ${prompt.substring(0, 64)}`],
  };
  res.json(suggestion);
});

export default router;

import express from 'express';
import { z } from 'zod';
import { pipelinesRepo } from './pipelines-repo.js';
import { ensureAuthenticated } from '../../middleware/auth.js';
import { requirePermission } from '../../middleware/rbac.js';

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

router.get(
  '/pipelines',
  requirePermission('pipeline:read'),
  async (_req, res) => {
    const items = await pipelinesRepo.list();
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
    const created = await pipelinesRepo.create(
      parse.data.name,
      parse.data.spec,
    );
    res.status(201).json(created);
  },
);

router.get(
  '/pipelines/:id',
  requirePermission('pipeline:read'),
  async (req, res) => {
    const got = await pipelinesRepo.get(req.params.id);
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
    const upd = await pipelinesRepo.update(req.params.id, parse.data);
    if (!upd) return res.status(404).json({ error: 'not_found' });
    res.json(upd);
  },
);

router.delete(
  '/pipelines/:id',
  requirePermission('pipeline:update'),
  async (req, res) => {
    const ok = await pipelinesRepo.delete(req.params.id);
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

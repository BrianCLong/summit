import express from 'express';
import { ensureAuthenticated } from '../middleware/auth.js';
import { Orchestrator, InMemoryRunTraceStore } from '@intelgraph/orchestration';

const router = express.Router();
const runStore = new InMemoryRunTraceStore();
const orchestrator = new Orchestrator({ runStore });

const stepHandlers = {
  RETRIEVE: async (step: any) => ({ retrieved: step.inputs }),
  LLM: async (step: any) => `llm-output-${step.id}`,
  TRANSFORM: async (step: any) => ({ transformed: step.inputs }),
  TOOL: async (step: any) => ({ tool: step.id }),
  HUMAN_APPROVAL: async () => 'awaiting-approval',
} as any;

router.post('/plan', ensureAuthenticated, async (req, res) => {
  const { goal, evidence = [], budgetTokens = 400 } = req.body ?? {};
  const shaped = orchestrator.shapeContext({ query: goal, evidence, budgetTokens });
  const plan = orchestrator.plan({ goal }, { shapedContext: shaped.contextText, provenance: shaped.provenance });
  res.json({ plan, shaped });
});

router.post('/runs', ensureAuthenticated, async (req, res) => {
  const { plan, mode = 'HOTL' } = req.body ?? {};
  const result = await orchestrator.execute(plan, { mode }, stepHandlers);
  res.status(201).json(result);
});

router.get('/runs/:id', ensureAuthenticated, (req, res) => {
  const run = orchestrator.getRun(req.params.id);
  if (!run) return res.status(404).json({ error: 'not found' });
  return res.json(run);
});

router.post('/runs/:id/approve', ensureAuthenticated, async (req, res) => {
  const { stepId } = req.body;
  await orchestrator.approveStep(req.params.id, stepId, req.user?.sub ?? 'human');
  const run = orchestrator.getRun(req.params.id);
  res.json(run);
});

export default router;

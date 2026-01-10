import express from 'express';
import { ensureAuthenticated } from '../middleware/auth.js';
import { Orchestrator, InMemoryRunTraceStore, Step, StepHandlers } from '@intelgraph/orchestration';

const router = express.Router();
const runStore = new InMemoryRunTraceStore();
const orchestrator = new Orchestrator({ runStore });

const stepHandlers: StepHandlers = {
  RETRIEVE: async (step: Step) => ({ retrieved: step.inputs }),
  LLM: async (step: Step) => `llm-output-${step.id}`,
  TRANSFORM: async (step: Step) => ({ transformed: step.inputs }),
  TOOL: async (step: Step) => ({ tool: step.id }),
  HUMAN_APPROVAL: async () => 'awaiting-approval',
};

router.post('/plan', ensureAuthenticated, async (req, res) => {
  const { goal, evidence = [], budgetTokens = 400 } = req.body ?? {};
  if (!goal) return res.status(400).json({ error: 'goal required' });
  const shaped = orchestrator.shapeContext({ query: goal, evidence, budgetTokens });
  const plan = orchestrator.plan({ goal }, { shapedContext: shaped.contextText, provenance: shaped.provenance });
  res.json({ plan, shaped });
});

router.post('/runs', ensureAuthenticated, async (req, res) => {
  const { plan, mode = 'HOTL', planContext, guardrails } = req.body ?? {};
  const result = await orchestrator.execute(plan, { mode, planContext, guardrails }, stepHandlers);
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
  await orchestrator.resume(req.params.id, stepHandlers);
  const run = orchestrator.getRun(req.params.id);
  res.json(run);
});

export default router;

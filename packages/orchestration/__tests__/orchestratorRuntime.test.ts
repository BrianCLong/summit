import { Orchestrator } from '../src/orchestrator-runtime.js';
import { AllowAllPolicyDecisionProvider } from '../src/policy.js';
import { shapeContext } from '../src/context-shaping.js';
import { InMemoryRunTraceStore } from '../src/run-trace.js';
import { Step } from '../src/types.js';

describe('Orchestrator runtime', () => {
  const stepHandlers = {
    LLM: async (step: Step) => `llm:${step.id}`,
    TOOL: async (step: Step) => ({ tool: step.id }),
    RETRIEVE: async (step: Step) => ({ retrieved: step.inputs.query }),
    TRANSFORM: async (step: Step) => ({ normalized: step.inputs.context }),
    HUMAN_APPROVAL: async () => 'approved',
  } as any;

  it('builds a DAG plan and executes fan-out then join', async () => {
    const orchestrator = new Orchestrator({ policyProvider: new AllowAllPolicyDecisionProvider() });
    const shaped = shapeContext({
      query: 'Assess activity',
      evidence: [
        { id: 'a', text: 'Alpha signal', confidence: 0.9 },
        { id: 'b', text: 'Beta conflict indicator', confidence: 0.4 },
      ],
      budgetTokens: 400,
    });
    const plan = orchestrator.plan({ goal: 'Assess activity' }, { shapedContext: shaped.contextText, provenance: shaped.provenance });

    expect(plan.steps.map((s) => s.id)).toEqual(
      expect.arrayContaining([
        'retrieve-context',
        'fan-out-analysis',
        'fan-out-analysis-b',
        'resolve-conflicts',
        'final-synthesis',
      ]),
    );

    const result = await orchestrator.execute(plan, { mode: 'HOOTL', planContext: shaped }, stepHandlers);
    const completed = result.steps.filter((s) => s.status === 'completed');
    expect(completed.length).toBeGreaterThan(0);
    const fanOutOutputs = completed.filter((s) => s.stepId.startsWith('fan-out'));
    expect(fanOutOutputs.length).toBe(2);
  });

  it('requires approval when guardian returns require_approval', async () => {
    const provider = {
      beforeStep: async () => ({ action: 'require_approval', reason: 'manual gate' }),
    };
    const orchestrator = new Orchestrator({ policyProvider: provider as any });
    const shaped = shapeContext({ query: 'Approve me', evidence: [], budgetTokens: 100 });
    const plan = orchestrator.plan({ goal: 'Approve' }, { shapedContext: shaped.contextText, provenance: shaped.provenance });
    const result = await orchestrator.execute(plan, { mode: 'HITL' }, stepHandlers);

    expect(result.steps.some((s) => s.status === 'waiting_approval')).toBe(true);
    const firstAwaiting = result.steps.find((s) => s.status === 'waiting_approval');
    await orchestrator.approveStep(result.runId, firstAwaiting!.stepId, 'tester');
    const run = orchestrator.getRun(result.runId)!;
    expect(run.approvals[0]).toMatchObject({ approvedBy: 'tester', stepId: firstAwaiting!.stepId });
  });

  it('blocks risky execution when guardian decides to block', async () => {
    const provider = {
      beforeStep: async (step: Step) =>
        step.kind === 'TRANSFORM'
          ? { action: 'block', reason: 'unsafe transform' }
          : { action: 'allow' },
    };
    const runStore = new InMemoryRunTraceStore();
    const orchestrator = new Orchestrator({ policyProvider: provider as any, runStore });
    const shaped = shapeContext({ query: 'Block test', evidence: [], budgetTokens: 120 });
    const plan = orchestrator.plan({ goal: 'Block' }, { shapedContext: shaped.contextText, provenance: shaped.provenance });

    const result = await orchestrator.execute(plan, { mode: 'HOOTL' }, stepHandlers);
    const blockedStep = result.steps.find((s) => s.status === 'blocked');
    expect(blockedStep?.error).toContain('unsafe transform');

    const trace = runStore.get(result.runId);
    expect(trace?.policyDecisions.some((d) => d.decision === 'block')).toBe(true);
  });
});

describe('context shaping', () => {
  it('dedupes, trims, and preserves provenance', () => {
    const shaped = shapeContext({
      query: 'What happened?',
      evidence: [
        { id: '1', text: 'Signal A', confidence: 0.9 },
        { id: '2', text: 'Signal A', confidence: 0.8 },
        { id: '3', text: 'Conflict noted', confidence: 0.7 },
      ],
      budgetTokens: 50,
    });

    expect(shaped.contextText).toContain('Query: What happened?');
    expect(shaped.provenance).toEqual(expect.arrayContaining(['1', '3']));
    expect(shaped.conflicts.length).toBeGreaterThanOrEqual(0);
  });
});

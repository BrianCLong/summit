import { Maestro } from '../../src/maestro/core';
import { IntelGraphClientImpl } from '../../src/intelgraph/client';
import { CostMeter } from '../../src/maestro/cost_meter';
import { OpenAILLM } from '../../src/maestro/adapters/llm_openai';

describe('Maestro Core', () => {
  let maestro: Maestro;
  let ig: IntelGraphClientImpl;
  let costMeter: CostMeter;
  let llm: OpenAILLM;

  beforeEach(() => {
    ig = new IntelGraphClientImpl();
    costMeter = new CostMeter(ig, {
      'openai:gpt-4.1': { inputPer1K: 0.03, outputPer1K: 0.06 },
      'openai:gpt-4.1-mini': { inputPer1K: 0.01, outputPer1K: 0.02 },
    });
    llm = new OpenAILLM('test-key', costMeter);
    maestro = new Maestro(ig, costMeter, llm, {
      defaultPlannerAgent: 'openai:gpt-4.1',
      defaultActionAgent: 'openai:gpt-4.1-mini',
    });
  });

  it('should create a run', async () => {
    const run = await maestro.createRun('user-1', 'test request');
    expect(run.id).toBeDefined();
    expect(run.user.id).toBe('user-1');
    expect(run.requestText).toBe('test request');
  });

  it('should plan a request', async () => {
    const run = await maestro.createRun('user-1', 'test request');
    const tasks = await maestro.planRequest(run);
    expect(tasks).toHaveLength(2);
    expect(tasks[0].kind).toBe('plan');
    expect(tasks[1].kind).toBe('action');
    expect(tasks[1].parentTaskId).toBe(tasks[0].id);
  });

  it('should run a full pipeline', async () => {
    const result = await maestro.runPipeline('user-1', 'test request');
    expect(result.run).toBeDefined();
    expect(result.tasks).toHaveLength(2);
    expect(result.results).toHaveLength(1); // Only executable tasks (action)
    expect(result.results[0].task.status).toBe('succeeded');
    expect(result.results[0].artifact).toBeDefined();
    expect(result.costSummary).toBeDefined();
  });
});

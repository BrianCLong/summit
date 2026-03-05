import { AgentOrchestrator } from '../../summit/agents/orchestrator/agent-orchestrator.js';
import { hashInputs, hashOutputs } from '../../summit/agents/provenance/hash.js';
import type { Agent, AgentTask } from '../../summit/agents/types.js';

describe('orchestrator provenance', () => {
  it('hashing is stable across key order', () => {
    const inputsA = { b: 2, a: { z: 1, y: 2 } };
    const inputsB = { a: { y: 2, z: 1 }, b: 2 };

    expect(hashInputs(inputsA)).toBe(hashInputs(inputsB));
    expect(hashOutputs(inputsA)).toBe(hashOutputs(inputsB));
  });

  it('emits full event sequence for a simple run', async () => {
    process.env.NODE_ENV = 'test';

    const testAgent: Agent = {
      name: 'unit-agent',
      canHandle: () => true,
      async execute(task: AgentTask) {
        return {
          task_id: task.id,
          status: 'success',
          outputs: { ok: true },
          attempt: 1,
          started_at: '2026-01-01T00:00:01.000Z',
          finished_at: '2026-01-01T00:00:02.000Z',
        };
      },
    };

    const tasks: AgentTask[] = [
      {
        id: 'task-1',
        priority: 5,
        created_at: '2026-01-01T00:00:00.000Z',
        type: 'demo',
        inputs: { value: 1 },
      },
    ];

    const orchestrator = new AgentOrchestrator([testAgent]);
    const summary = await orchestrator.run(tasks);
    const types = orchestrator.getEvents().map((event) => event.type);

    expect(summary.run_id).toBeDefined();
    expect(types).toEqual([
      'RUN_STARTED',
      'TASK_ENQUEUED',
      'TASK_DEQUEUED',
      'AGENT_SELECTED',
      'AGENT_EXEC_STARTED',
      'AGENT_EXEC_FINISHED',
      'RUN_FINISHED',
    ]);
  });
});

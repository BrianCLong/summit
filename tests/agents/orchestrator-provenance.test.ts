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

    const timestamps = [
      '2026-01-01T00:00:00.000Z',
      '2026-01-01T00:00:00.010Z',
      '2026-01-01T00:00:00.020Z',
      '2026-01-01T00:00:00.030Z',
      '2026-01-01T00:00:00.040Z',
      '2026-01-01T00:00:00.050Z',
      '2026-01-01T00:00:00.060Z',
    ];

    const orchestrator = new AgentOrchestrator(
      [testAgent],
      undefined,
      {
        runId: () => 'run-fixed',
        now: () => timestamps.shift() ?? '2026-01-01T00:00:00.999Z',
      },
    );

    const summary = await orchestrator.run(tasks);
    const events = orchestrator.getEvents();
    const types = events.map((event) => event.type);

    expect(summary.run_id).toBe('run-fixed');
    expect(types).toEqual([
      'RUN_STARTED',
      'TASK_ENQUEUED',
      'TASK_DEQUEUED',
      'AGENT_SELECTED',
      'AGENT_EXEC_STARTED',
      'AGENT_EXEC_FINISHED',
      'RUN_FINISHED',
    ]);
    expect(events.every((event) => event.run_id === 'run-fixed')).toBe(true);
    expect(events[0].metadata.who).toBe('orchestrator');
  });
});

import { replayRun } from '../../summit/agents/replay/replay-run.js';
import type { AgentEvent } from '../../summit/agents/types.js';

const event = (
  type: AgentEvent['type'],
  task_id: string | null,
  metadata: Record<string, unknown> = {},
  agent_name: string | null = null,
): AgentEvent => ({
  run_id: 'run-1',
  task_id,
  agent_name,
  ts: '2026-01-01T00:00:00.000Z',
  type,
  inputs_hash: null,
  outputs_hash: null,
  attempt: 1,
  status: null,
  metadata,
});

describe('replayRun', () => {
  it('reconstructs plan and validates deterministic ordering', () => {
    const events: AgentEvent[] = [
      event('RUN_STARTED', null),
      event('TASK_ENQUEUED', 't2', { priority: 1, created_at: '2026-01-01T00:00:01.000Z' }),
      event('TASK_ENQUEUED', 't1', { priority: 2, created_at: '2026-01-01T00:00:02.000Z' }),
      event('TASK_DEQUEUED', 't1'),
      event('AGENT_SELECTED', 't1', {}, 'agent-a'),
      event('TASK_DEQUEUED', 't2'),
      event('AGENT_SELECTED', 't2', {}, 'agent-b'),
      event('RUN_FINISHED', null),
    ];

    const jsonl = events.map((entry) => JSON.stringify(entry)).join('\n');
    const report = replayRun(jsonl);

    expect(report.divergence).toHaveLength(0);
    expect(report.plan).toEqual([
      { task_id: 't1', agent_name: 'agent-a' },
      { task_id: 't2', agent_name: 'agent-b' },
    ]);
  });

  it('detects ordering divergence if events are shuffled', () => {
    const events: AgentEvent[] = [
      event('TASK_ENQUEUED', 't1', { priority: 10, created_at: '2026-01-01T00:00:00.000Z' }),
      event('TASK_ENQUEUED', 't2', { priority: 1, created_at: '2026-01-01T00:00:00.000Z' }),
      event('TASK_DEQUEUED', 't2'),
      event('TASK_DEQUEUED', 't1'),
    ];

    const report = replayRun(events.map((entry) => JSON.stringify(entry)).join('\n'));

    expect(report.divergence[0]).toContain('Ordering divergence');
  });
});

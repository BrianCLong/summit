import { replayRun } from '../../summit/agents/replay/replay-run.js';
import type { AgentEvent } from '../../summit/agents/types.js';

const event = (
  type: AgentEvent['type'],
  task_id: string | null,
  metadata: Record<string, unknown> = {},
  agent_name: string | null = null,
  run_id = 'run-1',
): AgentEvent => ({
  run_id,
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

    expect(report.run_id).toBe('run-1');
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

  it('reports parse errors and run-id divergence', () => {
    const jsonl = [
      JSON.stringify(event('RUN_STARTED', null, {}, null, 'run-a')),
      'not-json',
      JSON.stringify(event('RUN_FINISHED', null, {}, null, 'run-b')),
    ].join('\n');

    const report = replayRun(jsonl);

    expect(report.run_id).toBeNull();
    expect(report.divergence.some((entry) => entry.includes('Invalid JSONL'))).toBe(true);
    expect(report.divergence.some((entry) => entry.includes('Run ID divergence'))).toBe(true);
  });
});

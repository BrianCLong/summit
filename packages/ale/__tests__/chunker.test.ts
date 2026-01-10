import { chunkTrajectory } from '../src/chunker.js';
import { TrajectoryStep } from '../src/types.js';

describe('Semantic Interaction Chunker', () => {
  const baseTs = Date.parse('2024-01-01T00:00:00Z');
  const step = (offset: number, overrides: Partial<TrajectoryStep>): TrajectoryStep => ({
    ts: baseTs + offset,
    role: 'assistant',
    kind: 'message',
    ...overrides,
  });

  it('creates chunks around tool invocations and boundaries', () => {
    const steps: TrajectoryStep[] = [
      step(0, { role: 'user', kind: 'message', input: 'Do X' }),
      step(1000, { kind: 'tool_invocation', name: 'shell', input: 'ls' }),
      step(2000, { kind: 'tool_result', name: 'shell', output: 'file' }),
      step(15000, { kind: 'message', output: 'done', metadata: { user_visible: true } }),
      step(30000, { kind: 'final' }),
    ];

    const chunks = chunkTrajectory(steps, { idleBoundarySeconds: 5 });
    expect(chunks).toHaveLength(4);
    expect(chunks[0].step_start).toBe(0);
    expect(chunks[1].tools_used).toContain('shell');
    expect(chunks[3].success_signal).toBe(true);
  });
});

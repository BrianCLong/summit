import fs from 'fs';
import os from 'os';
import path from 'path';
import { readTrajectory, TrajectoryRecorder } from '../src/trajectory.js';
import { trajectoryStepSchema } from '../src/types.js';

describe('Trajectory JSONL', () => {
  it('roundtrips header and steps', async () => {
    const filePath = path.join(os.tmpdir(), 'trajectory-roundtrip.jsonl');
    const recorder = new TrajectoryRecorder({ filePath, header: { agent_id: 'test-agent' } });
    const header = await recorder.init();
    await recorder.recordStep({
      ts: header.start_ts,
      role: 'user',
      kind: 'message',
      input: 'hello',
    });
    await recorder.recordStep({
      ts: Date.now(),
      role: 'assistant',
      kind: 'message',
      output: 'world',
    });

    const trajectory = await readTrajectory(filePath);
    expect(trajectory.header.agent_id).toBe('test-agent');
    expect(trajectory.steps).toHaveLength(2);
    expect(trajectory.steps[0].role).toBe('user');
  });

  it('fails validation on invalid step', async () => {
    const parse = trajectoryStepSchema.safeParse({ ts: 'now', role: 'user', kind: 'not-a-kind' });
    expect(parse.success).toBe(false);
  });
});

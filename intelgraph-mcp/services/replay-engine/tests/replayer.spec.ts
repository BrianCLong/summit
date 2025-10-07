import { describe, it, expect } from 'vitest';
import { Replayer } from '../src/replayer';
import { Recorder } from '../src/recorder';

describe('Replayer', () => {
  it('replays a trivial recording', () => {
    const rec = new Recorder().start('sess1', 'seed');
    const out = new Replayer().replay(rec);
    expect(out.sessionId).toBe('sess1');
  });
});

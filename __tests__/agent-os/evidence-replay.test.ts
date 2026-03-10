import { describe, it, expect } from 'vitest';
import { ReplayIndex } from '../../audit/agent-os/replay-index';

describe('Evidence Replay Index', () => {
  it('adds and verifies records', () => {
    const index = new ReplayIndex();
    index.addRecord({ runId: 'r1', timestamp: 1, bundleUrl: 's3://x' });
    expect(index.getRecords()[0].isVerified).toBe(false);

    index.verifyAll();
    expect(index.getRecords()[0].isVerified).toBe(true);
  });
});

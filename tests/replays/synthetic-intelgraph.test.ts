import { describe, expect, it } from 'vitest';

import { runReplay } from '../../scripts/testing/run-replay.js';

describe('replay promotion - intelgraph sandbox', () => {
  it('classifies the synthetic write query as a persisted failure', async () => {
    const result = await runReplay('replays/intelgraph/synthetic-known-fail.json');
    expect(result.status).toBe('FAIL');
  });
});

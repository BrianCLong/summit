import { mkdtempSync, rmSync } from 'node:fs';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import { describe, expect, test } from 'vitest';
import { runWorkflowSpec } from '../../src/workflows/runner';

describe('connector policy deny-by-default', () => {
  test('blocks live mode when network deny', () => {
    const outRoot = mkdtempSync(join(tmpdir(), 'mws-policy-'));
    const bundle = runWorkflowSpec(
      {
        inputs: { case_id: 'mws_case1' },
        evidence: { evid_prefix: 'EVID', out_dir: outRoot },
        policy: { network: 'deny', connectors: { allowlist: [] } },
        steps: [{ id: 'live_reverse', type: 'reverse_image', mode: 'live', connector: 'reverse_image' }],
      },
      '20260226',
    );

    expect(bundle.steps[0].status).toBe('blocked');
    expect(bundle.steps[0].reason).toContain('policy.network=deny');
    rmSync(outRoot, { recursive: true, force: true });
  });
});

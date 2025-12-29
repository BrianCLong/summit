import { diffPolicies, evaluateOperation, loadPolicies, snapshotPolicy } from '../src/policy-engine';

describe('policy evaluation', () => {
  const config = loadPolicies();

  it('denies dangerous operations with reason', () => {
    const result = evaluateOperation('dangerousOp', config);
    expect(result.allowed).toBe(false);
    expect(result.reason).toContain('Denied');
  });

  it('allows query operations', () => {
    const result = evaluateOperation('query accounts', config);
    expect(result.allowed).toBe(true);
  });

  it('produces stable snapshots and diffs', () => {
    const snap = snapshotPolicy(config);
    const diff = diffPolicies(config, config);
    expect(snap).toContain('policies');
    expect(diff).toBe('no-change');
  });
});

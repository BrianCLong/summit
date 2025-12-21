import path from 'path';
import { diffPolicies, evaluate, loadPolicy } from '../src/policy-engine';

describe('policy engine', () => {
  const allowPath = path.join(__dirname, '..', 'policies', 'examples', 'allow-read-low.json');
  const denyPath = path.join(__dirname, '..', 'policies', 'examples', 'deny-export-no-purpose.json');
  const allowPolicy = loadPolicy(allowPath);
  const denyPolicy = loadPolicy(denyPath);

  it('allows read under S2', () => {
    const decision = evaluate(allowPolicy, { action: 'graph:read', resource: 'node:abc', attributes: { sensitivity: 'S1', labels: ['public'] } });
    expect(decision.allowed).toBe(true);
    expect(decision.reason).toMatch(/Read allowed/);
  });

  it('denies export without purpose match', () => {
    const decision = evaluate(denyPolicy, { action: 'export:bundle', resource: 'case:1', attributes: { purpose: 'internal' } });
    expect(decision.allowed).toBe(false);
    expect(decision.reason).toMatch(/requires declared audience/);
    expect(decision.matchedRuleId).toBe('deny-export-missing-purpose');
  });

  it('detects added and removed rules', () => {
    const combined = { version: 'v1', rules: [...allowPolicy.rules, ...denyPolicy.rules] };
    const diff = diffPolicies(allowPolicy, combined);
    expect(diff.added).toContain('deny-export-missing-purpose');
    expect(diff.removed).toEqual([]);
  });
});

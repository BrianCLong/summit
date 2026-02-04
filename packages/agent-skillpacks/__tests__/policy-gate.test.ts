import { evaluatePolicy } from '../src/policy-gate';
import { type PolicyConfig } from '../src/types';

test('ci denies tools without allowlist', () => {
  const policy: PolicyConfig = {};
  const decision = evaluatePolicy('mcp.secret.dump', policy, 'ci');
  expect(decision.allowed).toBe(false);
  expect(decision.reason).toContain('CI default deny');
});

test('break-glass waiver allows denied tools', () => {
  const policy: PolicyConfig = {
    deny: ['mcp.secret.*'],
    breakGlass: [
      {
        tool: 'mcp.secret.dump',
        reason: 'Incident response',
        expiresAt: '2999-01-01T00:00:00Z',
        approvedBy: 'security-council',
      },
    ],
  };
  const decision = evaluatePolicy('mcp.secret.dump', policy, 'pr');
  expect(decision.allowed).toBe(true);
  expect(decision.reason).toContain('Governed Exception');
});

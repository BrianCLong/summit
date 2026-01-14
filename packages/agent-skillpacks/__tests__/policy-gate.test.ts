import { evaluateToolAccess } from '../src/policy-gate.js';

describe('policy gate', () => {
  it('denies tools in CI without allowlist', () => {
    const decision = evaluateToolAccess({
      toolName: 'unsafe-tool',
      policy: { defaultBehavior: 'deny' },
      environment: 'ci',
    });
    expect(decision.allowed).toBe(false);
    expect(decision.reason).toMatch(/CI default deny/);
  });

  it('permits break-glass waivers in CI', () => {
    const decision = evaluateToolAccess({
      toolName: 'danger-tool',
      policy: {
        defaultBehavior: 'deny',
        breakGlass: {
          waivers: [
            {
              id: 'waiver-1',
              toolPattern: 'danger-*',
              expiresAt: '2999-01-01T00:00:00Z',
              issuedBy: 'security-council',
              reason: 'Controlled exception',
            },
          ],
        },
      },
      environment: 'ci',
    });
    expect(decision.allowed).toBe(true);
    expect(decision.waiverId).toBe('waiver-1');
  });
});

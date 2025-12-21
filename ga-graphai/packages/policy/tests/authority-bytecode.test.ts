import { describe, expect, it } from 'vitest';
import type { PolicyObligation } from 'common-types';
import { AuthorityBytecodeEngine } from '../src/authority-bytecode.js';
import type { OpaGuard } from '../src/authority-compiler.js';

const obligations: PolicyObligation[] = [
  { type: 'emit-audit' },
  { type: 'require-justification' },
];

const guards: OpaGuard[] = [
  {
    id: 'ingest-analyst',
    effect: 'allow',
    selector: {
      actions: ['ingest:create'],
      resources: ['dataset'],
      authorities: ['analyst'],
      licenses: ['MIT'],
    },
    obligations,
    rule: 'ingest_guard',
    package: 'policy.guard',
    query: 'input.action == "ingest:create"',
    licenseVerdicts: [],
    reason: 'Analysts may ingest MIT data when justified.',
  },
  {
    id: 'deny-unknown-license',
    effect: 'deny',
    selector: {
      actions: ['ingest:create'],
      resources: ['dataset'],
      authorities: ['analyst'],
      licenses: ['GPL-3.0'],
    },
    obligations: [{ type: 'emit-audit' }],
    rule: 'deny_guard',
    package: 'policy.guard',
    query: 'input.license == "GPL-3.0"',
    licenseVerdicts: [{ license: 'GPL-3.0', status: 'deny' }],
    reason: 'GPL payloads blocked',
  },
];

describe('AuthorityBytecodeEngine', () => {
  it('denies by default when no guard matches', () => {
    const engine = new AuthorityBytecodeEngine(guards);
    const decision = engine.authorize({
      actor: 'alice',
      action: 'graph:read',
      resource: 'graph',
      roles: ['viewer'],
    });

    expect(decision.decision).toBe('deny');
    expect(decision.appealLink).toContain('no-policy');
  });

  it('enforces justification obligations deterministically', () => {
    const engine = new AuthorityBytecodeEngine(guards, 'https://appeals.test');
    const denied = engine.authorize({
      actor: 'bob',
      action: 'ingest:create',
      resource: 'dataset',
      roles: ['analyst'],
      license: 'MIT',
    });

    const allowed = engine.authorize({
      actor: 'bob',
      action: 'ingest:create',
      resource: 'dataset',
      roles: ['analyst'],
      license: 'MIT',
      justification: 'Case-123 justification',
    });

    expect(denied.decision).toBe('deny');
    expect(denied.obligations.some((ob) => ob.type === 'require-justification')).toBe(
      true,
    );
    expect(allowed.decision).toBe('allow');
    expect(allowed.auditHash).toEqual(
      engine.authorize({
        actor: 'bob',
        action: 'ingest:create',
        resource: 'dataset',
        roles: ['analyst'],
        license: 'MIT',
        justification: 'Case-123 justification',
      }).auditHash,
    );
    expect(allowed.appealLink).toContain('ingest-analyst');
  });

  it('honors deny effects before obligations when license is unsafe', () => {
    const engine = new AuthorityBytecodeEngine(guards);
    const decision = engine.authorize({
      actor: 'carol',
      action: 'ingest:create',
      resource: 'dataset',
      roles: ['analyst'],
      license: 'GPL-3.0',
      justification: 'emergency override',
    });

    expect(decision.decision).toBe('deny');
    expect(decision.reason).toContain('GPL');
  });
});

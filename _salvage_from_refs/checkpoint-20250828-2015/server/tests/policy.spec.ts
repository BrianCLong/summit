import { PolicyEngine } from '../src/security/policy';

describe('PolicyEngine', () => {
  const mockSubject = { id: 'u1', roles: ['analyst'], attrs: { tenantId: 't1' } };
  const mockResource = { type: 'case', id: 'c1', ownerId: 'u1', tenantId: 't1', attrs: {} };

  test('should deny cross-tenant access', () => {
    const pe = new PolicyEngine([
      { id: 'deny-non-tenant', effect: 'deny', when: { conditions: [{ key: 'subject.attrs.tenantId', op: 'neq', value: { ref: 'resource.tenantId' } as any }] }, reason: 'Cross-tenant access blocked' },
      { id: 'allow-admin', effect: 'allow', when: { roles: ['admin'] } },
    ]);
    const decision = pe.evaluate({
      subject: { ...mockSubject, attrs: { tenantId: 't2' } },
      action: 'read',
      resource: mockResource,
    });
    expect(decision.allowed).toBe(false);
    expect(decision.reason).toBe('Cross-tenant access blocked');
  });

  test('should allow admin full access', () => {
    const pe = new PolicyEngine([
      { id: 'allow-admin', effect: 'allow', when: { roles: ['admin'] } },
      { id: 'deny-all', effect: 'deny', when: {} },
    ]);
    const decision = pe.evaluate({
      subject: { ...mockSubject, roles: ['admin'] },
      action: 'delete',
      resource: mockResource,
    });
    expect(decision.allowed).toBe(true);
  });

  test('should allow owner analyst to read/update their case', () => {
    const pe = new PolicyEngine([
      { id: 'allow-owner-analyst', effect: 'allow', when: { roles: ['analyst'], actions: ['read', 'update'], resourceTypes: ['case'], conditions: [{ key: 'resource.ownerId', op: 'eq', value: { ref: 'subject.id' } as any }] } },
      { id: 'deny-all', effect: 'deny', when: {} },
    ]);
    const decision = pe.evaluate({
      subject: mockSubject,
      action: 'read',
      resource: mockResource,
    });
    expect(decision.allowed).toBe(true);

    const updateDecision = pe.evaluate({
      subject: mockSubject,
      action: 'update',
      resource: mockResource,
    });
    expect(updateDecision.allowed).toBe(true);
  });

  test('should deny non-owner analyst to update case', () => {
    const pe = new PolicyEngine([
      { id: 'allow-owner-analyst', effect: 'allow', when: { roles: ['analyst'], actions: ['read', 'update'], resourceTypes: ['case'], conditions: [{ key: 'resource.ownerId', op: 'eq', value: { ref: 'subject.id' } as any }] } },
      { id: 'deny-all', effect: 'deny', when: {} },
    ]);
    const decision = pe.evaluate({
      subject: { ...mockSubject, id: 'u2' }, // Different user
      action: 'update',
      resource: mockResource,
    });
    expect(decision.allowed).toBe(false);
    expect(decision.reason).toBe('No matching allow policy');
  });

  test('should deny if no matching allow policy', () => {
    const pe = new PolicyEngine([
      { id: 'deny-all', effect: 'deny', when: {} },
    ]);
    const decision = pe.evaluate({
      subject: mockSubject,
      action: 'unknown',
      resource: mockResource,
    });
    expect(decision.allowed).toBe(false);
    expect(decision.reason).toBe('No matching allow policy');
  });

  test('should handle complex conditions (gte/lte)', () => {
    const pe = new PolicyEngine([
      { id: 'allow-high-priority', effect: 'allow', when: { resourceTypes: ['task'], conditions: [{ key: 'resource.attrs.priority', op: 'gte', value: 8 }] } },
      { id: 'deny-all', effect: 'deny', when: {} },
    ]);
    const decision = pe.evaluate({
      subject: mockSubject,
      action: 'complete',
      resource: { type: 'task', id: 't1', tenantId: 't1', attrs: { priority: 9 } },
    });
    expect(decision.allowed).toBe(true);

    const lowPriorityDecision = pe.evaluate({
      subject: mockSubject,
      action: 'complete',
      resource: { type: 'task', id: 't2', tenantId: 't1', attrs: { priority: 5 } },
    });
    expect(lowPriorityDecision.allowed).toBe(false);
  });

  test('should deny cross-tenant access even with admin role if resource tenantId does not match', () => {
    const pe = new PolicyEngine(defaultRules); // Use defaultRules which includes deny-non-tenant
    const decision = pe.evaluate({
      subject: { id: 'admin1', roles: ['admin'], attrs: { tenantId: 't1' } },
      action: 'read',
      resource: { type: 'case', id: 'c1', ownerId: 'u1', tenantId: 't2', attrs: {} }, // Resource in different tenant
    });
    expect(decision.allowed).toBe(false);
    expect(decision.reason).toBe('Cross-tenant access blocked');
  });
});

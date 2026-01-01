
import { describe, it, expect, beforeEach } from '@jest/globals';
import { PolicyCompiler } from '../../src/policy/compiler.js';
import { Authority, License, PolicyType } from '../../src/policy/types.js';

describe('PolicyCompiler', () => {
  let compiler: PolicyCompiler;

  beforeEach(() => {
    compiler = PolicyCompiler.getInstance();
  });

  const mockAuthority: Authority = {
    id: 'Auth-1',
    name: 'Auth One',
    type: PolicyType.AUTHORITY,
    jurisdiction: 'US',
    issuer: 'Court',
    clauses: [{ id: 'C1', text: 'Search allowed' }],
    selectors: [{ type: 'entity', value: 'Person', allow: true }],
    retention: 'forever',
    effectiveFrom: new Date('2023-01-01')
  };

  const mockLicense: License = {
    id: 'Lic-1',
    name: 'Lic One',
    type: PolicyType.LICENSE,
    jurisdiction: 'Internal',
    licensor: 'Legal',
    clauses: [],
    selectors: [],
    retention: 'P30D',
    effectiveFrom: new Date('2023-01-01'),
    grants: ['read'],
    revocations: ['export']
  };

  it('should compile deterministic IR hash', () => {
    const ir1 = compiler.compile([mockAuthority]);
    const ir2 = compiler.compile([mockAuthority]);

    expect(ir1.hash).toBe(ir2.hash);
    expect(ir1.activePolicies).toContain('Auth-1');
  });

  it('should enforce retention limit (shortest wins)', () => {
    const ir = compiler.compile([mockAuthority, mockLicense]);
    // mockAuthority is forever (-1), mockLicense is P30D (30 days)
    // 30 days in seconds = 30 * 24 * 3600 = 2592000
    expect(ir.retentionLimit).toBe(2592000);
  });

  it('should flag export denial', () => {
    const ir = compiler.compile([mockLicense]);
    expect(ir.exportAllowed).toBe(false);
  });

  it('should aggregate denied selectors', () => {
    const authWithDeny: Authority = {
        ...mockAuthority,
        id: 'Auth-Deny',
        selectors: [{ type: 'source', value: 'bad-source', allow: false }]
    };
    const ir = compiler.compile([authWithDeny]);
    expect(ir.deniedSelectors).toContain('source:bad-source');
  });
});

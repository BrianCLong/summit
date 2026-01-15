
import { jest, describe, it, expect, beforeEach, afterEach, beforeAll, afterAll } from '@jest/globals';
import { PolicyCompiler } from '../PolicyCompiler.js';
import { EnforcementService } from '../EnforcementService.js';
import { SimulationService } from '../SimulationService.js';
import { PolicySpec, SensitivityClass, EnforcementDecision, RuntimeContext } from '../types.js';

describe('PolicyCompiler & Enforcement', () => {
  const compiler = PolicyCompiler.getInstance();
  const enforcement = EnforcementService.getInstance();

  const testPolicy: PolicySpec = {
    version: '1.0.0',
    tenantId: 'tenant-123',
    defaultSensitivity: SensitivityClass.INTERNAL,
    authorityRequiredFor: [
      {
        action: 'query:sensitive-graph',
        sensitivity: SensitivityClass.HIGHLY_SENSITIVE,
        authorityType: 'WARRANT'
      },
      // Duplicate action to test merging
      {
        action: 'query:sensitive-graph',
        sensitivity: SensitivityClass.HIGHLY_SENSITIVE,
        authorityType: 'CONSENT'
      }
    ],
    licenseConstraints: [
      {
        source: 'twitter',
        allowedActions: ['read'],
        forbiddenActions: ['export'],
        attributionRequired: true
      }
    ],
    purposeTags: [
      {
        tag: 'marketing',
        allowedUses: ['query:public', 'export:report'], // Does NOT allow query:sensitive-graph
        requiresApproval: false
      }
    ],
    retentionRules: [
        {
            dataType: 'log:audit',
            retentionDays: 365,
            sensitivity: SensitivityClass.HIGHLY_SENSITIVE
        }
    ]
  };

  it('should compile a policy deterministically', () => {
    const plan1 = compiler.compile(testPolicy);
    const plan2 = compiler.compile(testPolicy);

    expect(plan1.planHash).toBe(plan2.planHash);
    expect(plan1.queryRules['query:sensitive-graph']).toBeDefined();
    // Verify merging: should have 2 conditions
    expect(plan1.queryRules['query:sensitive-graph'].conditions).toHaveLength(2);
  });

  it('should enforce authority requirements (merged)', () => {
    enforcement.loadPolicy(testPolicy);

    const context: RuntimeContext = {
      user: { id: 'u1', roles: ['analyst'], clearanceLevel: 5 },
      action: { type: 'query', target: 'query:sensitive-graph' },
      activeAuthority: ['WARRANT']
    };

    // Needs BOTH Warrant AND Consent because we merged them?
    // Implementation of merge appends conditions. Logic checks ALL conditions.
    // So yes, it requires BOTH.

    let result = enforcement.evaluateQuery(context);
    expect(result.allowed).toBe(false); // Missing CONSENT
    expect(result.reason?.code).toBe('MISSING_AUTHORITY');

    context.activeAuthority = ['WARRANT', 'CONSENT'];
    result = enforcement.evaluateQuery(context);
    expect(result.allowed).toBe(true);
  });

  it('should enforce license export restrictions', () => {
    enforcement.loadPolicy(testPolicy);

    const context: RuntimeContext = {
      user: { id: 'u1', roles: ['analyst'], clearanceLevel: 5 },
      action: { type: 'export', target: 'source:twitter' },
    };

    const result = enforcement.evaluateExport(context);
    expect(result.allowed).toBe(false);
    expect(result.reason?.code).toBe('LICENSE_RESTRICTION');
  });

  it('should enforce purpose constraints', () => {
    enforcement.loadPolicy(testPolicy);

    const context: RuntimeContext = {
        user: { id: 'u1', roles: ['analyst'], clearanceLevel: 5 },
        action: { type: 'query', target: 'query:sensitive-graph' },
        activeAuthority: ['WARRANT', 'CONSENT'],
        purpose: 'marketing'
    };

    // 'marketing' allowedUses does not include 'query:sensitive-graph'
    const result = enforcement.evaluateQuery(context);
    expect(result.allowed).toBe(false);
    expect(result.reason?.code).toBe('PURPOSE_MISMATCH');

    // Change action to allowed one
    context.action.target = 'query:public';
    // query:public has no authority requirements, so it falls through to ALLOW
    // Purpose check passes.
    const result2 = enforcement.evaluateQuery(context);
    expect(result2.allowed).toBe(true);
  });

  it('should generate retention filters', () => {
      enforcement.loadPolicy(testPolicy);
      const context: RuntimeContext = {
        user: { id: 'u1', roles: ['analyst'], clearanceLevel: 5 },
        action: { type: 'query', target: 'log:audit' },
      };

      const result = enforcement.evaluateQuery(context);
      expect(result.allowed).toBe(true);
      expect(result.modifications?.filterClauses).toContain('age_in_days <= 365');
  });

  it('should simulate policy against historical events', async () => {
    const simulation = new SimulationService();
    const historicalEvents = [
      {
        id: 'evt-1',
        context: {
          user: { id: 'u1', roles: ['analyst'], clearanceLevel: 5 },
          action: { type: 'query' as const, target: 'query:sensitive-graph' },
          activeAuthority: [] as string[]
        },
        originalOutcome: true // Was allowed in the past
      },
      {
        id: 'evt-2',
        context: {
          user: { id: 'u1', roles: ['analyst'], clearanceLevel: 5 },
          action: { type: 'export' as const, target: 'source:twitter' },
        },
        originalOutcome: true // Was allowed in the past
      }
    ];

    const report = await simulation.simulate(testPolicy, historicalEvents);

    expect(report.totalEvents).toBe(2);
    expect(report.allowed).toBe(0);
    expect(report.denied).toBe(2);
  });
});

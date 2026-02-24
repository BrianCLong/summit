import { jest, describe, it, expect, beforeEach, afterEach, beforeAll, afterAll } from '@jest/globals';
import { assertIndexUsage, collectSeqScans } from '../plan-inspector';

describe('plan-inspector', () => {
  it('detects sequential scans', () => {
    const plan = {
      'Node Type': 'Seq Scan',
      'Relation Name': 'cases',
    } as any;

    expect(collectSeqScans(plan)).toEqual(['cases']);
  });

  it('validates expected index usage', () => {
    const plan = {
      'Node Type': 'Index Scan',
      'Relation Name': 'cases',
      'Index Name': 'idx_cases_tenant_case',
      Plans: [
        {
          'Node Type': 'Index Scan',
          'Relation Name': 'audit_access_logs',
          'Index Name': 'idx_audit_access_logs_tenant_case',
        },
      ],
    } as any;

    expect(() =>
      assertIndexUsage(plan, [
        { relation: 'cases', index: 'idx_cases_tenant_case' },
        {
          relation: 'audit_access_logs',
          index: 'idx_audit_access_logs_tenant_case',
        },
      ]),
    ).not.toThrow();
  });

  it('fails when expected index is missing', () => {
    const plan = {
      'Node Type': 'Index Scan',
      'Relation Name': 'cases',
      'Index Name': 'idx_cases_tenant_case',
    } as any;

    expect(() =>
      assertIndexUsage(plan, [
        { relation: 'cases', index: 'idx_cases_tenant_case' },
        { relation: 'audit_access_logs', index: 'idx_audit_access_logs_tenant_case' },
      ]),
    ).toThrow('Index guardrail failure');
  });
});

import { describe, expect, it } from 'vitest';
import {
  BudgetGuardrail,
  LedgerBuilder,
  TaggingPolicyEnforcer,
  KillSwitchOrchestrator,
  TelemetryPolicyEngine,
  VendorRegister,
} from '../src/index.js';

const now = new Date('2025-02-01T00:00:00Z');

describe('TaggingPolicyEnforcer', () => {
  it('validates required tags and TTL for non-prod', () => {
    const enforcer = new TaggingPolicyEnforcer();
    const result = enforcer.validate({
      id: 'svc-1',
      tags: {
        service: 'search',
        team: 'core',
        tenant: 'global',
        tier: '1',
        env: 'staging',
        budget_owner: 'ops',
        kill_switch_id: 'ks-search',
        ledger_account: 'ledger-01',
      },
      annotations: { ttlHours: 8 },
    });

    expect(result.isValid).toBe(true);
    expect(result.missing).toHaveLength(0);
    expect(result.expiresAt).toBeInstanceOf(Date);
  });

  it('flags missing tags and TTL breaches', () => {
    const enforcer = new TaggingPolicyEnforcer();
    const result = enforcer.validate({
      id: 'svc-2',
      tags: { service: 'ingest', env: 'dev' },
    });

    expect(result.isValid).toBe(false);
    expect(result.missing).toContain('team');
    expect(result.violations).toContain('non-prod resources require a TTL');
  });
});

describe('BudgetGuardrail', () => {
  it('escalates alerts at configured thresholds', () => {
    const guardrail = new BudgetGuardrail();
    const alert = guardrail.evaluate(
      { domainId: 'analytics', monthlyBudgetUsd: 10000, owner: 'finops' },
      { actualMonthToDateUsd: 8200, projectedMonthToDateUsd: 10200 },
    );

    expect(alert.threshold).toBe('100');
    expect(alert.action).toBe('freeze');
    expect(alert.freezeRequired).toBe(true);
    expect(alert.message).toContain('Budget breach detected');
  });
});

describe('LedgerBuilder', () => {
  it('generates ledger entries and top movers with deltas', () => {
    const builder = new LedgerBuilder();
    const ledger = builder.generate({
      currentWeekCosts: [
        { domainId: 'ai', resourceId: 'svc-a', amountUsd: 1200, owner: 'team-a' },
        { domainId: 'ai', resourceId: 'svc-b', amountUsd: 300, owner: 'team-b' },
      ],
      previousWeekCosts: [
        { domainId: 'ai', resourceId: 'svc-a', amountUsd: 600 },
      ],
      topN: 2,
      notes: ['weekly ledger'],
    });

    expect(ledger.entries[0].deltaUsd).toBeGreaterThan(0);
    expect(ledger.topMovers).toHaveLength(2);
    expect(ledger.topMovers[0].resourceId).toBe('svc-a');
  });
});

describe('KillSwitchOrchestrator', () => {
  it('identifies kill switches due for validation', () => {
    const orchestrator = new KillSwitchOrchestrator();
    const validation = orchestrator.validate(
      [
        {
          id: 'ks-a',
          owner: 'platform',
          description: 'Kill expensive join',
          tier: '0',
          lastTestedAt: new Date('2025-01-25T00:00:00Z'),
          testIntervalHours: 72,
        },
        {
          id: 'ks-b',
          owner: 'platform',
          description: 'Disable heavy batch',
          tier: '1',
          lastTestedAt: new Date('2025-01-31T00:00:00Z'),
          testIntervalHours: 240,
        },
      ],
      now,
    );

    expect(validation.dueForTest.map((item) => item.id)).toContain('ks-a');
    expect(validation.healthy.map((item) => item.id)).toContain('ks-b');
    expect(validation.message).toContain('Run kill-switch validation');
  });
});

describe('TelemetryPolicyEngine', () => {
  it('enforces retention and sampling per environment', () => {
    const engine = new TelemetryPolicyEngine({ allowUnstructuredLogs: false });
    const decision = engine.evaluate({
      service: 'api',
      team: 'backend',
      tenant: 'global',
      tier: '0',
      env: 'prod',
      budget_owner: 'finops',
      kill_switch_id: 'ks-api',
      ledger_account: 'ledger-02',
    });

    expect(decision.retentionDays).toBeGreaterThan(7);
    expect(decision.traceSample).toBe(1);
    expect(decision.violations).toContain('unstructured logs disallowed in prod');
  });
});

describe('VendorRegister', () => {
  it('prioritizes under-utilized or overlapping vendors for renegotiation', () => {
    const register = new VendorRegister();
    const recommendations = register.recommendRenegotiation([
      {
        vendor: 'ObservaCorp',
        owner: 'security',
        monthlyCostUsd: 4200,
        renewalDate: new Date(now.getTime() + 20 * 24 * 60 * 60 * 1000),
        utilizationRatio: 0.4,
        overlapCategory: 'observability',
      },
      {
        vendor: 'QueueMaster',
        owner: 'platform',
        monthlyCostUsd: 3100,
        renewalDate: new Date(now.getTime() + 120 * 24 * 60 * 60 * 1000),
        utilizationRatio: 0.9,
      },
    ]);

    expect(recommendations[0].vendor).toBe('ObservaCorp');
    expect(recommendations[0].recommendation).toBe('renegotiate');
    expect(recommendations[0].rationale).toContain('utilization');
  });
});

import { describe, expect, it } from 'vitest';
import type { PolicyRule } from 'common-types';
import {
  PolicyBacktestEngine,
  type PolicyHistory,
  type HistoricalPolicyEvent,
} from '../src/index.ts';

const allowAnalystReadV1: PolicyRule = {
  id: 'allow-analyst-read',
  description: 'Allow analysts to read analytics data',
  effect: 'allow',
  actions: ['report:read'],
  resources: ['analytics'],
  conditions: [
    { attribute: 'roles', operator: 'includes', value: ['analyst'] },
  ],
  obligations: [{ type: 'record-provenance' }],
};

const allowAnalystReadV11: PolicyRule = {
  ...allowAnalystReadV1,
  conditions: [
    { attribute: 'roles', operator: 'includes', value: ['analyst'] },
    { attribute: 'region', operator: 'eq', value: 'us-east-1' },
  ],
};

const denyContractorRule: PolicyRule = {
  id: 'deny-contractors',
  description: 'Block contractor access after hardening',
  effect: 'deny',
  actions: ['report:read'],
  resources: ['analytics'],
  conditions: [
    { attribute: 'roles', operator: 'includes', value: ['contractor'] },
  ],
};

const history: PolicyHistory[] = [
  {
    policyId: 'governance',
    snapshots: [
      {
        policyId: 'governance',
        version: '1.0.0',
        capturedAt: '2024-01-01T00:00:00Z',
        rules: [allowAnalystReadV1],
        metadata: { label: 'initial rollout' },
      },
      {
        policyId: 'governance',
        version: '1.1.0',
        capturedAt: '2024-02-01T00:00:00Z',
        rules: [allowAnalystReadV11],
        metadata: { label: 'regional guardrail' },
      },
      {
        policyId: 'governance',
        version: '2.0.0',
        capturedAt: '2024-03-01T00:00:00Z',
        rules: [allowAnalystReadV11, denyContractorRule],
        metadata: { label: 'contractor restriction' },
      },
    ],
  },
];

describe('PolicyBacktestEngine', () => {
  const engine = new PolicyBacktestEngine(history);

  it('supports temporal snapshot queries and retrieval', () => {
    const febSnapshot = engine.getSnapshotAt(
      'governance',
      '2024-02-15T12:00:00Z',
    );
    expect(febSnapshot?.version).toBe('1.1.0');

    const marchRange = engine.querySnapshots('governance', {
      from: '2024-02-01T00:00:00Z',
      to: '2024-03-31T23:59:59Z',
    });
    expect(marchRange).toHaveLength(2);
    expect(marchRange.map((snapshot) => snapshot.version)).toContain('2.0.0');
  });

  it('identifies policy version drift', () => {
    const diff = engine.compareVersions('governance', '1.0.0', '1.1.0');
    expect(diff.addedRules).toHaveLength(0);
    expect(diff.removedRules).toHaveLength(0);
    expect(diff.changedRules).toHaveLength(1);
    expect(diff.changedRules[0].ruleId).toBe('allow-analyst-read');
  });

  it('performs retroactive compliance checks with impact analysis and audit trail', () => {
    const events: HistoricalPolicyEvent[] = [
      {
        id: 'evt-1',
        occurredAt: '2024-01-15T12:00:00Z',
        request: {
          action: 'report:read',
          resource: 'analytics',
          context: {
            tenantId: 'tenant-1',
            userId: 'user-1',
            roles: ['analyst'],
            region: 'us-east-1',
          },
        },
        expectedEffect: 'allow',
      },
      {
        id: 'evt-2',
        occurredAt: '2024-02-15T12:00:00Z',
        request: {
          action: 'report:read',
          resource: 'analytics',
          context: {
            tenantId: 'tenant-1',
            userId: 'user-2',
            roles: ['analyst'],
            region: 'eu-west-1',
          },
        },
        expectedEffect: 'allow',
        metadata: { source: 'historical-approval' },
      },
      {
        id: 'evt-3',
        occurredAt: '2024-03-20T12:00:00Z',
        request: {
          action: 'report:read',
          resource: 'analytics',
          context: {
            tenantId: 'tenant-1',
            userId: 'user-3',
            roles: ['analyst', 'contractor'],
            region: 'us-east-1',
          },
        },
        expectedEffect: 'deny',
      },
    ];

    const report = engine.retroactiveComplianceCheck('governance', events);
    expect(report.evaluatedEvents).toBe(3);
    expect(report.compliantEvents).toHaveLength(2);
    expect(report.nonCompliantEvents).toHaveLength(1);
    expect(report.nonCompliantEvents[0].event.id).toBe('evt-2');

    expect(report.impact.totalEvaluations).toBe(3);
    expect(report.impact.effectCounts.allow).toBe(1);
    expect(report.impact.effectCounts.deny).toBe(2);
    expect(report.impact.versionBreakdown['1.0.0'].allows).toBe(1);
    expect(report.impact.versionBreakdown['1.1.0'].denies).toBe(1);
    expect(report.impact.ruleHits['deny-contractors']).toBe(1);
    expect(report.impact.obligationCounts['record-provenance']).toBe(1);

    const auditTrail = engine.getAuditTrail({
      policyId: 'governance',
      simulationType: 'retroactive',
    });
    expect(auditTrail).toHaveLength(3);
    expect(
      auditTrail.some(
        (entry) => entry.eventId === 'evt-2' && entry.compliant === false,
      ),
    ).toBe(true);
  });

  it('simulates rollbacks and highlights divergences', () => {
    const rollbackEvents: HistoricalPolicyEvent[] = [
      {
        id: 'rollback-1',
        occurredAt: '2024-03-10T12:00:00Z',
        request: {
          action: 'report:read',
          resource: 'analytics',
          context: {
            tenantId: 'tenant-1',
            userId: 'user-4',
            roles: ['analyst', 'contractor'],
            region: 'us-east-1',
          },
        },
      },
      {
        id: 'rollback-2',
        occurredAt: '2024-03-18T12:00:00Z',
        request: {
          action: 'report:read',
          resource: 'analytics',
          context: {
            tenantId: 'tenant-1',
            userId: 'user-5',
            roles: ['analyst'],
            region: 'us-east-1',
          },
        },
      },
    ];

    const rollback = engine.simulateRollback(
      'governance',
      '1.0.0',
      rollbackEvents,
    );
    expect(rollback.targetVersion).toBe('1.0.0');
    expect(rollback.baselineVersions).toContain('2.0.0');
    expect(rollback.evaluatedEvents).toBe(2);
    expect(rollback.divergingEvents).toHaveLength(1);
    expect(rollback.divergingEvents[0].event.id).toBe('rollback-1');
    expect(rollback.impact.effectCounts.allow).toBe(2);

    const auditTrail = engine.getAuditTrail({ simulationType: 'rollback' });
    expect(auditTrail).toHaveLength(2);
  });

  it('can skip events without snapshots when configured', () => {
    const skipEngine = new PolicyBacktestEngine(history, {
      missingSnapshotStrategy: 'skip',
    });
    const skipReport = skipEngine.retroactiveComplianceCheck('governance', [
      {
        id: 'pre-history',
        occurredAt: '2023-12-20T00:00:00Z',
        request: {
          action: 'report:read',
          resource: 'analytics',
          context: {
            tenantId: 'tenant-1',
            userId: 'user-6',
            roles: ['analyst'],
            region: 'us-east-1',
          },
        },
      },
    ]);

    expect(skipReport.evaluatedEvents).toBe(0);
    expect(skipReport.skippedEvents).toHaveLength(1);
  });
});

if (process?.env?.NODE_TEST) {
  const { test: nodeTest } = await import('node:test');
  nodeTest('policy-backtester vitest compatibility placeholder', () => {});
}

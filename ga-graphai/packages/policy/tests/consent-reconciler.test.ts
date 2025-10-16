import { describe, expect, it, vi } from 'vitest';
import type {
  ConsentIntegrationModule,
  ConsentStateEnvelope,
  ConsentValidationScenario,
} from 'common-types';
import { ConsentStateReconciler } from '../src/index';

function buildEnvelope(
  overrides: Partial<ConsentStateEnvelope> & {
    state: Partial<ConsentStateEnvelope['state']>;
    source?: Partial<ConsentStateEnvelope['source']>;
  },
): ConsentStateEnvelope {
  const base: ConsentStateEnvelope = {
    state: {
      subjectId: 'user-123',
      policyId: 'policy-analytics',
      status: 'granted',
      scopes: ['analytics'],
      jurisdiction: 'US',
      updatedAt: new Date('2024-01-01T00:00:00Z').toISOString(),
      version: 1,
      lawfulBasis: 'consent',
      overrides: [],
      metadata: { source: 'unit-test' },
    },
    source: {
      domain: 'mc',
      service: 'consent-api',
      endpoint: 'v1',
      environment: 'prod',
      topologyPath: ['global', 'prod'],
    },
    policyBinding: {
      id: 'policy-analytics',
      version: '1.0.0',
      hash: 'abc123',
    },
    evidence: ['ledger://consent/user-123'],
  };

  return {
    ...base,
    ...overrides,
    state: { ...base.state, ...overrides.state },
    source: { ...base.source, ...(overrides.source ?? {}) },
  };
}

describe('ConsentStateReconciler', () => {
  it('resolves conflicts using strictest status ordering', async () => {
    const reconciler = new ConsentStateReconciler();
    await reconciler.ingest(buildEnvelope({}));

    const resolution = await reconciler.ingest(
      buildEnvelope({
        state: {
          status: 'denied',
          updatedAt: new Date('2024-01-02T00:00:00Z').toISOString(),
          version: 2,
          overrides: ['gdpr-withdrawal'],
        },
        source: { service: 'consent-bridge' },
      }),
    );

    expect(resolution.finalState.status).toBe('denied');
    expect(resolution.appliedOverrides).toContain('gdpr-withdrawal');

    const conflict = reconciler.getConflict('user-123', 'policy-analytics');
    expect(conflict).toBeTruthy();
    expect(conflict?.severity).toBe('error');
    expect(conflict?.candidates).toHaveLength(2);

    const audit = reconciler.getAuditLog();
    expect(audit.some((entry) => entry.action === 'conflict-generated')).toBe(
      true,
    );
  });

  it('invokes integration modules and emits resolution events', async () => {
    const reconciler = new ConsentStateReconciler();
    const syncSpy = vi.fn();
    const module: ConsentIntegrationModule = {
      name: 'mc-adapter',
      supportedDomains: ['mc'],
      sync: syncSpy,
    };
    reconciler.registerModule(module);

    const listener = vi.fn();
    const unsubscribe = reconciler.subscribe(listener);

    await reconciler.ingest(
      buildEnvelope({
        state: {
          status: 'granted',
          updatedAt: new Date('2024-02-01T00:00:00Z').toISOString(),
          version: 3,
        },
      }),
    );

    expect(syncSpy).toHaveBeenCalledTimes(1);
    expect(listener).toHaveBeenCalledTimes(1);
    expect(listener.mock.calls[0][0].finalState.status).toBe('granted');

    unsubscribe();
  });

  it('runs validation scenarios against the reconciliation harness', async () => {
    const reconciler = new ConsentStateReconciler();
    const scenarios: ConsentValidationScenario[] = [
      {
        id: 'conflict-strict-deny',
        description:
          'Deny should override granted consent when conflicts exist',
        setup: [
          buildEnvelope({}),
          buildEnvelope({
            state: {
              status: 'denied',
              updatedAt: new Date('2024-03-01T00:00:00Z').toISOString(),
              version: 4,
            },
            source: { domain: 'intelgraph', service: 'policy-sync' },
          }),
        ],
        expectation: {
          subjectId: 'user-123',
          policyId: 'policy-analytics',
          expectedStatus: 'denied',
          expectedConflicts: 1,
        },
      },
    ];

    const report = await reconciler.runValidation(scenarios);

    expect(report.scenarios).toHaveLength(1);
    expect(report.scenarios[0].scenarioId).toBe('conflict-strict-deny');
    expect(report.scenarios[0].passed).toBe(true);
    expect(report.scenarios[0].actualStatus).toBe('denied');
  });

  it('summarises reconciliation topology by source domains', async () => {
    const reconciler = new ConsentStateReconciler();

    await reconciler.ingest(
      buildEnvelope({
        state: {
          subjectId: 'user-1',
          updatedAt: new Date('2024-04-01T00:00:00Z').toISOString(),
          version: 1,
        },
      }),
    );

    await reconciler.ingest(
      buildEnvelope({
        state: {
          subjectId: 'user-2',
          policyId: 'policy-marketing',
          status: 'revoked',
          scopes: ['marketing'],
          updatedAt: new Date('2024-04-02T00:00:00Z').toISOString(),
          version: 2,
        },
        source: {
          domain: 'intelgraph',
          service: 'graph-consent',
          topologyPath: ['global', 'edge'],
        },
      }),
    );

    const snapshot = reconciler.getTopologySnapshot();
    expect(snapshot.nodes.length).toBe(2);

    const mcNode = snapshot.nodes.find((node) => node.domain === 'mc');
    expect(mcNode).toBeTruthy();
    expect(mcNode?.totalSubjects).toBe(1);
    expect(mcNode?.statuses.granted).toBe(1);

    const igNode = snapshot.nodes.find((node) => node.domain === 'intelgraph');
    expect(igNode).toBeTruthy();
    expect(igNode?.statuses.revoked).toBe(1);
  });
});

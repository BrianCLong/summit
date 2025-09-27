import { QueryIntentPolicyMapper } from '../../services/qic-pm/query-intent-policy-mapper';
import { createRsrAdapter } from '../../services/qic-pm/adapters/rsr-adapter';
import { createPpcAdapter } from '../../services/qic-pm/adapters/ppc-adapter';
import type { QueryIntent, PolicyAction } from '../../services/qic-pm/types';
import fixtures from '../fixtures/qicPmFixtures.json';

interface FixtureRow {
  query: string;
  context?: Record<string, unknown>;
  expectedIntent: QueryIntent;
  expectedAction: PolicyAction;
}

describe('QueryIntentPolicyMapper', () => {
  const mapper = new QueryIntentPolicyMapper();

  it('meets accuracy and precision targets on labeled fixtures', () => {
    const rows = fixtures as FixtureRow[];

    let correctIntent = 0;
    let correctPolicyAction = 0;

    rows.forEach((row) => {
      const verdict = mapper.evaluate(row.query, row.context ?? {});

      if (verdict.intent === row.expectedIntent) {
        correctIntent += 1;
      }

      if (verdict.decision.action === row.expectedAction) {
        correctPolicyAction += 1;
      }

      expect(verdict.explanation.length).toBeGreaterThan(0);
      expect(Object.values(verdict.probabilities).reduce((sum, value) => sum + value, 0)).toBeCloseTo(1, 5);
    });

    const intentAccuracy = correctIntent / rows.length;
    const mappingPrecision = correctPolicyAction / rows.length;

    expect(intentAccuracy).toBeGreaterThanOrEqual(0.9);
    expect(mappingPrecision).toBeGreaterThanOrEqual(0.9);
  });

  it('returns deterministic verdicts and explanations for identical inputs', () => {
    const context = { channel: 'support', tenantId: 'tenant-123' };
    const query = 'Need help with outage ticket for enterprise accounts';

    const first = mapper.evaluate(query, context);
    const second = mapper.evaluate(query, context);

    expect(second).toEqual(first);
    expect(second).not.toBe(first);
    expect(second.explanation).toEqual(first.explanation);
    expect(second.explanation).not.toBe(first.explanation);
  });

  describe('integration adapters', () => {
    it('generates RSR-compatible routing decisions', () => {
      const adapter = createRsrAdapter(mapper);
      const request = {
        query: 'Customer ticket escalation for login outage',
        context: { channel: 'support' },
        correlationId: 'corr-001',
      };

      const baseVerdict = mapper.evaluate(request.query, request.context ?? {});
      const routingDecision = adapter.evaluate(request);

      expect(routingDecision.router).toBe('RSR');
      expect(routingDecision.intent).toBe(baseVerdict.intent);
      expect(routingDecision.policy).toEqual(baseVerdict.decision);
      expect(routingDecision.explanation).toEqual(baseVerdict.explanation);
      expect(routingDecision.allow).toBe(true);
      expect(routingDecision.correlationId).toBe('corr-001');
    });

    it('produces PPC directives with policy metadata and traces', () => {
      const adapter = createPpcAdapter(mapper);
      const request = {
        query: 'Plan the next global campaign and compute conversion uplift',
        context: { channel: 'marketing' },
      };

      const baseVerdict = mapper.evaluate(request.query, request.context ?? {});
      const directive = adapter.toDirective(request);

      expect(directive.pipeline).toBe('PPC');
      expect(directive.metadata.intent).toBe(baseVerdict.intent);
      expect(directive.metadata.policyId).toBe(baseVerdict.decision.policyId);
      expect(directive.action).toBe(baseVerdict.decision.action);
      expect(directive.explanation).toEqual(baseVerdict.explanation);
      expect(directive.transforms).toEqual(baseVerdict.decision.transforms ?? []);
      expect(directive.redactions).toEqual(baseVerdict.decision.redactFields ?? []);
    });
  });
});

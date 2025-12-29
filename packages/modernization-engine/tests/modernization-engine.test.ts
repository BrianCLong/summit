import { DomainRegistry } from '../src/domain-registry.js';
import { createErrorEnvelope, isErrorEnvelope } from '../src/error-model.js';
import { evaluateSlo } from '../src/slo.js';
import { PredictiveRiskEngine } from '../src/risk-engine.js';
import { StranglerAdapter } from '../src/strangler.js';
import { ServiceAccessDescriptor } from '../src/types.js';
import { boundaryViolationCounter, registry } from '../src/metrics.js';

const registryInstance = new DomainRegistry();

function resetMetrics() {
  boundaryViolationCounter.reset();
  registry.resetMetrics();
}

describe('Modernization engine', () => {
  beforeEach(() => {
    resetMetrics();
  });

  it('enforces single write path and boundary adapters', () => {
    const access: ServiceAccessDescriptor = {
      service: 'graph-query-service',
      domain: 'graph-query',
      writes: [
        { domain: 'case-intake', resource: 'cases', viaAdapter: false },
        { domain: 'graph-query', resource: 'graph-query-planner', viaAdapter: true },
      ],
      reads: [{ domain: 'authorization', resource: 'policy_cache', viaAdapter: false }],
      errorModelImplemented: false,
    };

    const violations = registryInstance.evaluateAccess(access);
    expect(violations).toHaveLength(3);
    expect(violations.map((v) => v.type)).toEqual(
      expect.arrayContaining(['CROSS_DOMAIN_DB_ACCESS', 'MISSING_ERROR_MODEL', 'STRANGLER_BYPASS']),
    );
  });

  it('creates standard error envelopes', () => {
    const envelope = createErrorEnvelope('authorization', 'AUTHZ_DENIED', 'Denied');
    expect(isErrorEnvelope(envelope)).toBe(true);
    expect(envelope.severity).toBe('MEDIUM');
  });

  it('evaluates SLO adherence with budgets', () => {
    const domain = registryInstance.getDomain('authorization');
    const result = evaluateSlo(domain, {
      windowMinutes: 60,
      totalRequests: 12000,
      failedRequests: 60,
      p95LatencyMs: 90,
    });

    expect(result.availabilityMet).toBe(true);
    expect(result.latencyMet).toBe(false);
    expect(result.errorBudgetRemainingMinutes).toBeGreaterThan(0);
  });

  it('derives traffic directives from predictive risk', () => {
    const engine = new PredictiveRiskEngine(registryInstance);
    const directives = engine.deriveTrafficDirectives([
      { domain: 'case-intake', name: 'CaseSubmitted', latencyMs: 500, violationObserved: true, driftDelta: 2 },
      { domain: 'graph-query', name: 'GraphQueryExecuted', latencyMs: 80, violationObserved: false, driftDelta: 0 },
    ]);

    const caseDirective = directives.find((d) => d.domain === 'case-intake');
    expect(caseDirective?.shadowPercentage).toBeGreaterThan(0);
    const graphDirective = directives.find((d) => d.domain === 'graph-query');
    expect(graphDirective?.shadowPercentage).toBe(0);
  });

  it('enforces strangler adapter protections', () => {
    const domain = registryInstance.getDomain('audit-provenance');
    const adapter = new StranglerAdapter(domain, { shadowPercentage: 25, allowWrites: false });
    expect(() => adapter.routeRequest('/audit', {})).toThrow('Write attempts blocked');

    const descriptor: ServiceAccessDescriptor = {
      service: 'audit-service',
      domain: 'audit-provenance',
      writes: [{ domain: 'audit-provenance', resource: 'audit-writer', viaAdapter: false }],
      reads: [],
      errorModelImplemented: true,
    };
    expect(() => adapter.enforceCompatibility(descriptor)).toThrow('bypasses adapter');
  });
});

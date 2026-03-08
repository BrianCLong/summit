"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const domain_registry_js_1 = require("../src/domain-registry.js");
const error_model_js_1 = require("../src/error-model.js");
const slo_js_1 = require("../src/slo.js");
const risk_engine_js_1 = require("../src/risk-engine.js");
const strangler_js_1 = require("../src/strangler.js");
const metrics_js_1 = require("../src/metrics.js");
const registryInstance = new domain_registry_js_1.DomainRegistry();
function resetMetrics() {
    metrics_js_1.boundaryViolationCounter.reset();
    metrics_js_1.registry.resetMetrics();
}
describe('Modernization engine', () => {
    beforeEach(() => {
        resetMetrics();
    });
    it('enforces single write path and boundary adapters', () => {
        const access = {
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
        expect(violations.map((v) => v.type)).toEqual(expect.arrayContaining(['CROSS_DOMAIN_DB_ACCESS', 'MISSING_ERROR_MODEL', 'STRANGLER_BYPASS']));
    });
    it('creates standard error envelopes', () => {
        const envelope = (0, error_model_js_1.createErrorEnvelope)('authorization', 'AUTHZ_DENIED', 'Denied');
        expect((0, error_model_js_1.isErrorEnvelope)(envelope)).toBe(true);
        expect(envelope.severity).toBe('MEDIUM');
    });
    it('evaluates SLO adherence with budgets', () => {
        const domain = registryInstance.getDomain('authorization');
        const result = (0, slo_js_1.evaluateSlo)(domain, {
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
        const engine = new risk_engine_js_1.PredictiveRiskEngine(registryInstance);
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
        const adapter = new strangler_js_1.StranglerAdapter(domain, { shadowPercentage: 25, allowWrites: false });
        expect(() => adapter.routeRequest('/audit', {})).toThrow('Write attempts blocked');
        const descriptor = {
            service: 'audit-service',
            domain: 'audit-provenance',
            writes: [{ domain: 'audit-provenance', resource: 'audit-writer', viaAdapter: false }],
            reads: [],
            errorModelImplemented: true,
        };
        expect(() => adapter.enforceCompatibility(descriptor)).toThrow('bypasses adapter');
    });
});

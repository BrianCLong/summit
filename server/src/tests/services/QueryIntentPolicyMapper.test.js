"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const globals_1 = require("@jest/globals");
const query_intent_policy_mapper_js_1 = require("../../services/qic-pm/query-intent-policy-mapper.js");
const rsr_adapter_js_1 = require("../../services/qic-pm/adapters/rsr-adapter.js");
const ppc_adapter_js_1 = require("../../services/qic-pm/adapters/ppc-adapter.js");
const qicPmFixtures_json_1 = __importDefault(require("../fixtures/qicPmFixtures.json"));
(0, globals_1.describe)('QueryIntentPolicyMapper', () => {
    const mapper = new query_intent_policy_mapper_js_1.QueryIntentPolicyMapper();
    (0, globals_1.it)('meets accuracy and precision targets on labeled fixtures', () => {
        const rows = qicPmFixtures_json_1.default;
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
            (0, globals_1.expect)(verdict.explanation.length).toBeGreaterThan(0);
            (0, globals_1.expect)(Object.values(verdict.probabilities).reduce((sum, value) => sum + value, 0)).toBeCloseTo(1, 5);
        });
        const intentAccuracy = correctIntent / rows.length;
        const mappingPrecision = correctPolicyAction / rows.length;
        (0, globals_1.expect)(intentAccuracy).toBeGreaterThanOrEqual(0.9);
        (0, globals_1.expect)(mappingPrecision).toBeGreaterThanOrEqual(0.9);
    });
    (0, globals_1.it)('returns deterministic verdicts and explanations for identical inputs', () => {
        const context = { channel: 'support', tenantId: 'tenant-123' };
        const query = 'Need help with outage ticket for enterprise accounts';
        const first = mapper.evaluate(query, context);
        const second = mapper.evaluate(query, context);
        (0, globals_1.expect)(second).toEqual(first);
        (0, globals_1.expect)(second).not.toBe(first);
        (0, globals_1.expect)(second.explanation).toEqual(first.explanation);
        (0, globals_1.expect)(second.explanation).not.toBe(first.explanation);
    });
    (0, globals_1.describe)('integration adapters', () => {
        (0, globals_1.it)('generates RSR-compatible routing decisions', () => {
            const adapter = (0, rsr_adapter_js_1.createRsrAdapter)(mapper);
            const request = {
                query: 'Customer ticket escalation for login outage',
                context: { channel: 'support' },
                correlationId: 'corr-001',
            };
            const baseVerdict = mapper.evaluate(request.query, request.context ?? {});
            const routingDecision = adapter.evaluate(request);
            (0, globals_1.expect)(routingDecision.router).toBe('RSR');
            (0, globals_1.expect)(routingDecision.intent).toBe(baseVerdict.intent);
            (0, globals_1.expect)(routingDecision.policy).toEqual(baseVerdict.decision);
            (0, globals_1.expect)(routingDecision.explanation).toEqual(baseVerdict.explanation);
            (0, globals_1.expect)(routingDecision.allow).toBe(true);
            (0, globals_1.expect)(routingDecision.correlationId).toBe('corr-001');
        });
        (0, globals_1.it)('produces PPC directives with policy metadata and traces', () => {
            const adapter = (0, ppc_adapter_js_1.createPpcAdapter)(mapper);
            const request = {
                query: 'Plan the next global campaign and compute conversion uplift',
                context: { channel: 'marketing' },
            };
            const baseVerdict = mapper.evaluate(request.query, request.context ?? {});
            const directive = adapter.toDirective(request);
            (0, globals_1.expect)(directive.pipeline).toBe('PPC');
            (0, globals_1.expect)(directive.metadata.intent).toBe(baseVerdict.intent);
            (0, globals_1.expect)(directive.metadata.policyId).toBe(baseVerdict.decision.policyId);
            (0, globals_1.expect)(directive.action).toBe(baseVerdict.decision.action);
            (0, globals_1.expect)(directive.explanation).toEqual(baseVerdict.explanation);
            (0, globals_1.expect)(directive.transforms).toEqual(baseVerdict.decision.transforms ?? []);
            (0, globals_1.expect)(directive.redactions).toEqual(baseVerdict.decision.redactFields ?? []);
        });
    });
});

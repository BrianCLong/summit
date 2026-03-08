"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const vitest_1 = require("vitest");
const index_js_1 = require("../src/index.js");
(0, vitest_1.describe)('TrustSafetyOrchestrator', () => {
    let orchestrator;
    (0, vitest_1.beforeEach)(() => {
        orchestrator = new index_js_1.TrustSafetyOrchestrator();
    });
    (0, vitest_1.it)('enforces guardrails and freezes decisions on SLO breaches', () => {
        const input = {
            contentType: 'post',
            text: 'latency test',
            region: 'us',
            purpose: 't&s',
        };
        const metrics = {
            apiReadP95Ms: index_js_1.TRUST_SAFETY_DEFAULTS.guardrails.apiReadP95Ms + 50,
            apiWriteP95Ms: index_js_1.TRUST_SAFETY_DEFAULTS.guardrails.apiWriteP95Ms + 10,
            stageLatencies: { detect: index_js_1.TRUST_SAFETY_DEFAULTS.latencyBudgets[1].maxP95Ms + 1 },
        };
        const action = orchestrator.runPipeline(input, metrics);
        (0, vitest_1.expect)(action.action).toBe('freeze');
        (0, vitest_1.expect)(action.requiresHumanReview).toBe(true);
        (0, vitest_1.expect)(action.reason).toContain('Tier=safe');
    });
    (0, vitest_1.it)('prioritizes child safety with human review and restriction', () => {
        const input = {
            contentType: 'image',
            mediaHash: 'pdq:abcd',
            region: 'us',
            purpose: 't&s',
            userAge: 14,
            signals: {
                childSafetyScore: 0.92,
                modelScore: 0.88,
                ruleScore: 0.6,
            },
        };
        const action = orchestrator.runPipeline(input);
        (0, vitest_1.expect)(action.action).toBe('restrict');
        (0, vitest_1.expect)(action.requiresHumanReview).toBe(true);
        (0, vitest_1.expect)(action.isChildSafetyPriority).toBe(true);
        (0, vitest_1.expect)(action.reason).toContain('child-safety-priority');
    });
    (0, vitest_1.it)('respects enforcement lane backout to freeze changes safely', () => {
        orchestrator.backoutLane('enforcement', 'safety drill');
        const input = {
            contentType: 'comment',
            text: 'normal content',
            region: 'us',
            purpose: 't&s',
            signals: { modelScore: 0.7, ruleScore: 0.6 },
        };
        const action = orchestrator.runPipeline(input);
        (0, vitest_1.expect)(action.action).toBe('freeze');
        (0, vitest_1.expect)(action.requiresHumanReview).toBe(true);
        (0, vitest_1.expect)(orchestrator.getAuditLog().length).toBeGreaterThanOrEqual(1);
    });
    (0, vitest_1.it)('rejects unsupported purpose tags and flags residency mismatches', () => {
        const metricsEvaluation = orchestrator.evaluateGuardrails({}, 'unknown');
        (0, vitest_1.expect)(metricsEvaluation.ok).toBe(false);
        (0, vitest_1.expect)(metricsEvaluation.violations.some((v) => v.category === 'purpose')).toBe(true);
        const strictOrchestrator = new index_js_1.TrustSafetyOrchestrator({
            residencyPolicies: [{ region: 'us', storageRegion: 'eu', allowExport: false }],
        });
        const input = {
            contentType: 'post',
            text: 'export test',
            region: 'us',
            purpose: 't&s',
        };
        (0, vitest_1.expect)(() => strictOrchestrator.runPipeline(input)).toThrowError(/Residency policy/);
    });
    (0, vitest_1.it)('halts earlier pipeline lanes when backout is enabled', () => {
        orchestrator.backoutLane('ingest', 'maintenance');
        const action = orchestrator.runPipeline({
            contentType: 'post',
            text: 'backout',
            region: 'us',
            purpose: 't&s',
        });
        (0, vitest_1.expect)(action.action).toBe('freeze');
        (0, vitest_1.expect)(action.reason).toContain('Lane ingest backout');
    });
    (0, vitest_1.it)('enforces retention budgets for pii and standard artifacts', () => {
        const strictRetention = new index_js_1.TrustSafetyOrchestrator({
            retention: { standardDays: 100, piiDays: 10, legalHoldEnabled: false },
        });
        (0, vitest_1.expect)(() => strictRetention.runPipeline({
            contentType: 'post',
            text: 'over retain',
            region: 'us',
            purpose: 't&s',
            retentionDays: 200,
            containsPii: false,
        })).toThrowError(/Retention exceeds policy/);
        (0, vitest_1.expect)(() => strictRetention.runPipeline({
            contentType: 'post',
            text: 'pii retain',
            region: 'us',
            purpose: 't&s',
            containsPii: true,
            retentionDays: 30,
        })).toThrowError(/Retention exceeds policy/);
    });
    (0, vitest_1.it)('merges partial configuration without dropping defaults', () => {
        const merged = new index_js_1.TrustSafetyOrchestrator({ guardrails: { apiReadP95Ms: 100 } });
        const evaluation = merged.evaluateGuardrails({ apiReadP95Ms: 120 });
        (0, vitest_1.expect)(evaluation.ok).toBe(false);
        (0, vitest_1.expect)(evaluation.violations.some((violation) => violation.category === 'latency')).toBe(true);
        (0, vitest_1.expect)(merged.runPipeline({
            contentType: 'post',
            text: 'ok',
            region: 'us',
            purpose: 't&s',
        }).action).toBeDefined();
    });
});

"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const globals_1 = require("@jest/globals");
const scoreboardService_js_1 = require("../scoreboardService.js");
const baseMetrics = {
    domainId: 'intelgraph',
    domainName: 'IntelGraph Core',
    periodStart: '2025-01-01',
    periodEnd: '2025-01-07',
    sloBurnRate: 0.1,
    errorBudgetRemaining: 0.5,
    cycleTimeDays: 4,
    wipCount: 3,
    wipLimit: 5,
    blockedTimeHours: 5,
    reworkRate: 0.1,
    costPerUnit: 120,
    onCall: { pagesPerShift: 2, sleepDebtHours: 2, toilHours: 4 },
    deletionShipped: 1,
    debtBurn: 3,
    repeatIncidents: 0,
    prSizeLimitBreaches: 0,
    releaseEnvelopeRequired: true,
};
(0, globals_1.describe)('ScoreboardService', () => {
    (0, globals_1.beforeEach)(() => {
        scoreboardService_js_1.scoreboardService.reset();
        scoreboardService_js_1.scoreboardService.upsertDomainMetrics({ ...baseMetrics });
    });
    (0, globals_1.it)('gates roadmap when error budget is depleted without exception', () => {
        const depleted = scoreboardService_js_1.scoreboardService.upsertDomainMetrics({
            ...baseMetrics,
            errorBudgetRemaining: 0.01,
            repeatIncidents: 3,
        });
        const roadmapGate = depleted.gates.find((gate) => gate.gate === 'ROADMAP_SCOPE');
        (0, globals_1.expect)(roadmapGate?.state).toBe('BLOCKED');
        (0, globals_1.expect)(roadmapGate?.reason).toContain('Error budget');
    });
    (0, globals_1.it)('honors exceptions for roadmap gating', () => {
        const expiresAt = new Date(Date.now() + 60 * 60 * 1000).toISOString();
        scoreboardService_js_1.scoreboardService.registerException({
            domainId: baseMetrics.domainId,
            gate: 'ROADMAP_SCOPE',
            owner: 'SRE Lead',
            reason: 'Approved burn for reliability release',
            expiresAt,
        });
        const withException = scoreboardService_js_1.scoreboardService.upsertDomainMetrics({
            ...baseMetrics,
            errorBudgetRemaining: 0.0,
        });
        const roadmapGate = withException.gates.find((gate) => gate.gate === 'ROADMAP_SCOPE');
        (0, globals_1.expect)(roadmapGate?.state).toBe('OVERRIDDEN');
        (0, globals_1.expect)(roadmapGate?.ownerOverride).toBe('SRE Lead');
        (0, globals_1.expect)(roadmapGate?.expiresAt).toBe(expiresAt);
    });
    (0, globals_1.it)('requires release envelopes for Tier 0/1 domains', () => {
        const withoutEnvelope = scoreboardService_js_1.scoreboardService.upsertDomainMetrics({ ...baseMetrics });
        const releaseGate = withoutEnvelope.gates.find((gate) => gate.gate === 'RELEASE_ENVELOPE');
        (0, globals_1.expect)(releaseGate?.state).toBe('BLOCKED');
        scoreboardService_js_1.scoreboardService.registerReleaseEnvelope({
            domainId: baseMetrics.domainId,
            owner: 'Release Captain',
            metrics: ['latency', 'error_rate'],
            rollbackPlan: 'Auto-rollback enabled',
        });
        const withEnvelope = scoreboardService_js_1.scoreboardService.getDomainScoreboard(baseMetrics.domainId);
        const reopenedGate = withEnvelope.gates.find((gate) => gate.gate === 'RELEASE_ENVELOPE');
        (0, globals_1.expect)(reopenedGate?.state).toBe('OPEN');
    });
    (0, globals_1.it)('tracks decision hygiene with revisit dates', () => {
        const entry = scoreboardService_js_1.scoreboardService.logDecision({
            domainId: baseMetrics.domainId,
            title: 'Adopt WIP limit of 5',
            owner: 'Eng Manager',
            rationale: 'Flow discipline enforcement',
            revisitDate: '2025-02-01',
            decisionType: 'TWO_WAY_DOOR',
        });
        const scoreboards = scoreboardService_js_1.scoreboardService.listScoreboards();
        const domain = scoreboards.find((d) => d.domainId === baseMetrics.domainId);
        (0, globals_1.expect)(domain?.decisions.some((d) => d.id === entry.id)).toBe(true);
    });
});

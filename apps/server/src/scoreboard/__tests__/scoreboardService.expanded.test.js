"use strict";
/**
 * Comprehensive expanded tests for ScoreboardService
 *
 * Tests cover:
 * - Metrics validation and sanitization
 * - Gate evaluation logic
 * - Exception handling and expiration
 * - Release envelope management
 * - Health computation
 * - Decision logging
 * - Edge cases and error conditions
 * - Concurrency and state management
 */
Object.defineProperty(exports, "__esModule", { value: true });
const globals_1 = require("@jest/globals");
const scoreboardService_js_1 = require("../scoreboardService.js");
const types_js_1 = require("../types.js");
(0, globals_1.describe)('ScoreboardService - Comprehensive Tests', () => {
    let service;
    const createBaseMetrics = (overrides = {}) => ({
        domainId: 'test-domain',
        domainName: 'Test Domain',
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
        ...overrides,
    });
    (0, globals_1.beforeEach)(() => {
        service = new scoreboardService_js_1.ScoreboardService();
    });
    (0, globals_1.describe)('Metrics Validation', () => {
        (0, globals_1.it)('should reject metrics with missing domainId', () => {
            const metrics = createBaseMetrics();
            metrics.domainId = '';
            (0, globals_1.expect)(() => service.upsertDomainMetrics(metrics)).toThrow('Missing required field: domainId');
        });
        (0, globals_1.it)('should reject metrics with missing domainName', () => {
            const metrics = createBaseMetrics();
            metrics.domainName = '';
            (0, globals_1.expect)(() => service.upsertDomainMetrics(metrics)).toThrow('Missing required field: domainName');
        });
        (0, globals_1.it)('should reject metrics with missing periodStart', () => {
            const metrics = createBaseMetrics();
            metrics.periodStart = '';
            (0, globals_1.expect)(() => service.upsertDomainMetrics(metrics)).toThrow('Missing required field: periodStart');
        });
        (0, globals_1.it)('should reject metrics with missing periodEnd', () => {
            const metrics = createBaseMetrics();
            metrics.periodEnd = '';
            (0, globals_1.expect)(() => service.upsertDomainMetrics(metrics)).toThrow('Missing required field: periodEnd');
        });
        (0, globals_1.it)('should reject negative wipLimit', () => {
            const metrics = createBaseMetrics({ wipLimit: -1 });
            (0, globals_1.expect)(() => service.upsertDomainMetrics(metrics)).toThrow('WIP limit must be greater than zero');
        });
        (0, globals_1.it)('should reject zero wipLimit', () => {
            const metrics = createBaseMetrics({ wipLimit: 0 });
            (0, globals_1.expect)(() => service.upsertDomainMetrics(metrics)).toThrow('WIP limit must be greater than zero');
        });
        (0, globals_1.it)('should reject errorBudgetRemaining greater than 1', () => {
            const metrics = createBaseMetrics({ errorBudgetRemaining: 1.5 });
            (0, globals_1.expect)(() => service.upsertDomainMetrics(metrics)).toThrow('errorBudgetRemaining must be expressed as a value between 0 and 1');
        });
        (0, globals_1.it)('should reject negative errorBudgetRemaining', () => {
            const metrics = createBaseMetrics({ errorBudgetRemaining: -0.1 });
            (0, globals_1.expect)(() => service.upsertDomainMetrics(metrics)).toThrow('errorBudgetRemaining must be expressed as a value between 0 and 1');
        });
        (0, globals_1.it)('should reject reworkRate greater than 1', () => {
            const metrics = createBaseMetrics({ reworkRate: 1.5 });
            (0, globals_1.expect)(() => service.upsertDomainMetrics(metrics)).toThrow('reworkRate must be expressed as a value between 0 and 1');
        });
        (0, globals_1.it)('should reject negative reworkRate', () => {
            const metrics = createBaseMetrics({ reworkRate: -0.1 });
            (0, globals_1.expect)(() => service.upsertDomainMetrics(metrics)).toThrow('reworkRate must be expressed as a value between 0 and 1');
        });
        (0, globals_1.it)('should reject sloBurnRate greater than 1', () => {
            const metrics = createBaseMetrics({ sloBurnRate: 1.5 });
            (0, globals_1.expect)(() => service.upsertDomainMetrics(metrics)).toThrow('sloBurnRate must be expressed as a value between 0 and 1');
        });
        (0, globals_1.it)('should reject negative sloBurnRate', () => {
            const metrics = createBaseMetrics({ sloBurnRate: -0.1 });
            (0, globals_1.expect)(() => service.upsertDomainMetrics(metrics)).toThrow('sloBurnRate must be expressed as a value between 0 and 1');
        });
        (0, globals_1.it)('should accept errorBudgetRemaining at exactly 0', () => {
            const metrics = createBaseMetrics({ errorBudgetRemaining: 0 });
            const result = service.upsertDomainMetrics(metrics);
            (0, globals_1.expect)(result.metrics.errorBudgetRemaining).toBe(0);
        });
        (0, globals_1.it)('should accept errorBudgetRemaining at exactly 1', () => {
            const metrics = createBaseMetrics({ errorBudgetRemaining: 1 });
            const result = service.upsertDomainMetrics(metrics);
            (0, globals_1.expect)(result.metrics.errorBudgetRemaining).toBe(1);
        });
        (0, globals_1.it)('should clamp negative numeric values to zero', () => {
            const metrics = createBaseMetrics({
                cycleTimeDays: -5,
                wipCount: -2,
                blockedTimeHours: -10,
            });
            const result = service.upsertDomainMetrics(metrics);
            (0, globals_1.expect)(result.metrics.cycleTimeDays).toBe(0);
            (0, globals_1.expect)(result.metrics.wipCount).toBe(0);
            (0, globals_1.expect)(result.metrics.blockedTimeHours).toBe(0);
        });
        (0, globals_1.it)('should clamp NaN values to zero', () => {
            const metrics = createBaseMetrics({
                cycleTimeDays: NaN,
                costPerUnit: NaN,
                debtBurn: NaN,
            });
            const result = service.upsertDomainMetrics(metrics);
            (0, globals_1.expect)(result.metrics.cycleTimeDays).toBe(0);
            (0, globals_1.expect)(result.metrics.costPerUnit).toBe(0);
            (0, globals_1.expect)(result.metrics.debtBurn).toBe(0);
        });
        (0, globals_1.it)('should clamp Infinity values to zero', () => {
            const metrics = createBaseMetrics({
                cycleTimeDays: Infinity,
                blockedTimeHours: -Infinity,
            });
            const result = service.upsertDomainMetrics(metrics);
            (0, globals_1.expect)(result.metrics.cycleTimeDays).toBe(0);
            (0, globals_1.expect)(result.metrics.blockedTimeHours).toBe(0);
        });
    });
    (0, globals_1.describe)('Gate Evaluation - Roadmap Scope', () => {
        (0, globals_1.it)('should block roadmap when error budget depleted', () => {
            const metrics = createBaseMetrics({ errorBudgetRemaining: 0.01 });
            const result = service.upsertDomainMetrics(metrics);
            const roadmapGate = result.gates.find((g) => g.gate === 'ROADMAP_SCOPE');
            (0, globals_1.expect)(roadmapGate?.state).toBe('BLOCKED');
            (0, globals_1.expect)(roadmapGate?.reason).toContain('Error budget');
        });
        (0, globals_1.it)('should block roadmap when repeat incidents exceed threshold', () => {
            const metrics = createBaseMetrics({
                errorBudgetRemaining: 0.5,
                repeatIncidents: types_js_1.HEALTH_THRESHOLDS.repeatIncidents + 1,
            });
            const result = service.upsertDomainMetrics(metrics);
            const roadmapGate = result.gates.find((g) => g.gate === 'ROADMAP_SCOPE');
            (0, globals_1.expect)(roadmapGate?.state).toBe('BLOCKED');
        });
        (0, globals_1.it)('should block roadmap when both error budget and repeat incidents are bad', () => {
            const metrics = createBaseMetrics({
                errorBudgetRemaining: 0.01,
                repeatIncidents: types_js_1.HEALTH_THRESHOLDS.repeatIncidents + 1,
            });
            const result = service.upsertDomainMetrics(metrics);
            const roadmapGate = result.gates.find((g) => g.gate === 'ROADMAP_SCOPE');
            (0, globals_1.expect)(roadmapGate?.state).toBe('BLOCKED');
        });
        (0, globals_1.it)('should open roadmap when metrics are healthy', () => {
            const metrics = createBaseMetrics({
                errorBudgetRemaining: 0.8,
                repeatIncidents: 0,
            });
            const result = service.upsertDomainMetrics(metrics);
            const roadmapGate = result.gates.find((g) => g.gate === 'ROADMAP_SCOPE');
            (0, globals_1.expect)(roadmapGate?.state).toBe('OPEN');
        });
        (0, globals_1.it)('should override blocked roadmap gate with active exception', () => {
            const metrics = createBaseMetrics({ errorBudgetRemaining: 0 });
            service.upsertDomainMetrics(metrics);
            const expiresAt = new Date(Date.now() + 3600 * 1000).toISOString();
            service.registerException({
                domainId: 'test-domain',
                gate: 'ROADMAP_SCOPE',
                owner: 'SRE Lead',
                reason: 'Approved burn',
                expiresAt,
            });
            const result = service.getDomainScoreboard('test-domain');
            const roadmapGate = result.gates.find((g) => g.gate === 'ROADMAP_SCOPE');
            (0, globals_1.expect)(roadmapGate?.state).toBe('OVERRIDDEN');
            (0, globals_1.expect)(roadmapGate?.ownerOverride).toBe('SRE Lead');
            (0, globals_1.expect)(roadmapGate?.expiresAt).toBe(expiresAt);
        });
    });
    (0, globals_1.describe)('Gate Evaluation - WIP Limit', () => {
        (0, globals_1.it)('should block when WIP count exceeds limit', () => {
            const metrics = createBaseMetrics({
                wipCount: 10,
                wipLimit: 5,
            });
            const result = service.upsertDomainMetrics(metrics);
            const wipGate = result.gates.find((g) => g.gate === 'WIP_LIMIT');
            (0, globals_1.expect)(wipGate?.state).toBe('BLOCKED');
            (0, globals_1.expect)(wipGate?.reason).toContain('WIP limit exceeded');
        });
        (0, globals_1.it)('should open when WIP count equals limit', () => {
            const metrics = createBaseMetrics({
                wipCount: 5,
                wipLimit: 5,
            });
            const result = service.upsertDomainMetrics(metrics);
            const wipGate = result.gates.find((g) => g.gate === 'WIP_LIMIT');
            (0, globals_1.expect)(wipGate?.state).toBe('OPEN');
        });
        (0, globals_1.it)('should open when WIP count is below limit', () => {
            const metrics = createBaseMetrics({
                wipCount: 3,
                wipLimit: 5,
            });
            const result = service.upsertDomainMetrics(metrics);
            const wipGate = result.gates.find((g) => g.gate === 'WIP_LIMIT');
            (0, globals_1.expect)(wipGate?.state).toBe('OPEN');
        });
        (0, globals_1.it)('should override WIP gate with exception', () => {
            const metrics = createBaseMetrics({
                wipCount: 10,
                wipLimit: 5,
            });
            service.upsertDomainMetrics(metrics);
            const expiresAt = new Date(Date.now() + 3600 * 1000).toISOString();
            service.registerException({
                domainId: 'test-domain',
                gate: 'WIP_LIMIT',
                owner: 'Engineering Manager',
                reason: 'Sprint goals require temporary increase',
                expiresAt,
            });
            const result = service.getDomainScoreboard('test-domain');
            const wipGate = result.gates.find((g) => g.gate === 'WIP_LIMIT');
            (0, globals_1.expect)(wipGate?.state).toBe('OVERRIDDEN');
        });
    });
    (0, globals_1.describe)('Gate Evaluation - PR Size Limit', () => {
        (0, globals_1.it)('should block when PR size breaches exceed threshold', () => {
            const metrics = createBaseMetrics({
                prSizeLimitBreaches: types_js_1.HEALTH_THRESHOLDS.prSizeLimitBreaches + 1,
            });
            const result = service.upsertDomainMetrics(metrics);
            const prGate = result.gates.find((g) => g.gate === 'PR_SIZE_LIMIT');
            (0, globals_1.expect)(prGate?.state).toBe('BLOCKED');
            (0, globals_1.expect)(prGate?.reason).toContain('PR size limits breached');
        });
        (0, globals_1.it)('should open when PR size breaches are at threshold', () => {
            const metrics = createBaseMetrics({
                prSizeLimitBreaches: types_js_1.HEALTH_THRESHOLDS.prSizeLimitBreaches,
            });
            const result = service.upsertDomainMetrics(metrics);
            const prGate = result.gates.find((g) => g.gate === 'PR_SIZE_LIMIT');
            (0, globals_1.expect)(prGate?.state).toBe('OPEN');
        });
        (0, globals_1.it)('should open when no PR size breaches', () => {
            const metrics = createBaseMetrics({
                prSizeLimitBreaches: 0,
            });
            const result = service.upsertDomainMetrics(metrics);
            const prGate = result.gates.find((g) => g.gate === 'PR_SIZE_LIMIT');
            (0, globals_1.expect)(prGate?.state).toBe('OPEN');
        });
    });
    (0, globals_1.describe)('Gate Evaluation - Release Envelope', () => {
        (0, globals_1.it)('should block when release envelope required but not registered', () => {
            const metrics = createBaseMetrics({
                releaseEnvelopeRequired: true,
            });
            const result = service.upsertDomainMetrics(metrics);
            const releaseGate = result.gates.find((g) => g.gate === 'RELEASE_ENVELOPE');
            (0, globals_1.expect)(releaseGate?.state).toBe('BLOCKED');
            (0, globals_1.expect)(releaseGate?.reason).toContain('Release envelope required');
        });
        (0, globals_1.it)('should open when release envelope required and registered', () => {
            const metrics = createBaseMetrics({
                releaseEnvelopeRequired: true,
            });
            service.upsertDomainMetrics(metrics);
            service.registerReleaseEnvelope({
                domainId: 'test-domain',
                owner: 'Release Captain',
                metrics: ['latency', 'error_rate'],
                rollbackPlan: 'Auto-rollback enabled',
            });
            const result = service.getDomainScoreboard('test-domain');
            const releaseGate = result.gates.find((g) => g.gate === 'RELEASE_ENVELOPE');
            (0, globals_1.expect)(releaseGate?.state).toBe('OPEN');
        });
        (0, globals_1.it)('should open when release envelope not required', () => {
            const metrics = createBaseMetrics({
                releaseEnvelopeRequired: false,
            });
            const result = service.upsertDomainMetrics(metrics);
            const releaseGate = result.gates.find((g) => g.gate === 'RELEASE_ENVELOPE');
            (0, globals_1.expect)(releaseGate?.state).toBe('OPEN');
        });
        (0, globals_1.it)('should include release envelope in scoreboard when registered', () => {
            const metrics = createBaseMetrics();
            service.upsertDomainMetrics(metrics);
            const envelope = service.registerReleaseEnvelope({
                domainId: 'test-domain',
                owner: 'Release Captain',
                metrics: ['latency', 'error_rate', 'throughput'],
                rollbackPlan: 'Feature flag rollback',
                expiresAt: '2027-02-01',
            });
            const result = service.getDomainScoreboard('test-domain');
            (0, globals_1.expect)(result.releaseEnvelope).toEqual(envelope);
        });
    });
    (0, globals_1.describe)('Health Computation', () => {
        (0, globals_1.describe)('Reliability Health', () => {
            (0, globals_1.it)('should report POOR when error budget depleted', () => {
                const metrics = createBaseMetrics({
                    errorBudgetRemaining: 0.01,
                });
                const result = service.upsertDomainMetrics(metrics);
                (0, globals_1.expect)(result.health.reliability).toBe('POOR');
            });
            (0, globals_1.it)('should report POOR when repeat incidents exceed threshold', () => {
                const metrics = createBaseMetrics({
                    errorBudgetRemaining: 0.5,
                    repeatIncidents: types_js_1.HEALTH_THRESHOLDS.repeatIncidents + 1,
                });
                const result = service.upsertDomainMetrics(metrics);
                (0, globals_1.expect)(result.health.reliability).toBe('POOR');
            });
            (0, globals_1.it)('should report WATCH when error budget is low but not depleted', () => {
                const metrics = createBaseMetrics({
                    errorBudgetRemaining: types_js_1.HEALTH_THRESHOLDS.errorBudgetRemaining * 2,
                    repeatIncidents: 0,
                });
                const result = service.upsertDomainMetrics(metrics);
                (0, globals_1.expect)(result.health.reliability).toBe('WATCH');
            });
            (0, globals_1.it)('should report GOOD when error budget is healthy', () => {
                const metrics = createBaseMetrics({
                    errorBudgetRemaining: types_js_1.HEALTH_THRESHOLDS.errorBudgetRemaining * 4,
                    repeatIncidents: 0,
                });
                const result = service.upsertDomainMetrics(metrics);
                (0, globals_1.expect)(result.health.reliability).toBe('GOOD');
            });
        });
        (0, globals_1.describe)('Flow Health', () => {
            (0, globals_1.it)('should report POOR when WIP exceeds limit', () => {
                const metrics = createBaseMetrics({
                    wipCount: 10,
                    wipLimit: 5,
                });
                const result = service.upsertDomainMetrics(metrics);
                (0, globals_1.expect)(result.health.flow).toBe('POOR');
            });
            (0, globals_1.it)('should report POOR when blocked time is excessive', () => {
                const metrics = createBaseMetrics({
                    blockedTimeHours: types_js_1.HEALTH_THRESHOLDS.blockedTimeHours + 5,
                });
                const result = service.upsertDomainMetrics(metrics);
                (0, globals_1.expect)(result.health.flow).toBe('POOR');
            });
            (0, globals_1.it)('should report POOR when rework rate is high', () => {
                const metrics = createBaseMetrics({
                    reworkRate: types_js_1.HEALTH_THRESHOLDS.reworkRate + 0.1,
                });
                const result = service.upsertDomainMetrics(metrics);
                (0, globals_1.expect)(result.health.flow).toBe('POOR');
            });
            (0, globals_1.it)('should report WATCH when cycle time is elevated', () => {
                const metrics = createBaseMetrics({
                    wipCount: 3,
                    wipLimit: 5,
                    blockedTimeHours: 5,
                    reworkRate: 0.1,
                    cycleTimeDays: types_js_1.HEALTH_THRESHOLDS.cycleTimeDays + 1,
                });
                const result = service.upsertDomainMetrics(metrics);
                (0, globals_1.expect)(result.health.flow).toBe('WATCH');
            });
            (0, globals_1.it)('should report GOOD when flow metrics are healthy', () => {
                const metrics = createBaseMetrics({
                    wipCount: 2,
                    wipLimit: 5,
                    blockedTimeHours: 2,
                    reworkRate: 0.05,
                    cycleTimeDays: 2,
                });
                const result = service.upsertDomainMetrics(metrics);
                (0, globals_1.expect)(result.health.flow).toBe('GOOD');
            });
        });
        (0, globals_1.describe)('On-Call Health', () => {
            (0, globals_1.it)('should report POOR when pages per shift exceed high threshold', () => {
                const metrics = createBaseMetrics({
                    onCall: { pagesPerShift: 7, sleepDebtHours: 2, toilHours: 4 },
                });
                const result = service.upsertDomainMetrics(metrics);
                (0, globals_1.expect)(result.health.onCall).toBe('POOR');
            });
            (0, globals_1.it)('should report POOR when sleep debt is critical', () => {
                const metrics = createBaseMetrics({
                    onCall: { pagesPerShift: 2, sleepDebtHours: 13, toilHours: 4 },
                });
                const result = service.upsertDomainMetrics(metrics);
                (0, globals_1.expect)(result.health.onCall).toBe('POOR');
            });
            (0, globals_1.it)('should report WATCH when pages per shift are moderate', () => {
                const metrics = createBaseMetrics({
                    onCall: { pagesPerShift: 4, sleepDebtHours: 3, toilHours: 4 },
                });
                const result = service.upsertDomainMetrics(metrics);
                (0, globals_1.expect)(result.health.onCall).toBe('WATCH');
            });
            (0, globals_1.it)('should report WATCH when sleep debt is moderate', () => {
                const metrics = createBaseMetrics({
                    onCall: { pagesPerShift: 2, sleepDebtHours: 8, toilHours: 4 },
                });
                const result = service.upsertDomainMetrics(metrics);
                (0, globals_1.expect)(result.health.onCall).toBe('WATCH');
            });
            (0, globals_1.it)('should report GOOD when on-call burden is manageable', () => {
                const metrics = createBaseMetrics({
                    onCall: { pagesPerShift: 1, sleepDebtHours: 2, toilHours: 2 },
                });
                const result = service.upsertDomainMetrics(metrics);
                (0, globals_1.expect)(result.health.onCall).toBe('GOOD');
            });
        });
    });
    (0, globals_1.describe)('Decision Logging', () => {
        (0, globals_1.it)('should log one-way door decisions', () => {
            service.upsertDomainMetrics(createBaseMetrics());
            const decision = service.logDecision({
                domainId: 'test-domain',
                title: 'Migrate to new database',
                owner: 'Tech Lead',
                rationale: 'Scalability requirements',
                revisitDate: '2025-06-01',
                decisionType: 'ONE_WAY_DOOR',
            });
            (0, globals_1.expect)(decision.id).toBeTruthy();
            (0, globals_1.expect)(decision.decisionType).toBe('ONE_WAY_DOOR');
            const scoreboard = service.getDomainScoreboard('test-domain');
            (0, globals_1.expect)(scoreboard.decisions).toContainEqual(decision);
        });
        (0, globals_1.it)('should log two-way door decisions', () => {
            service.upsertDomainMetrics(createBaseMetrics());
            const decision = service.logDecision({
                domainId: 'test-domain',
                title: 'Adopt WIP limit of 5',
                owner: 'Engineering Manager',
                rationale: 'Flow discipline',
                revisitDate: '2025-02-01',
                decisionType: 'TWO_WAY_DOOR',
            });
            (0, globals_1.expect)(decision.decisionType).toBe('TWO_WAY_DOOR');
        });
        (0, globals_1.it)('should track multiple decisions per domain', () => {
            service.upsertDomainMetrics(createBaseMetrics());
            service.logDecision({
                domainId: 'test-domain',
                title: 'Decision 1',
                owner: 'Owner 1',
                rationale: 'Reason 1',
                revisitDate: '2025-02-01',
                decisionType: 'ONE_WAY_DOOR',
            });
            service.logDecision({
                domainId: 'test-domain',
                title: 'Decision 2',
                owner: 'Owner 2',
                rationale: 'Reason 2',
                revisitDate: '2025-03-01',
                decisionType: 'TWO_WAY_DOOR',
            });
            const scoreboard = service.getDomainScoreboard('test-domain');
            (0, globals_1.expect)(scoreboard.decisions).toHaveLength(2);
        });
    });
    (0, globals_1.describe)('Multiple Domains', () => {
        (0, globals_1.it)('should track multiple domains independently', () => {
            const domain1 = createBaseMetrics({ domainId: 'domain-1', domainName: 'Domain 1' });
            const domain2 = createBaseMetrics({ domainId: 'domain-2', domainName: 'Domain 2' });
            service.upsertDomainMetrics(domain1);
            service.upsertDomainMetrics(domain2);
            const scoreboards = service.listScoreboards();
            (0, globals_1.expect)(scoreboards).toHaveLength(2);
            (0, globals_1.expect)(scoreboards.map((s) => s.domainId)).toContain('domain-1');
            (0, globals_1.expect)(scoreboards.map((s) => s.domainId)).toContain('domain-2');
        });
        (0, globals_1.it)('should isolate exceptions between domains', () => {
            service.upsertDomainMetrics(createBaseMetrics({ domainId: 'domain-1', errorBudgetRemaining: 0 }));
            service.upsertDomainMetrics(createBaseMetrics({ domainId: 'domain-2', errorBudgetRemaining: 0 }));
            service.registerException({
                domainId: 'domain-1',
                gate: 'ROADMAP_SCOPE',
                owner: 'Owner 1',
                reason: 'Exception 1',
                expiresAt: new Date(Date.now() + 3600 * 1000).toISOString(),
            });
            const scoreboard1 = service.getDomainScoreboard('domain-1');
            const scoreboard2 = service.getDomainScoreboard('domain-2');
            const gate1 = scoreboard1.gates.find((g) => g.gate === 'ROADMAP_SCOPE');
            const gate2 = scoreboard2.gates.find((g) => g.gate === 'ROADMAP_SCOPE');
            (0, globals_1.expect)(gate1?.state).toBe('OVERRIDDEN');
            (0, globals_1.expect)(gate2?.state).toBe('BLOCKED');
        });
    });
    (0, globals_1.describe)('Service State Management', () => {
        (0, globals_1.it)('should reset all state', () => {
            service.upsertDomainMetrics(createBaseMetrics());
            service.logDecision({
                domainId: 'test-domain',
                title: 'Test Decision',
                owner: 'Owner',
                rationale: 'Reason',
                revisitDate: '2025-02-01',
                decisionType: 'TWO_WAY_DOOR',
            });
            service.reset();
            const scoreboards = service.listScoreboards();
            (0, globals_1.expect)(scoreboards).toHaveLength(0);
        });
        (0, globals_1.it)('should update existing domain metrics', () => {
            service.upsertDomainMetrics(createBaseMetrics({ errorBudgetRemaining: 0.5 }));
            const updated = service.upsertDomainMetrics(createBaseMetrics({ errorBudgetRemaining: 0.8 }));
            (0, globals_1.expect)(updated.metrics.errorBudgetRemaining).toBe(0.8);
        });
        (0, globals_1.it)('should return undefined for non-existent domain', () => {
            const result = service.getDomainScoreboard('non-existent');
            (0, globals_1.expect)(result).toBeUndefined();
        });
        (0, globals_1.it)('should handle empty scoreboard list', () => {
            const scoreboards = service.listScoreboards();
            (0, globals_1.expect)(scoreboards).toEqual([]);
        });
    });
    (0, globals_1.describe)('Edge Cases', () => {
        (0, globals_1.it)('should handle domain with all gates open', () => {
            const metrics = createBaseMetrics({
                errorBudgetRemaining: 0.9,
                repeatIncidents: 0,
                wipCount: 2,
                wipLimit: 5,
                prSizeLimitBreaches: 0,
                releaseEnvelopeRequired: false,
            });
            const result = service.upsertDomainMetrics(metrics);
            const allOpen = result.gates.every((g) => g.state === 'OPEN');
            (0, globals_1.expect)(allOpen).toBe(true);
        });
        (0, globals_1.it)('should handle domain with all gates blocked', () => {
            const metrics = createBaseMetrics({
                errorBudgetRemaining: 0,
                repeatIncidents: 5,
                wipCount: 10,
                wipLimit: 3,
                prSizeLimitBreaches: 10,
                releaseEnvelopeRequired: true,
            });
            const result = service.upsertDomainMetrics(metrics);
            const allBlocked = result.gates.every((g) => g.state === 'BLOCKED');
            (0, globals_1.expect)(allBlocked).toBe(true);
        });
        (0, globals_1.it)('should handle extremely high metric values', () => {
            const metrics = createBaseMetrics({
                cycleTimeDays: 1000000,
                wipCount: 999999,
                blockedTimeHours: 100000,
                costPerUnit: 1000000,
                debtBurn: 500000,
            });
            const result = service.upsertDomainMetrics(metrics);
            (0, globals_1.expect)(result.metrics.cycleTimeDays).toBe(1000000);
            (0, globals_1.expect)(result.metrics.wipCount).toBe(999999);
        });
        (0, globals_1.it)('should handle zero values for all clamped metrics', () => {
            const metrics = createBaseMetrics({
                sloBurnRate: 0,
                errorBudgetRemaining: 0,
                cycleTimeDays: 0,
                wipCount: 0,
                blockedTimeHours: 0,
                reworkRate: 0,
                costPerUnit: 0,
                deletionShipped: 0,
                debtBurn: 0,
                repeatIncidents: 0,
                prSizeLimitBreaches: 0,
            });
            const result = service.upsertDomainMetrics(metrics);
            (0, globals_1.expect)(result.metrics.cycleTimeDays).toBe(0);
            (0, globals_1.expect)(result.metrics.wipCount).toBe(0);
        });
    });
});

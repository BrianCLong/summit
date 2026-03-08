"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const globals_1 = require("@jest/globals");
const WarPlanEngine_js_1 = require("../war-plan/WarPlanEngine.js");
const buildCompliantSnapshot = () => {
    const journeys = Array.from({ length: 5 }).map((_, index) => ({
        name: `journey-${index + 1}`,
        hasSloDashboard: true,
        hasBurnAlerts: true,
        hasRunbook: true,
        gameDayValidated: true,
    }));
    return {
        day: 45,
        journeys,
        reliability: [
            { service: 'core-api', availability: 0.9995, mttrMinutes: 8, tier: 'T0' },
            { service: 'graph', availability: 0.999, mttrMinutes: 10, tier: 'T1' },
        ],
        costs: [
            {
                service: 'core-api',
                weeklyBudget: 10000,
                actualSpend: 9200,
                perWorkspaceBaseline: 50,
                perWorkspaceActual: 52,
                telemetryCap: 1000,
                telemetryActual: 800,
                storageCap: 2000,
                storageActual: 1500,
            },
        ],
        security: {
            criticalFindings: 0,
            auditLoggingEnabled: true,
            privilegedAuditCoverage: true,
            ssoMfaEnforced: true,
            sharedAccountsRemoved: true,
        },
        noisyAlertsRemoved: 12,
        deletionsCompleted: 6,
        progressiveDeliveryEnabled: true,
        costDashboardsReady: true,
        ssoMfaCoverage: true,
        adminAuditLogging: true,
        backlogInPlace: true,
        riskRegister: [
            {
                id: '1',
                description: 'Data pipeline breach',
                severity: 'high',
                owner: 'alice',
                dueDate: new Date(Date.now() + 86400000).toISOString(),
            },
        ],
        canonicalFlowsLive: true,
        lowUsageFeaturesRemoved: 5,
        toolingConsolidated: true,
        queueConsolidated: true,
        crossDomainReadsRemoved: true,
        migrationFactoryUsed: true,
        dualWritesEliminated: 1,
        constraintsEnforced: true,
        reconciliationJobsRunning: true,
        idempotencyCoverage: true,
        telemetryStreamsDeleted: 6,
        dependenciesUpgraded: 3,
        servicesCollapsed: 2,
        topTelemetryDashboardsDeleted: 5,
        queriesOptimized: 22,
        cachingShipped: true,
        frontendBundleReduced: true,
        autoscalingCaps: true,
        quotasLive: true,
        jobWasteReduced: true,
        costAnomalyDetection: true,
        archivePolicies: true,
        trustCenterLive: true,
        auditExportsEnabled: true,
        scimRbacTemplates: true,
        retentionControls: true,
        entitlementsCentralized: true,
        meteringAccuracyChecks: true,
        upgradesSelfServe: true,
        dunningRetries: true,
        cancellationReasons: true,
    };
};
(0, globals_1.describe)('WarPlanEngine', () => {
    const engine = new WarPlanEngine_js_1.WarPlanEngine();
    (0, globals_1.it)('flags guardrail violations across reliability, cost, security, and journeys', () => {
        const snapshot = {
            reliability: [
                { service: 'api', availability: 0.995, mttrMinutes: 30, tier: 'T0' },
                { service: 'worker', availability: 0.999, mttrMinutes: 10, tier: 'T1' },
            ],
            journeys: [
                {
                    name: 'revenue-flow',
                    hasSloDashboard: false,
                    hasBurnAlerts: false,
                    hasRunbook: true,
                    gameDayValidated: false,
                },
            ],
            costs: [
                {
                    service: 'api',
                    weeklyBudget: 1000,
                    actualSpend: 1200,
                    perWorkspaceBaseline: 10,
                    perWorkspaceActual: 11,
                    telemetryCap: 100,
                    telemetryActual: 120,
                    storageCap: 200,
                    storageActual: 150,
                },
            ],
            security: {
                criticalFindings: 1,
                auditLoggingEnabled: false,
                privilegedAuditCoverage: false,
                ssoMfaEnforced: false,
                sharedAccountsRemoved: false,
            },
        };
        const report = engine.evaluateGuardrails(snapshot);
        (0, globals_1.expect)(report.reliability.compliant).toBe(false);
        (0, globals_1.expect)(report.cost.compliant).toBe(false);
        (0, globals_1.expect)(report.security.compliant).toBe(false);
        (0, globals_1.expect)(report.journeys.compliant).toBe(false);
    });
    (0, globals_1.it)('emits burn alerts when the error budget is consumed', () => {
        const status = engine.evaluateErrorBudget(30);
        (0, globals_1.expect)(status.exhausted).toBe(false);
        (0, globals_1.expect)(status.alerts).toEqual([0.25, 0.5]);
        (0, globals_1.expect)(status.remainingMinutes).toBeCloseTo(13.2);
    });
    (0, globals_1.it)('enforces weekly cost budgets and recommends throttling', () => {
        const report = engine.evaluateCostBudgets([
            {
                service: 'api',
                weeklyBudget: 1000,
                actualSpend: 1100,
                perWorkspaceBaseline: 10,
                perWorkspaceActual: 11,
                telemetryCap: 100,
                telemetryActual: 90,
                storageCap: 100,
                storageActual: 101,
                burstyTenants: ['tenant-a'],
            },
        ]);
        (0, globals_1.expect)(report.statuses[0].alertLevel).toBe(1);
        (0, globals_1.expect)(report.statuses[0].throttleRecommended).toBe(true);
        (0, globals_1.expect)(report.nonCompliant).toContain('api');
    });
    (0, globals_1.it)('requires non-negotiable controls before shipping', () => {
        const checklist = {
            domainOwner: null,
            sloGatesEnforced: false,
            deprecationWindowDays: 0,
            auditLoggingEnabled: false,
            rollbackPlan: {
                autoRollbackEnabled: false,
                triggers: [],
                testedInGameDay: false,
            },
            documentationLinks: [],
            supportTrainingComplete: false,
        };
        const result = engine.enforceNonNegotiables(checklist);
        (0, globals_1.expect)(result.compliant).toBe(false);
        (0, globals_1.expect)(result.missing).toEqual(globals_1.expect.arrayContaining([
            'domain_owner',
            'slo_ci_gates',
            'deprecation_window',
            'audit_logging',
            'auto_rollback',
            'rollback_triggers',
            'support_training',
        ]));
    });
    (0, globals_1.it)('validates acceptance criteria including observability', () => {
        const criteria = {
            successMetrics: [],
            rolloutPlan: '',
            rollbackPlan: {
                autoRollbackEnabled: false,
                triggers: [],
                testedInGameDay: false,
            },
            documentation: [],
            supportTraining: false,
            observability: {
                sloDefined: false,
                burnAlertsEnabled: false,
                tracingEnabled: false,
                structuredLogging: false,
                correlationIds: false,
            },
        };
        const result = engine.validateAcceptanceCriteria(criteria);
        (0, globals_1.expect)(result.compliant).toBe(false);
        (0, globals_1.expect)(result.missing).toEqual(globals_1.expect.arrayContaining([
            'success_metrics',
            'rollout_plan',
            'auto_rollback',
            'tracing',
            'correlation_ids',
        ]));
    });
    (0, globals_1.it)('enforces one-in/one-out surface area changes', () => {
        const result = engine.checkSurfaceAreaFreeze({ added: ['new-endpoint'], removed: [] });
        (0, globals_1.expect)(result.compliant).toBe(false);
        (0, globals_1.expect)(result.violations).toContain('one_out_required');
    });
    (0, globals_1.it)('keeps only the top 10 risks and flags stale entries', () => {
        const risks = [
            {
                id: '1',
                description: 'expired',
                severity: 'medium',
                owner: '',
                dueDate: 'invalid',
            },
            {
                id: '2',
                description: 'critical risk',
                severity: 'high',
                owner: 'owner',
                dueDate: new Date(Date.now() + 3600_000).toISOString(),
            },
            {
                id: '3',
                description: 'minor',
                severity: 'low',
                owner: 'owner',
                dueDate: new Date(Date.now() + 7200_000).toISOString(),
            },
        ];
        const status = engine.normalizeRiskRegister(risks);
        (0, globals_1.expect)(status.topRisks[0].id).toBe('2');
        (0, globals_1.expect)(status.staleOrMissing).toHaveLength(1);
    });
    (0, globals_1.it)('marks all phases compliant when the snapshot satisfies the war plan', () => {
        const snapshot = buildCompliantSnapshot();
        const phases = engine.assessPhaseProgress(snapshot);
        (0, globals_1.expect)(phases.phases.every((phase) => phase.compliant)).toBe(true);
        const scoreboard = engine.summarizeScoreboard(snapshot);
        (0, globals_1.expect)(scoreboard.reliability.compliant).toBe(true);
        (0, globals_1.expect)(scoreboard.delivery.phases.map((phase) => phase.name)).toEqual([
            'Phase 1',
            'Phase 2',
            'Phase 3',
        ]);
    });
});

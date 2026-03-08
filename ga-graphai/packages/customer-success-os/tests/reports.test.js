"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const vitest_1 = require("vitest");
const reports_1 = require("../src/reports");
(0, vitest_1.describe)('reports', () => {
    const health = {
        tenantId: 't',
        score: 82,
        components: [],
        alerts: [],
        updatedAt: new Date('2025-01-06T10:00:00Z')
    };
    const timeline = {
        deployments: 2,
        incidents: 1,
        configChanges: 1,
        recipesCompleted: 3,
        stalledOnboardingHours: 10,
        lastValueProof: 'dashboard-export'
    };
    (0, vitest_1.it)('builds an executive update with highlights, risks, planned fixes, and artifacts', () => {
        const actions = [
            { id: 'a1', category: 'support', description: 'Fix ingestion retries', artifacts: ['incident-log'] },
            { id: 'a2', category: 'governance', description: 'Enable approvals for risky actions' }
        ];
        const alerts = [
            {
                kind: 'error-spike',
                severity: 'critical',
                message: 'Error spike or slow recovery detected',
                recommendedPlaybook: 'Activate incident comms',
                occurredAt: new Date()
            }
        ];
        const update = (0, reports_1.buildExecutiveUpdate)(health, timeline, actions, alerts);
        (0, vitest_1.expect)(update.highlights[0]).toContain('Health score');
        (0, vitest_1.expect)(update.risks.length).toBeGreaterThan(0);
        (0, vitest_1.expect)(update.plannedFixes.length).toBe(2);
        (0, vitest_1.expect)(update.artifacts).toContain('roi-dashboard');
    });
    (0, vitest_1.it)('creates a friction log from tickets and alerts', () => {
        const tickets = [
            { id: 't1', type: 'ingest-failure', severity: 'p1', churnRisk: true, revenueImpact: 'high', repeating: true }
        ];
        const alerts = [
            {
                kind: 'unpaid-invoice',
                severity: 'medium',
                message: 'Unpaid invoices detected; risk of suspension',
                recommendedPlaybook: 'Coordinate with finance, set remediation deadline, communicate grace window',
                occurredAt: new Date()
            }
        ];
        const friction = (0, reports_1.buildFrictionLog)(tickets, alerts);
        (0, vitest_1.expect)(friction.length).toBe(2);
        (0, vitest_1.expect)(friction[0].owner).toBe('product');
        (0, vitest_1.expect)(friction[1].owner).toBe('finance');
    });
});

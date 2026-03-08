"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const vitest_1 = require("vitest");
const healthScoring_1 = require("../src/healthScoring");
const baseline = {
    tenantId: 'tenant-1',
    adoption: { depthScore: 8, widthScore: 7, stickiness: 80 },
    reliability: { errorRate: 1, mttrMinutes: 30, slaBreaches: 0 },
    support: { openTickets: 1, churnRiskTagged: 0, sentiment: 40, sponsorStrength: 80 },
    billing: { unpaidInvoices: 0, invoiceAgingDays: 0, overageRisk: false },
    lastUpdated: new Date('2025-01-01T00:00:00Z')
};
(0, vitest_1.describe)('calculateHealthScore', () => {
    (0, vitest_1.it)('computes weighted score and components', () => {
        const result = (0, healthScoring_1.calculateHealthScore)(baseline);
        (0, vitest_1.expect)(result.score).toBeGreaterThan(70);
        (0, vitest_1.expect)(result.components).toHaveLength(7);
        (0, vitest_1.expect)(result.components.find((c) => c.component === 'adoption')?.score).toBeGreaterThan(0);
    });
    (0, vitest_1.it)('emits alerts when adoption drops and errors spike', () => {
        const current = {
            ...baseline,
            adoption: { depthScore: 3, widthScore: 3, stickiness: 40 },
            reliability: { errorRate: 12, mttrMinutes: 200, slaBreaches: 1 },
            billing: { unpaidInvoices: 1, invoiceAgingDays: 45, overageRisk: true },
            support: { openTickets: 4, churnRiskTagged: 2, sentiment: -10, sponsorStrength: 30 },
            lastUpdated: new Date('2025-01-08T00:00:00Z')
        };
        const result = (0, healthScoring_1.calculateHealthScore)(current, baseline);
        const kinds = result.alerts.map((a) => a.kind);
        (0, vitest_1.expect)(kinds).toContain('adoption-drop');
        (0, vitest_1.expect)(kinds).toContain('error-spike');
        (0, vitest_1.expect)(kinds).toContain('sla-risk');
        (0, vitest_1.expect)(kinds).toContain('unpaid-invoice');
        (0, vitest_1.expect)(kinds).toContain('sponsor-disengaged');
    });
});

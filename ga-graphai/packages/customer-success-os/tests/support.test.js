"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const vitest_1 = require("vitest");
const support_1 = require("../src/support");
(0, vitest_1.describe)('buildSupportPlan', () => {
    (0, vitest_1.it)('tags churn-risk tickets and adds deflection and escalation playbooks', () => {
        const tickets = [
            { id: 't1', type: 'login-error', severity: 'p1', churnRisk: true, revenueImpact: 'high', repeating: false }
        ];
        const alerts = [
            {
                kind: 'error-spike',
                severity: 'critical',
                message: 'Spike',
                recommendedPlaybook: 'Activate incident comms',
                occurredAt: new Date()
            }
        ];
        const plan = (0, support_1.buildSupportPlan)(tickets, alerts);
        (0, vitest_1.expect)(plan.taggedTickets[0].type).toContain('churn-risk');
        (0, vitest_1.expect)(plan.deflection.length).toBeGreaterThan(0);
        (0, vitest_1.expect)(plan.escalations[0].requiresApproval).toBe(true);
        (0, vitest_1.expect)(plan.copilot.artifacts).toContain('bug-mapping');
    });
});

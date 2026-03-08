"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const vitest_1 = require("vitest");
const onboarding_1 = require("../src/onboarding");
const profile = {
    id: 'tenant-2',
    name: 'ACME',
    segment: 'enterprise',
    icp: 'regulated',
    targetUseCases: ['governance'],
    tier: 'premium'
};
(0, vitest_1.describe)('buildOnboardingPlan', () => {
    (0, vitest_1.it)('builds day 7/14/30 outcomes and hypercare actions', () => {
        const metrics = {
            ssoLive: true,
            integrations: 2,
            datasetsIngested: 1,
            recipesCompleted: 2,
            activeUsers: 15,
            errorsBelowBudget: true,
            dashboardsShipped: 2,
            championTrained: true,
            hypercareResponseMinutes: 20,
            businessReviewScheduled: true,
            backlogOfUseCases: 3
        };
        const { outcomes, hypercare } = (0, onboarding_1.buildOnboardingPlan)(profile, metrics, new Date());
        (0, vitest_1.expect)(outcomes).toHaveLength(3);
        (0, vitest_1.expect)(outcomes.find((o) => o.stage === 'day7')?.completed).toBe(true);
        (0, vitest_1.expect)(outcomes.find((o) => o.stage === 'day30')?.completed).toBe(true);
        (0, vitest_1.expect)(hypercare.some((action) => action.slaMinutes === 30)).toBe(true);
        (0, vitest_1.expect)(hypercare.some((action) => action.id.includes('office-hours'))).toBe(true);
    });
    (0, vitest_1.it)('surfaces blockers when targets are missed', () => {
        const metrics = {
            ssoLive: false,
            integrations: 0,
            datasetsIngested: 0,
            recipesCompleted: 0,
            activeUsers: 1,
            errorsBelowBudget: false,
            dashboardsShipped: 0,
            championTrained: false,
            hypercareResponseMinutes: 120,
            businessReviewScheduled: false,
            backlogOfUseCases: 0
        };
        const { outcomes } = (0, onboarding_1.buildOnboardingPlan)(profile, metrics, new Date());
        const day7 = outcomes.find((o) => o.stage === 'day7');
        (0, vitest_1.expect)(day7?.completed).toBe(false);
        (0, vitest_1.expect)(day7?.blockers).toContain('SSO live');
    });
});

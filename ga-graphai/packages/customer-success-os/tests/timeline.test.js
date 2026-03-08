"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const vitest_1 = require("vitest");
const timeline_1 = require("../src/timeline");
(0, vitest_1.describe)('summarizeTimeline', () => {
    (0, vitest_1.it)('derives insights and stalled onboarding time from timeline events', () => {
        const now = new Date();
        const events = [
            { id: '1', tenantId: 't', kind: 'deployment.published', timestamp: now, metadata: {} },
            { id: '2', tenantId: 't', kind: 'recipe.completed', timestamp: new Date(now.getTime() - 60 * 60 * 1000), metadata: { artifact: 'value-proof' } },
            { id: '3', tenantId: 't', kind: 'error.raised', timestamp: now, metadata: {} },
            { id: '4', tenantId: 't', kind: 'config.changed', timestamp: now, metadata: {} }
        ];
        const insight = (0, timeline_1.summarizeTimeline)(events, now);
        (0, vitest_1.expect)(insight.deployments).toBe(1);
        (0, vitest_1.expect)(insight.incidents).toBe(1);
        (0, vitest_1.expect)(insight.configChanges).toBe(1);
        (0, vitest_1.expect)(insight.recipesCompleted).toBe(1);
        (0, vitest_1.expect)(insight.stalledOnboardingHours).toBe(1);
        (0, vitest_1.expect)(insight.lastValueProof).toBe('value-proof');
    });
});

"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const vitest_1 = require("vitest");
const collaboration_js_1 = require("../src/collaboration.js");
(0, vitest_1.describe)('WorkspaceCollaborationClient', () => {
    (0, vitest_1.it)('prefers newer sync payloads and flags stale presences', () => {
        const client = new collaboration_js_1.WorkspaceCollaborationClient({ stalenessMs: 800, activityLimit: 2 });
        const initial = {
            workspaceId: 'intel-workspace',
            version: 1,
            entries: [],
            presences: [
                {
                    analyst: { id: 'analyst-1', displayName: 'Analyst One' },
                    status: 'active',
                    lastSeen: 1_000,
                    focus: 'graph',
                },
            ],
            activities: [
                {
                    id: 'activity-1',
                    type: 'update',
                    actor: { id: 'analyst-1', displayName: 'Analyst One' },
                    timestamp: 900,
                    description: 'seed update',
                },
            ],
        };
        client.ingestSync(initial);
        const staleIndicators = client.presenceIndicators(1_900);
        (0, vitest_1.expect)(staleIndicators[0].isStale).toBe(true);
        (0, vitest_1.expect)(staleIndicators[0].status).toBe('offline');
        const newer = {
            workspaceId: 'intel-workspace',
            version: 2,
            entries: [],
            presences: [
                {
                    analyst: { id: 'analyst-1', displayName: 'Analyst One' },
                    status: 'active',
                    lastSeen: 1_700,
                    focus: 'timeline',
                },
                {
                    analyst: { id: 'analyst-2', displayName: 'Analyst Two' },
                    status: 'idle',
                    lastSeen: 1_600,
                    activity: 'reviewing notes',
                },
            ],
            activities: [
                {
                    id: 'activity-2',
                    type: 'presence',
                    actor: { id: 'analyst-2', displayName: 'Analyst Two' },
                    timestamp: 1_650,
                    description: 'joined workspace',
                },
                {
                    id: 'activity-3',
                    type: 'update',
                    actor: { id: 'analyst-1', displayName: 'Analyst One' },
                    timestamp: 1_800,
                    description: 'refined hypothesis',
                    relatedKeys: ['hypothesis'],
                },
            ],
        };
        client.ingestSync(newer);
        const indicators = client.presenceIndicators(1_900);
        const refreshed = indicators.find((presence) => presence.analystId === 'analyst-1');
        (0, vitest_1.expect)(refreshed?.status).toBe('active');
        (0, vitest_1.expect)(refreshed?.focus).toBe('timeline');
        const stream = client.activityStream();
        (0, vitest_1.expect)(stream).toHaveLength(2);
        (0, vitest_1.expect)(stream[0].id).toBe('activity-3');
        (0, vitest_1.expect)(stream.at(-1)?.id).toBe('activity-2');
    });
});

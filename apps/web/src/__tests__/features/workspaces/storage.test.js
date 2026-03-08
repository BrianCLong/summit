"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const vitest_1 = require("vitest");
const storage_1 = require("@/features/workspaces/storage");
const presets_1 = require("@/features/workspaces/presets");
(0, vitest_1.describe)('workspace layout persistence', () => {
    const userKey = 'user-1';
    (0, vitest_1.beforeEach)(() => {
        localStorage.clear();
    });
    (0, vitest_1.it)('returns default state when storage is empty', () => {
        const state = (0, storage_1.loadWorkspaceState)(userKey, '/current');
        (0, vitest_1.expect)(state.version).toBe(presets_1.WORKSPACE_STORAGE_VERSION);
        (0, vitest_1.expect)(state.activeWorkspaceId).toBe('investigate');
        (0, vitest_1.expect)(state.workspaces.investigate.lastRoute).toBe('/current');
    });
    (0, vitest_1.it)('migrates legacy v1 layouts and preserves active workspace', () => {
        const legacy = {
            activeWorkspaceId: 'review',
            layouts: {
                review: {
                    panels: {
                        graph: { visible: true, size: 5 },
                        timeline: { visible: true, size: 4 },
                    },
                    defaultRoute: '/cases/review',
                },
            },
        };
        localStorage.setItem(`intelgraph.workspaces.${userKey}`, JSON.stringify(legacy));
        const migrated = (0, storage_1.loadWorkspaceState)(userKey, '/current');
        (0, vitest_1.expect)(migrated.version).toBe(presets_1.WORKSPACE_STORAGE_VERSION);
        (0, vitest_1.expect)(migrated.activeWorkspaceId).toBe('review');
        (0, vitest_1.expect)(migrated.workspaces.review.panels.graph.size).toBe(5);
        (0, vitest_1.expect)(migrated.workspaces.review.defaultRoute).toBe('/cases/review');
    });
    (0, vitest_1.it)('persists layouts per user key', () => {
        const state = (0, storage_1.loadWorkspaceState)(userKey, '/tri-pane');
        (0, storage_1.persistWorkspaceState)(userKey, {
            ...state,
            activeWorkspaceId: 'briefing',
        });
        const otherUserState = (0, storage_1.loadWorkspaceState)('user-2', '/tri-pane');
        (0, vitest_1.expect)(otherUserState.activeWorkspaceId).toBe('investigate');
    });
    (0, vitest_1.it)('fills missing panels with defaults during migration', () => {
        const defaultPreset = (0, storage_1.getDefaultPresetFor)('briefing', '/reports');
        const migrated = (0, storage_1.migrateWorkspaceState)({
            version: presets_1.WORKSPACE_STORAGE_VERSION,
            activeWorkspaceId: 'briefing',
            workspaces: {
                briefing: {
                    ...defaultPreset,
                    panels: {
                        graph: { visible: true, size: 2 },
                    },
                },
            },
        }, '/reports');
        (0, vitest_1.expect)(migrated.workspaces.briefing.panels.map.visible).toBe(false);
        (0, vitest_1.expect)(migrated.workspaces.briefing.panels.timeline.visible).toBe(true);
    });
});

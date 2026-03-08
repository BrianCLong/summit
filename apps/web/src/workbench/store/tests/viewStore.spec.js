"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const vitest_1 = require("vitest");
const viewStore_1 = require("../viewStore");
(0, vitest_1.describe)('Workbench Store', () => {
    (0, vitest_1.beforeEach)(() => {
        // Reset store state before each test
        viewStore_1.useWorkbenchStore.setState({
            leftRailOpen: true,
            rightRailOpen: true,
            selectedEntityIds: [],
            savedViews: [],
            filters: {
                nodeTypes: [],
                edgeTypes: [],
                showProvenance: false,
            }
        });
    });
    (0, vitest_1.it)('toggles rails', () => {
        const { toggleLeftRail, toggleRightRail } = viewStore_1.useWorkbenchStore.getState();
        toggleLeftRail();
        (0, vitest_1.expect)(viewStore_1.useWorkbenchStore.getState().leftRailOpen).toBe(false);
        toggleRightRail();
        (0, vitest_1.expect)(viewStore_1.useWorkbenchStore.getState().rightRailOpen).toBe(false);
    });
    (0, vitest_1.it)('selects entities', () => {
        const { selectEntity } = viewStore_1.useWorkbenchStore.getState();
        selectEntity('1');
        (0, vitest_1.expect)(viewStore_1.useWorkbenchStore.getState().selectedEntityIds).toEqual(['1']);
        // Multi-select
        selectEntity('2', true);
        (0, vitest_1.expect)(viewStore_1.useWorkbenchStore.getState().selectedEntityIds).toEqual(['1', '2']);
        // Toggle off in multi-select
        selectEntity('1', true);
        (0, vitest_1.expect)(viewStore_1.useWorkbenchStore.getState().selectedEntityIds).toEqual(['2']);
        // Single select replaces selection
        selectEntity('3');
        (0, vitest_1.expect)(viewStore_1.useWorkbenchStore.getState().selectedEntityIds).toEqual(['3']);
    });
    (0, vitest_1.it)('clears selection', () => {
        const { selectEntity, clearSelection } = viewStore_1.useWorkbenchStore.getState();
        selectEntity('1');
        (0, vitest_1.expect)(viewStore_1.useWorkbenchStore.getState().selectedEntityIds).toHaveLength(1);
        clearSelection();
        (0, vitest_1.expect)(viewStore_1.useWorkbenchStore.getState().selectedEntityIds).toHaveLength(0);
    });
    (0, vitest_1.it)('manages saved views', () => {
        const { saveView, deleteView } = viewStore_1.useWorkbenchStore.getState();
        const view1 = {
            id: 'v1',
            name: 'Test View 1',
            timestamp: Date.now(),
            state: {
                nodes: [{ id: 'n1', name: 'Node 1', type: 'PERSON', confidence: 1 }],
                edges: [],
                transform: { x: 0, y: 0, k: 1 },
                filters: { types: [], timeRange: null },
                selection: ['n1']
            }
        };
        // Test Save
        saveView(view1);
        (0, vitest_1.expect)(viewStore_1.useWorkbenchStore.getState().savedViews).toHaveLength(1);
        (0, vitest_1.expect)(viewStore_1.useWorkbenchStore.getState().savedViews[0].id).toBe('v1');
        // Test Overwrite/Update
        const view1Updated = { ...view1, name: 'Updated View 1' };
        saveView(view1Updated);
        (0, vitest_1.expect)(viewStore_1.useWorkbenchStore.getState().savedViews).toHaveLength(1);
        (0, vitest_1.expect)(viewStore_1.useWorkbenchStore.getState().savedViews[0].name).toBe('Updated View 1');
        // Test Delete
        deleteView('v1');
        (0, vitest_1.expect)(viewStore_1.useWorkbenchStore.getState().savedViews).toHaveLength(0);
    });
    (0, vitest_1.it)('loads a view (mock implementation)', () => {
        // The store currently logs on loadView, but we can verify the function exists and doesn't crash
        const { loadView } = viewStore_1.useWorkbenchStore.getState();
        const consoleSpy = vitest_1.vi.spyOn(console, 'log');
        loadView('v1');
        (0, vitest_1.expect)(consoleSpy).toHaveBeenCalledWith('Loading view', 'v1');
    });
    (0, vitest_1.it)('initializes with no saved views', () => {
        (0, vitest_1.expect)(viewStore_1.useWorkbenchStore.getState().savedViews).toEqual([]);
    });
});

"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const vitest_1 = require("vitest");
const workspaceStore_1 = require("./workspaceStore");
(0, vitest_1.describe)('workspaceStore Integration', () => {
    (0, vitest_1.beforeEach)(() => {
        vitest_1.vi.useFakeTimers();
        workspaceStore_1.useWorkspaceStore.setState(workspaceStore_1.useWorkspaceStore.getInitialState ? workspaceStore_1.useWorkspaceStore.getInitialState() : {
            selectedEntityIds: [],
            timeWindow: { startMs: 0, endMs: 0, granularity: 'minute', tzMode: 'UTC', seq: 0 },
            allEntities: [],
            allLinks: [],
            entities: [],
            links: [],
            isSyncing: false,
            syncError: null
        }, true);
    });
    (0, vitest_1.afterEach)(() => {
        vitest_1.vi.useRealTimers();
        vitest_1.vi.clearAllMocks();
    });
    (0, vitest_1.it)('should update timeWindow and increment seq', () => {
        const { setTimeWindow, timeWindow: initialWindow } = workspaceStore_1.useWorkspaceStore.getState();
        const initialSeq = initialWindow.seq;
        setTimeWindow(1000, 2000, 'minute', 'UTC');
        const { timeWindow: newWindow, isSyncing } = workspaceStore_1.useWorkspaceStore.getState();
        (0, vitest_1.expect)(newWindow.seq).toBe(initialSeq + 1);
        (0, vitest_1.expect)(isSyncing).toBe(true);
    });
    (0, vitest_1.it)('should update entities after latency', () => {
        const { setTimeWindow } = workspaceStore_1.useWorkspaceStore.getState();
        // Set some dummy data
        const dummyEntities = [
            { id: '1', type: 't', label: 'l', timestamp: '2023-01-01T10:00:00Z' }, // inside
            { id: '2', type: 't', label: 'l', timestamp: '2023-01-02T10:00:00Z' } // outside
        ];
        workspaceStore_1.useWorkspaceStore.setState({ allEntities: dummyEntities, entities: dummyEntities });
        // Window covering '1' but not '2'
        const start = new Date('2023-01-01T00:00:00Z').getTime();
        const end = new Date('2023-01-01T23:59:59Z').getTime();
        setTimeWindow(start, end);
        // Should be syncing initially
        (0, vitest_1.expect)(workspaceStore_1.useWorkspaceStore.getState().isSyncing).toBe(true);
        // Fast-forward time
        vitest_1.vi.advanceTimersByTime(300);
        const { entities, isSyncing } = workspaceStore_1.useWorkspaceStore.getState();
        (0, vitest_1.expect)(isSyncing).toBe(false);
        (0, vitest_1.expect)(entities).toHaveLength(1);
        (0, vitest_1.expect)(entities[0].id).toBe('1');
    });
    (0, vitest_1.it)('should handle race conditions (last write wins)', () => {
        const { setTimeWindow } = workspaceStore_1.useWorkspaceStore.getState();
        const dummyEntities = [{ id: '1', type: 't', label: 'l', timestamp: '2023-01-01T10:00:00Z' }];
        workspaceStore_1.useWorkspaceStore.setState({ allEntities: dummyEntities });
        // Use values large enough to not round to 0 (minute granularity = 60000ms)
        // First update (slow)
        setTimeWindow(60000, 120000);
        // Immediate second update (fast)
        setTimeWindow(180000, 240000);
        // Advance time. The first fetch should be aborted or ignored.
        vitest_1.vi.advanceTimersByTime(300);
        const { timeWindow } = workspaceStore_1.useWorkspaceStore.getState();
        // The active window should be the second one
        (0, vitest_1.expect)(timeWindow.startMs).toBeGreaterThanOrEqual(180000); // Normalized
    });
});

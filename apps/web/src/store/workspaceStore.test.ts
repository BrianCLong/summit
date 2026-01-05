import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { useWorkspaceStore } from './workspaceStore';

describe('workspaceStore Integration', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    useWorkspaceStore.setState(useWorkspaceStore.getInitialState ? useWorkspaceStore.getInitialState() : {
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

  afterEach(() => {
    vi.useRealTimers();
    vi.clearAllMocks();
  });

  it('should update timeWindow and increment seq', () => {
    const { setTimeWindow, timeWindow: initialWindow } = useWorkspaceStore.getState();
    const initialSeq = initialWindow.seq;

    setTimeWindow(1000, 2000, 'minute', 'UTC');

    const { timeWindow: newWindow, isSyncing } = useWorkspaceStore.getState();
    expect(newWindow.seq).toBe(initialSeq + 1);
    expect(isSyncing).toBe(true);
  });

  it('should update entities after latency', () => {
    const { setTimeWindow } = useWorkspaceStore.getState();

    // Set some dummy data
    const dummyEntities = [
        { id: '1', type: 't', label: 'l', timestamp: '2023-01-01T10:00:00Z' }, // inside
        { id: '2', type: 't', label: 'l', timestamp: '2023-01-02T10:00:00Z' }  // outside
    ];
    useWorkspaceStore.setState({ allEntities: dummyEntities, entities: dummyEntities });

    // Window covering '1' but not '2'
    const start = new Date('2023-01-01T00:00:00Z').getTime();
    const end = new Date('2023-01-01T23:59:59Z').getTime();

    setTimeWindow(start, end);

    // Should be syncing initially
    expect(useWorkspaceStore.getState().isSyncing).toBe(true);

    // Fast-forward time
    vi.advanceTimersByTime(300);

    const { entities, isSyncing } = useWorkspaceStore.getState();
    expect(isSyncing).toBe(false);
    expect(entities).toHaveLength(1);
    expect(entities[0].id).toBe('1');
  });

  it('should handle race conditions (last write wins)', () => {
    const { setTimeWindow } = useWorkspaceStore.getState();
    const dummyEntities = [{ id: '1', type: 't', label: 'l', timestamp: '2023-01-01T10:00:00Z' }];
    useWorkspaceStore.setState({ allEntities: dummyEntities });

    // Use values large enough to not round to 0 (minute granularity = 60000ms)
    // First update (slow)
    setTimeWindow(60000, 120000);
    // Immediate second update (fast)
    setTimeWindow(180000, 240000);

    // Advance time. The first fetch should be aborted or ignored.
    vi.advanceTimersByTime(300);

    const { timeWindow } = useWorkspaceStore.getState();
    // The active window should be the second one
    expect(timeWindow.startMs).toBeGreaterThanOrEqual(180000); // Normalized
  });
});

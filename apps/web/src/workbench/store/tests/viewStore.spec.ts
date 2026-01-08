import { describe, it, expect, vi, beforeEach } from 'vitest'
import { useWorkbenchStore } from '../viewStore'

describe('Workbench Store', () => {
  beforeEach(() => {
    // Reset store state before each test
    useWorkbenchStore.setState({
      leftRailOpen: true,
      rightRailOpen: true,
      selectedEntityIds: [],
      savedViews: [],
      filters: {
        nodeTypes: [],
        edgeTypes: [],
        showProvenance: false,
      },
    })
  })

  it('toggles rails', () => {
    const { toggleLeftRail, toggleRightRail } = useWorkbenchStore.getState()

    toggleLeftRail()
    expect(useWorkbenchStore.getState().leftRailOpen).toBe(false)

    toggleRightRail()
    expect(useWorkbenchStore.getState().rightRailOpen).toBe(false)
  })

  it('selects entities', () => {
    const { selectEntity } = useWorkbenchStore.getState()

    selectEntity('1')
    expect(useWorkbenchStore.getState().selectedEntityIds).toEqual(['1'])

    // Multi-select
    selectEntity('2', true)
    expect(useWorkbenchStore.getState().selectedEntityIds).toEqual(['1', '2'])

    // Toggle off in multi-select
    selectEntity('1', true)
    expect(useWorkbenchStore.getState().selectedEntityIds).toEqual(['2'])

    // Single select replaces selection
    selectEntity('3')
    expect(useWorkbenchStore.getState().selectedEntityIds).toEqual(['3'])
  })

  it('clears selection', () => {
    const { selectEntity, clearSelection } = useWorkbenchStore.getState()
    selectEntity('1')
    expect(useWorkbenchStore.getState().selectedEntityIds).toHaveLength(1)

    clearSelection()
    expect(useWorkbenchStore.getState().selectedEntityIds).toHaveLength(0)
  })

  it('manages saved views', () => {
    const { saveView, deleteView } = useWorkbenchStore.getState()
    const view1 = {
      id: 'v1',
      name: 'Test View 1',
      timestamp: Date.now(),
      state: {
        nodes: [{ id: 'n1', name: 'Node 1', type: 'PERSON', confidence: 1 }],
        edges: [],
        transform: { x: 0, y: 0, k: 1 },
        filters: { types: [], timeRange: null },
        selection: ['n1'],
      },
    }

    // Test Save
    saveView(view1)
    expect(useWorkbenchStore.getState().savedViews).toHaveLength(1)
    expect(useWorkbenchStore.getState().savedViews[0].id).toBe('v1')

    // Test Overwrite/Update
    const view1Updated = { ...view1, name: 'Updated View 1' }
    saveView(view1Updated)
    expect(useWorkbenchStore.getState().savedViews).toHaveLength(1)
    expect(useWorkbenchStore.getState().savedViews[0].name).toBe(
      'Updated View 1'
    )

    // Test Delete
    deleteView('v1')
    expect(useWorkbenchStore.getState().savedViews).toHaveLength(0)
  })

  it('loads a view (mock implementation)', () => {
    // The store currently logs on loadView, but we can verify the function exists and doesn't crash
    const { loadView } = useWorkbenchStore.getState()
    const consoleSpy = vi.spyOn(console, 'log')
    loadView('v1')
    expect(consoleSpy).toHaveBeenCalledWith('Loading view', 'v1')
  })

  it('initializes with no saved views', () => {
    expect(useWorkbenchStore.getState().savedViews).toEqual([])
  })
})

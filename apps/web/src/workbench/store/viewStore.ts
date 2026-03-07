import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import type { Entity, Relationship } from '@/types'

export interface GraphView {
  id: string
  name: string
  timestamp: number
  state: {
    nodes: Entity[]
    edges: Relationship[]
    transform: { x: number; y: number; k: number }
    filters: {
      types: string[]
      timeRange: { start: number; end: number } | null
    }
    selection: string[]
  }
}

interface WorkbenchState {
  // UI State
  leftRailOpen: boolean
  rightRailOpen: boolean
  toggleLeftRail: () => void
  toggleRightRail: () => void

  // Selection State
  selectedEntityIds: string[]
  selectEntity: (id: string, multi?: boolean) => void
  clearSelection: () => void

  // Graph State
  filters: {
    nodeTypes: string[]
    edgeTypes: string[]
    showProvenance: boolean
  }
  setFilter: (key: keyof WorkbenchState['filters'], value: any) => void

  // Saved Views
  savedViews: GraphView[]
  saveView: (view: GraphView) => void
  deleteView: (id: string) => void
  loadView: (id: string) => void
}

export const useWorkbenchStore = create<WorkbenchState>()(
  persist(
    (set, get) => ({
      leftRailOpen: true,
      rightRailOpen: true,
      toggleLeftRail: () =>
        set(state => ({ leftRailOpen: !state.leftRailOpen })),
      toggleRightRail: () =>
        set(state => ({ rightRailOpen: !state.rightRailOpen })),

      selectedEntityIds: [],
      selectEntity: (id, multi = false) =>
        set(state => {
          if (multi) {
            const isSelected = state.selectedEntityIds.includes(id)
            return {
              selectedEntityIds: isSelected
                ? state.selectedEntityIds.filter(eid => eid !== id)
                : [...state.selectedEntityIds, id],
            }
          }
          return { selectedEntityIds: [id] }
        }),
      clearSelection: () => set({ selectedEntityIds: [] }),

      filters: {
        nodeTypes: [],
        edgeTypes: [],
        showProvenance: false,
      },
      setFilter: (key, value) =>
        set(state => ({
          filters: { ...state.filters, [key]: value },
        })),

      savedViews: [],
      saveView: view =>
        set(state => ({
          savedViews: [...state.savedViews.filter(v => v.id !== view.id), view],
        })),
      deleteView: id =>
        set(state => ({
          savedViews: state.savedViews.filter(v => v.id !== id),
        })),
      loadView: id => {
        // Implementation would likely be handled by a side-effect or consumer
        console.log('Loading view', id)
      },
    }),
    {
      name: 'workbench-storage',
      partialize: state => ({
        savedViews: state.savedViews,
        leftRailOpen: state.leftRailOpen,
        rightRailOpen: state.rightRailOpen,
      }),
    }
  )
)

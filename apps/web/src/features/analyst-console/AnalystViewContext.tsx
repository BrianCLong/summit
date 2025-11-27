/**
 * Analyst View Context & Hooks
 *
 * Provides shared global view state across all panes (Graph, Timeline, Map)
 * in the analyst console. All panes react to the same state for synchronized
 * cross-highlighting, filtering, and selection.
 */

import React, {
  createContext,
  useContext,
  useState,
  useMemo,
  useCallback,
  type ReactNode,
} from 'react'
import type {
  AnalystViewState,
  TimeWindow,
  AnalystViewFilters,
  AnalystSelectionState,
} from './types'

// =============================================================================
// Context Types
// =============================================================================

interface AnalystViewContextValue {
  state: AnalystViewState
  setTimeWindow: (window: TimeWindow) => void
  setFilters: (filters: Partial<AnalystViewFilters>) => void
  setSelection: (selection: Partial<AnalystSelectionState>) => void
  resetSelection: () => void
  resetFilters: () => void
  resetAll: () => void
}

// =============================================================================
// Context Creation
// =============================================================================

const AnalystViewContext = createContext<AnalystViewContextValue | undefined>(
  undefined
)

// =============================================================================
// Provider Component
// =============================================================================

interface AnalystViewProviderProps {
  initialState: AnalystViewState
  children: ReactNode
}

/**
 * Provider component that wraps the analyst console and provides
 * shared view state to all child panes.
 */
export function AnalystViewProvider({
  initialState,
  children,
}: AnalystViewProviderProps) {
  const [state, setState] = useState<AnalystViewState>(initialState)

  // Store initial state for reset functionality
  const initialStateRef = React.useRef(initialState)

  /**
   * Update the global time window - affects filtering in all panes
   */
  const setTimeWindow = useCallback((timeWindow: TimeWindow) => {
    setState(prev => ({ ...prev, timeWindow }))
  }, [])

  /**
   * Update filters - merges with existing filters
   */
  const setFilters = useCallback((filters: Partial<AnalystViewFilters>) => {
    setState(prev => ({
      ...prev,
      filters: { ...prev.filters, ...filters },
    }))
  }, [])

  /**
   * Update selection - merges with existing selection
   */
  const setSelection = useCallback(
    (selection: Partial<AnalystSelectionState>) => {
      setState(prev => ({
        ...prev,
        selection: { ...prev.selection, ...selection },
      }))
    },
    []
  )

  /**
   * Clear all selections across all panes
   */
  const resetSelection = useCallback(() => {
    setState(prev => ({
      ...prev,
      selection: {
        selectedEntityIds: [],
        selectedEventIds: [],
        selectedLocationIds: [],
      },
    }))
  }, [])

  /**
   * Reset filters to initial state
   */
  const resetFilters = useCallback(() => {
    setState(prev => ({
      ...prev,
      filters: initialStateRef.current.filters,
    }))
  }, [])

  /**
   * Reset everything to initial state
   */
  const resetAll = useCallback(() => {
    setState(initialStateRef.current)
  }, [])

  // Memoize context value to prevent unnecessary re-renders
  const value = useMemo<AnalystViewContextValue>(
    () => ({
      state,
      setTimeWindow,
      setFilters,
      setSelection,
      resetSelection,
      resetFilters,
      resetAll,
    }),
    [
      state,
      setTimeWindow,
      setFilters,
      setSelection,
      resetSelection,
      resetFilters,
      resetAll,
    ]
  )

  return (
    <AnalystViewContext.Provider value={value}>
      {children}
    </AnalystViewContext.Provider>
  )
}

// =============================================================================
// Core Hook
// =============================================================================

/**
 * Main hook to access the analyst view context
 * @throws Error if used outside of AnalystViewProvider
 */
export function useAnalystView(): AnalystViewContextValue {
  const ctx = useContext(AnalystViewContext)
  if (!ctx) {
    throw new Error('useAnalystView must be used within AnalystViewProvider')
  }
  return ctx
}

// =============================================================================
// Convenience Hooks
// =============================================================================

/**
 * Hook for time brush functionality - get and set the global time window
 */
export function useGlobalTimeBrush() {
  const { state, setTimeWindow } = useAnalystView()
  return {
    timeWindow: state.timeWindow,
    setTimeWindow,
  }
}

/**
 * Hook for selection management across all panes
 */
export function useSelection() {
  const { state, setSelection, resetSelection } = useAnalystView()
  return {
    selection: state.selection,
    setSelection,
    resetSelection,
    // Convenience methods for common selection operations
    selectEntity: (entityId: string) => {
      setSelection({
        selectedEntityIds: [
          ...state.selection.selectedEntityIds.filter(id => id !== entityId),
          entityId,
        ],
      })
    },
    deselectEntity: (entityId: string) => {
      setSelection({
        selectedEntityIds: state.selection.selectedEntityIds.filter(
          id => id !== entityId
        ),
      })
    },
    toggleEntitySelection: (entityId: string) => {
      const isSelected = state.selection.selectedEntityIds.includes(entityId)
      if (isSelected) {
        setSelection({
          selectedEntityIds: state.selection.selectedEntityIds.filter(
            id => id !== entityId
          ),
        })
      } else {
        setSelection({
          selectedEntityIds: [...state.selection.selectedEntityIds, entityId],
        })
      }
    },
    selectEvent: (eventId: string) => {
      setSelection({
        selectedEventIds: [
          ...state.selection.selectedEventIds.filter(id => id !== eventId),
          eventId,
        ],
      })
    },
    selectLocation: (locationId: string) => {
      setSelection({
        selectedLocationIds: [
          ...state.selection.selectedLocationIds.filter(
            id => id !== locationId
          ),
          locationId,
        ],
      })
    },
    isEntitySelected: (entityId: string) =>
      state.selection.selectedEntityIds.includes(entityId),
    isEventSelected: (eventId: string) =>
      state.selection.selectedEventIds.includes(eventId),
    isLocationSelected: (locationId: string) =>
      state.selection.selectedLocationIds.includes(locationId),
  }
}

/**
 * Hook for filter management
 */
export function useViewFilters() {
  const { state, setFilters, resetFilters } = useAnalystView()
  return {
    filters: state.filters,
    setFilters,
    resetFilters,
    // Convenience methods for common filter operations
    setEntityTypeFilter: (types: string[]) => {
      setFilters({ entityTypes: types })
    },
    setEventTypeFilter: (types: string[]) => {
      setFilters({ eventTypes: types })
    },
    setMinConfidence: (minConfidence: number) => {
      setFilters({ minConfidence })
    },
    clearEntityTypeFilter: () => {
      setFilters({ entityTypes: undefined })
    },
    clearEventTypeFilter: () => {
      setFilters({ eventTypes: undefined })
    },
  }
}

/**
 * Hook to get current view state (read-only access)
 */
export function useViewState() {
  const { state } = useAnalystView()
  return state
}

// =============================================================================
// Helper: Create Default Initial State
// =============================================================================

/**
 * Creates a default initial state with sensible defaults
 */
export function createDefaultViewState(
  overrides?: Partial<AnalystViewState>
): AnalystViewState {
  const now = new Date()
  const oneWeekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000)

  return {
    timeWindow: {
      from: oneWeekAgo.toISOString(),
      to: now.toISOString(),
    },
    filters: {
      entityTypes: [],
      eventTypes: [],
      locationCountries: [],
      minConfidence: undefined,
      tags: [],
    },
    selection: {
      selectedEntityIds: [],
      selectedEventIds: [],
      selectedLocationIds: [],
    },
    ...overrides,
  }
}

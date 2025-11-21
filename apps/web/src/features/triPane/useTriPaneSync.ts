/**
 * Custom Hook for Tri-Pane Synchronization
 *
 * Provides optimized state management for synchronized brushing
 * across all three panes with debouncing and memoization.
 */

import { useState, useCallback, useMemo, useRef, useEffect } from 'react'
import type {
  Entity,
  Relationship,
  TimelineEvent,
  GeospatialEvent,
} from '@/types'
import type { TriPaneSyncState, TimeWindow } from './types'

interface UseTriPaneSyncOptions {
  entities: Entity[]
  relationships: Relationship[]
  timelineEvents: TimelineEvent[]
  geospatialEvents: GeospatialEvent[]
  initialState?: Partial<TriPaneSyncState>
  debounceMs?: number
  onStateChange?: (state: TriPaneSyncState) => void
}

interface UseTriPaneSyncResult {
  syncState: TriPaneSyncState
  filteredData: {
    entities: Entity[]
    relationships: Relationship[]
    timelineEvents: TimelineEvent[]
    geospatialEvents: GeospatialEvent[]
  }
  selectEntity: (entity: Entity) => void
  selectEvent: (event: TimelineEvent) => void
  selectLocation: (locationId: string) => void
  setTimeWindow: (window: TimeWindow | undefined) => void
  resetFilters: () => void
  isFiltered: boolean
}

/**
 * Hook for managing synchronized tri-pane state
 */
export function useTriPaneSync({
  entities,
  relationships,
  timelineEvents,
  geospatialEvents,
  initialState,
  debounceMs = 100,
  onStateChange,
}: UseTriPaneSyncOptions): UseTriPaneSyncResult {
  // State
  const [syncState, setSyncState] = useState<TriPaneSyncState>(() => ({
    graph: {
      layout: { type: 'force', settings: {} },
      ...initialState?.graph,
    },
    timeline: {
      autoScroll: false,
      ...initialState?.timeline,
    },
    map: {
      center: [0, 0],
      zoom: 2,
      ...initialState?.map,
    },
    globalTimeWindow: initialState?.globalTimeWindow,
  }))

  // Debounce ref for state change callbacks
  const debounceRef = useRef<ReturnType<typeof setTimeout>>()

  // Notify parent of state changes (debounced)
  useEffect(() => {
    if (!onStateChange) return

    if (debounceRef.current) {
      clearTimeout(debounceRef.current)
    }

    debounceRef.current = setTimeout(() => {
      onStateChange(syncState)
    }, debounceMs)

    return () => {
      if (debounceRef.current) {
        clearTimeout(debounceRef.current)
      }
    }
  }, [syncState, onStateChange, debounceMs])

  // Memoized filtered data
  const filteredData = useMemo(() => {
    if (!syncState.globalTimeWindow) {
      return {
        entities,
        relationships,
        timelineEvents,
        geospatialEvents,
      }
    }

    const { start, end } = syncState.globalTimeWindow

    // Filter timeline events
    const filteredTimelineEvents = timelineEvents.filter(event => {
      const eventTime = new Date(event.timestamp)
      return eventTime >= start && eventTime <= end
    })

    // Filter geospatial events
    const filteredGeospatialEvents = geospatialEvents.filter(event => {
      const eventTime = new Date(event.timestamp)
      return eventTime >= start && eventTime <= end
    })

    // Get entity IDs from filtered events
    const relevantEntityIds = new Set(
      filteredTimelineEvents
        .map(e => e.entityId)
        .filter((id): id is string => Boolean(id))
    )

    // Filter entities
    const filteredEntities = entities.filter(entity => {
      if (relevantEntityIds.has(entity.id)) return true
      if (entity.updatedAt) {
        const updateTime = new Date(entity.updatedAt)
        return updateTime >= start && updateTime <= end
      }
      return false
    })

    // Filter relationships
    const filteredEntityIds = new Set(filteredEntities.map(e => e.id))
    const filteredRelationships = relationships.filter(
      rel =>
        filteredEntityIds.has(rel.sourceId) &&
        filteredEntityIds.has(rel.targetId)
    )

    return {
      entities: filteredEntities,
      relationships: filteredRelationships,
      timelineEvents: filteredTimelineEvents,
      geospatialEvents: filteredGeospatialEvents,
    }
  }, [
    entities,
    relationships,
    timelineEvents,
    geospatialEvents,
    syncState.globalTimeWindow,
  ])

  // Action handlers
  const selectEntity = useCallback(
    (entity: Entity) => {
      const relatedEntityIds = relationships
        .filter(r => r.sourceId === entity.id || r.targetId === entity.id)
        .map(r => (r.sourceId === entity.id ? r.targetId : r.sourceId))

      setSyncState(prev => ({
        ...prev,
        graph: {
          ...prev.graph,
          selectedEntityId: entity.id,
          focusedEntityIds: [entity.id, ...relatedEntityIds],
        },
        timeline: {
          ...prev.timeline,
          selectedEventId: undefined,
        },
        map: {
          ...prev.map,
          selectedLocationId:
            entity.type === 'LOCATION' ? entity.id : prev.map.selectedLocationId,
        },
      }))
    },
    [relationships]
  )

  const selectEvent = useCallback(
    (event: TimelineEvent) => {
      if (event.entityId) {
        const entity = entities.find(e => e.id === event.entityId)
        if (entity) {
          selectEntity(entity)
        }
      }

      setSyncState(prev => ({
        ...prev,
        timeline: {
          ...prev.timeline,
          selectedEventId: event.id,
        },
      }))
    },
    [entities, selectEntity]
  )

  const selectLocation = useCallback((locationId: string) => {
    setSyncState(prev => ({
      ...prev,
      map: {
        ...prev.map,
        selectedLocationId: locationId,
      },
    }))
  }, [])

  const setTimeWindow = useCallback((window: TimeWindow | undefined) => {
    setSyncState(prev => ({
      ...prev,
      globalTimeWindow: window,
      timeline: {
        ...prev.timeline,
        timeWindow: window,
      },
    }))
  }, [])

  const resetFilters = useCallback(() => {
    setSyncState(prev => ({
      ...prev,
      globalTimeWindow: undefined,
      graph: {
        ...prev.graph,
        selectedEntityId: undefined,
        focusedEntityIds: undefined,
      },
      timeline: {
        ...prev.timeline,
        selectedEventId: undefined,
        timeWindow: undefined,
      },
      map: {
        ...prev.map,
        selectedLocationId: undefined,
      },
    }))
  }, [])

  const isFiltered = Boolean(syncState.globalTimeWindow)

  return {
    syncState,
    filteredData,
    selectEntity,
    selectEvent,
    selectLocation,
    setTimeWindow,
    resetFilters,
    isFiltered,
  }
}

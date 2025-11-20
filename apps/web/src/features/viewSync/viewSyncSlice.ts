import { createSlice, PayloadAction } from '@reduxjs/toolkit'

/**
 * ViewSync Slice - Synchronized Brushing State
 *
 * Coordinates selection, filtering, and time-range brushing
 * across Graph, Timeline, and Map panes.
 */

export interface TimeRange {
  start: string
  end: string
}

export interface GeoRegion {
  bounds: {
    north: number
    south: number
    east: number
    west: number
  }
  zoom?: number
  center?: [number, number]
}

export interface ViewSyncState {
  // Cross-pane selection
  selectedEntityIds: string[]
  selectedRelationshipIds: string[]
  selectedEventIds: string[]

  // Time range brushing (from timeline)
  timeRange: TimeRange | null

  // Geographic region (from map)
  geoRegion: GeoRegion | null

  // Hover state for linked highlighting
  hoveredEntityId: string | null
  hoveredRelationshipId: string | null

  // Focus pane (which pane is currently active)
  activePaneId: 'graph' | 'timeline' | 'map' | null

  // Filters applied across all panes
  entityTypeFilter: string[]
  relationshipTypeFilter: string[]
  confidenceThreshold: number

  // Synchronized zoom/pan state
  syncEnabled: boolean
}

const initialState: ViewSyncState = {
  selectedEntityIds: [],
  selectedRelationshipIds: [],
  selectedEventIds: [],
  timeRange: null,
  geoRegion: null,
  hoveredEntityId: null,
  hoveredRelationshipId: null,
  activePaneId: null,
  entityTypeFilter: [],
  relationshipTypeFilter: [],
  confidenceThreshold: 0,
  syncEnabled: true,
}

const viewSyncSlice = createSlice({
  name: 'viewSync',
  initialState,
  reducers: {
    // Selection actions
    selectEntities(state, action: PayloadAction<string[]>) {
      state.selectedEntityIds = action.payload
    },

    toggleEntitySelection(state, action: PayloadAction<string>) {
      const id = action.payload
      const index = state.selectedEntityIds.indexOf(id)
      if (index >= 0) {
        state.selectedEntityIds.splice(index, 1)
      } else {
        state.selectedEntityIds.push(id)
      }
    },

    clearEntitySelection(state) {
      state.selectedEntityIds = []
    },

    selectRelationships(state, action: PayloadAction<string[]>) {
      state.selectedRelationshipIds = action.payload
    },

    selectEvents(state, action: PayloadAction<string[]>) {
      state.selectedEventIds = action.payload
    },

    // Time range brushing
    setTimeRange(state, action: PayloadAction<TimeRange | null>) {
      state.timeRange = action.payload
    },

    // Geographic region
    setGeoRegion(state, action: PayloadAction<GeoRegion | null>) {
      state.geoRegion = action.payload
    },

    // Hover state for linked highlighting
    setHoveredEntity(state, action: PayloadAction<string | null>) {
      state.hoveredEntityId = action.payload
    },

    setHoveredRelationship(state, action: PayloadAction<string | null>) {
      state.hoveredRelationshipId = action.payload
    },

    // Active pane
    setActivePane(state, action: PayloadAction<'graph' | 'timeline' | 'map' | null>) {
      state.activePaneId = action.payload
    },

    // Filters
    setEntityTypeFilter(state, action: PayloadAction<string[]>) {
      state.entityTypeFilter = action.payload
    },

    setRelationshipTypeFilter(state, action: PayloadAction<string[]>) {
      state.relationshipTypeFilter = action.payload
    },

    setConfidenceThreshold(state, action: PayloadAction<number>) {
      state.confidenceThreshold = action.payload
    },

    // Sync control
    toggleSync(state) {
      state.syncEnabled = !state.syncEnabled
    },

    setSyncEnabled(state, action: PayloadAction<boolean>) {
      state.syncEnabled = action.payload
    },

    // Reset all
    resetViewSync(state) {
      Object.assign(state, initialState)
    },
  },
})

export const {
  selectEntities,
  toggleEntitySelection,
  clearEntitySelection,
  selectRelationships,
  selectEvents,
  setTimeRange,
  setGeoRegion,
  setHoveredEntity,
  setHoveredRelationship,
  setActivePane,
  setEntityTypeFilter,
  setRelationshipTypeFilter,
  setConfidenceThreshold,
  toggleSync,
  setSyncEnabled,
  resetViewSync,
} = viewSyncSlice.actions

export default viewSyncSlice.reducer

// Selectors
export const selectViewSync = (state: any) => state.viewSync as ViewSyncState
export const selectSelectedEntityIds = (state: any) => state.viewSync.selectedEntityIds
export const selectTimeRange = (state: any) => state.viewSync.timeRange
export const selectGeoRegion = (state: any) => state.viewSync.geoRegion
export const selectHoveredEntityId = (state: any) => state.viewSync.hoveredEntityId
export const selectActivePane = (state: any) => state.viewSync.activePaneId
export const selectSyncEnabled = (state: any) => state.viewSync.syncEnabled

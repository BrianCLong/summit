/**
 * Tri-Pane Analysis Shell - Type Definitions
 *
 * This file defines the TypeScript interfaces and contracts for the tri-pane
 * analysis shell, enabling other teams to integrate their implementations
 * without modifying the core shell.
 */

import type {
  Entity,
  Relationship,
  TimelineEvent,
  GeospatialEvent,
  GraphLayout,
} from '@/types'

/**
 * Time window for filtering data across all panes
 */
export interface TimeWindow {
  start: Date
  end: Date
}

/**
 * Graph pane specific state and interactions
 */
export interface GraphPaneState {
  selectedEntityId?: string
  focusedEntityIds?: string[]
  layout: GraphLayout
  zoom?: number
}

/**
 * Timeline pane specific state and interactions
 */
export interface TimelinePaneState {
  selectedEventId?: string
  timeWindow?: TimeWindow
  autoScroll?: boolean
}

/**
 * Map pane specific state and interactions
 */
export interface MapPaneState {
  center?: [number, number] // [longitude, latitude]
  zoom?: number
  selectedLocationId?: string
  bounds?: {
    north: number
    south: number
    east: number
    west: number
  }
}

/**
 * Synchronized state across all three panes
 */
export interface TriPaneSyncState {
  graph: GraphPaneState
  timeline: TimelinePaneState
  map: MapPaneState
  globalTimeWindow?: TimeWindow
}

/**
 * Props for the Graph Pane component
 */
export interface GraphPaneProps {
  entities: Entity[]
  relationships: Relationship[]
  layout: GraphLayout
  selectedEntityId?: string
  focusedEntityIds?: string[]
  onEntitySelect?: (entity: Entity) => void
  onLayoutChange?: (layout: GraphLayout) => void
  className?: string
}

/**
 * Props for the Timeline Pane component
 */
export interface TimelinePaneProps {
  events: TimelineEvent[]
  selectedEventId?: string
  timeWindow?: TimeWindow
  onEventSelect?: (event: TimelineEvent) => void
  onTimeWindowChange?: (window: TimeWindow) => void
  autoScroll?: boolean
  className?: string
}

/**
 * Props for the Map Pane component
 */
export interface MapPaneProps {
  locations: GeospatialEvent[]
  center?: [number, number]
  zoom?: number
  selectedLocationId?: string
  onLocationSelect?: (locationId: string) => void
  onMapMove?: (center: [number, number], zoom: number) => void
  className?: string
}

/**
 * Main props for the TriPaneShell component
 */
export interface TriPaneShellProps {
  // Data props - provide filtered data based on current state
  entities: Entity[]
  relationships: Relationship[]
  timelineEvents: TimelineEvent[]
  geospatialEvents: GeospatialEvent[]

  // Initial state
  initialSyncState?: Partial<TriPaneSyncState>

  // Callbacks for external state management (optional)
  onEntitySelect?: (entity: Entity) => void
  onEventSelect?: (event: TimelineEvent) => void
  onLocationSelect?: (locationId: string) => void
  onTimeWindowChange?: (window: TimeWindow) => void
  onSyncStateChange?: (state: TriPaneSyncState) => void

  // UI customization
  showProvenanceOverlay?: boolean
  className?: string

  // Export functionality
  onExport?: () => void
}

/**
 * Data provider interface for future teams to implement
 * This allows teams to plug in their own data sources without
 * modifying the shell component.
 */
export interface TriPaneDataProvider {
  // Fetch methods
  fetchEntities: (filters?: any) => Promise<Entity[]>
  fetchRelationships: (filters?: any) => Promise<Relationship[]>
  fetchTimelineEvents: (filters?: any) => Promise<TimelineEvent[]>
  fetchGeospatialEvents: (filters?: any) => Promise<GeospatialEvent[]>

  // Real-time subscription (optional)
  subscribeToUpdates?: (callback: (data: any) => void) => () => void
}

/**
 * Action types for synchronized updates across panes
 */
export type TriPaneAction =
  | { type: 'SELECT_ENTITY'; payload: Entity }
  | { type: 'SELECT_EVENT'; payload: TimelineEvent }
  | { type: 'SELECT_LOCATION'; payload: string }
  | { type: 'SET_TIME_WINDOW'; payload: TimeWindow }
  | { type: 'RESET_FILTERS' }
  | { type: 'UPDATE_GRAPH_LAYOUT'; payload: GraphLayout }
  | { type: 'SET_MAP_VIEW'; payload: { center: [number, number]; zoom: number } }

/**
 * Keyboard shortcuts for tri-pane navigation
 */
export interface TriPaneKeyboardShortcuts {
  focusGraph: string // Default: 'g'
  focusTimeline: string // Default: 't'
  focusMap: string // Default: 'm'
  resetFilters: string // Default: 'r'
  export: string // Default: 'e'
}

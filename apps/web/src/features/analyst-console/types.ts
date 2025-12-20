/**
 * Analyst Console - Type Definitions
 *
 * Core types for the tri-pane analyst console with Graph, Timeline, Map,
 * and "Explain This View" panel. These types drive shared global view state
 * across all panes.
 *
 * Frontend Stack: React 19 + TypeScript + Tailwind + Vite
 * Location: apps/web/src/features/analyst-console
 */

// =============================================================================
// Entity & Link Types (for Graph Pane)
// =============================================================================

/**
 * Core entity type for the analyst console graph
 */
export interface AnalystEntity {
  id: string
  label: string
  type: string // "Person", "Org", "Account", "Location", etc.
  importanceScore?: number // for ranking in Explain panel
  confidence?: number // data quality indicator
  properties?: Record<string, unknown>
  tags?: string[]
  createdAt?: string
  updatedAt?: string
}

/**
 * Link/relationship between entities in the graph
 */
export interface AnalystLink {
  id: string
  sourceId: string
  targetId: string
  type: string // "communicatesWith", "funds", "worksFor", etc.
  weight?: number
  timestamp?: string // optional for temporal links
  confidence?: number
  properties?: Record<string, unknown>
}

// =============================================================================
// Event Types (for Timeline Pane)
// =============================================================================

/**
 * Event for the timeline pane
 */
export interface AnalystEvent {
  id: string
  type: string // "COMMUNICATION", "TRANSACTION", "MOVEMENT", etc.
  entityIds: string[] // entities involved in this event
  timestamp: string // ISO 8601
  durationMinutes?: number
  summary: string
  severity?: 'info' | 'low' | 'medium' | 'high' | 'critical'
  metadata?: Record<string, unknown>
}

// =============================================================================
// Location Types (for Map Pane)
// =============================================================================

/**
 * Geographic location for the map pane
 */
export interface AnalystLocation {
  id: string
  entityId?: string // optional: entity this location is tied to
  label?: string
  lat: number
  lon: number
  firstSeenAt?: string
  lastSeenAt?: string
  type?: 'point' | 'city' | 'region' | 'country'
  metadata?: Record<string, unknown>
}

// =============================================================================
// Global View State Types
// =============================================================================

/**
 * Time window for filtering data across all panes
 */
export interface TimeWindow {
  from: string // ISO 8601
  to: string // ISO 8601
}

/**
 * Filter configuration for the analyst view
 */
export interface AnalystViewFilters {
  entityTypes?: string[]
  eventTypes?: string[]
  locationCountries?: string[]
  minConfidence?: number
  tags?: string[]
}

/**
 * Selection state synchronized across all panes
 */
export interface AnalystSelectionState {
  selectedEntityIds: string[]
  selectedEventIds: string[]
  selectedLocationIds: string[]
}

/**
 * Complete global view state for the analyst console
 */
export interface AnalystViewState {
  timeWindow: TimeWindow
  filters: AnalystViewFilters
  selection: AnalystSelectionState
}

// =============================================================================
// Pane-specific Props
// =============================================================================

/**
 * Props for the Graph Pane component
 */
export interface GraphPaneProps {
  entities: AnalystEntity[]
  links: AnalystLink[]
  events: AnalystEvent[]
  className?: string
}

/**
 * Props for the Timeline Pane component
 */
export interface TimelinePaneProps {
  events: AnalystEvent[]
  className?: string
}

/**
 * Props for the Map Pane component
 */
export interface MapPaneProps {
  locations: AnalystLocation[]
  events: AnalystEvent[]
  className?: string
}

/**
 * Props for the Explain This View panel
 */
export interface ExplainThisViewPanelProps {
  entities: AnalystEntity[]
  links: AnalystLink[]
  events: AnalystEvent[]
  locations: AnalystLocation[]
  className?: string
}

// =============================================================================
// Main Console Props
// =============================================================================

/**
 * Props for the main AnalystConsole component
 */
export interface AnalystConsoleProps {
  entities: AnalystEntity[]
  links: AnalystLink[]
  events: AnalystEvent[]
  locations: AnalystLocation[]
  initialTimeWindow?: TimeWindow
  className?: string
  onExport?: () => void
}

// =============================================================================
// View Explanation Types
// =============================================================================

/**
 * Summary metrics for the explain panel
 */
export interface ViewExplanationMetrics {
  visibleEntityCount: number
  visibleLinkCount: number
  visibleEventCount: number
  visibleLocationCount: number
  topEntities: Array<{
    entity: AnalystEntity
    connectionCount: number
  }>
  entityTypeDistribution: Record<string, number>
  eventTypeDistribution: Record<string, number>
}

/**
 * Human-readable view explanation
 */
export interface ViewExplanation {
  headline: string
  detailBullets: string[]
  metrics: ViewExplanationMetrics
}

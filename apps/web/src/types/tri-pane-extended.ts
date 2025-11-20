/**
 * Extended type definitions for Enhanced Tri-Pane View
 *
 * These types extend the base types in tri-pane.ts with additional
 * interfaces for XAI, provenance, and analytics.
 */

import type { Entity, Relationship, TimelineEvent, GeospatialEvent } from './tri-pane'

// ============================================================================
// XAI (Explainable AI) Types
// ============================================================================

export interface XAIReason {
  type: 'centrality' | 'confidence' | 'type' | 'pattern' | 'temporal' | 'custom'
  description: string
  score: number // 0-1
  evidence?: string[]
  metadata?: Record<string, any>
}

export interface XAIExplanation {
  entityId: string
  reasons: XAIReason[]
  centrality: {
    degree: number
    betweenness: number
    closeness: number
    eigenvector?: number
  }
  importance: number // 0-1, weighted overall importance
  timestamp: string
}

export interface XAIConfig {
  enabled: boolean
  showScores: boolean
  minImportance: number
  reasonTypes: XAIReason['type'][]
}

// ============================================================================
// Provenance Types
// ============================================================================

export interface ProvenanceTransform {
  id: string
  operation: string
  timestamp: string
  confidence: number
  actor?: string // Who/what performed the transform
  metadata?: Record<string, any>
}

export interface ProvenanceInfo {
  entityId: string
  sourceId: string
  sourceName: string
  sourceType: 'manual' | 'import' | 'api' | 'ml' | 'rule' | 'integration'
  transforms: ProvenanceTransform[]
  license: string
  lastSeen: string
  confidence: number
  chain: string[] // IDs of entities in the provenance chain
}

export interface ProvenanceSummary {
  sourceCount: number
  licenseTypes: string[]
  avgConfidence: number
  transformCount: number
  oldestTimestamp?: string
  newestTimestamp?: string
}

// ============================================================================
// Contribution Scoring Types
// ============================================================================

export interface EntityContribution {
  entity: Entity
  score: number
  reasons: string[]
  rank: number
  metrics: {
    degree: number
    confidence: number
    recency: number
    importance: number
  }
}

export interface EdgeContribution {
  relationship: Relationship
  sourceEntity: Entity
  targetEntity: Entity
  score: number
  reasons: string[]
  rank: number
  metrics: {
    confidence: number
    strength: number
    recency: number
  }
}

export interface ContributionScores {
  entities: EntityContribution[]
  edges: EdgeContribution[]
  topN: number
  algorithm: 'pagerank' | 'centrality' | 'hybrid' | 'custom'
  computedAt: string
}

// ============================================================================
// Analytics & Tracking Types
// ============================================================================

export interface AnalyticsEvent {
  type:
    | 'view_loaded'
    | 'entity_selected'
    | 'filter_applied'
    | 'time_range_changed'
    | 'pane_focused'
    | 'export_triggered'
    | 'explain_opened'
    | 'explain_closed'
    | 'xai_toggled'
    | 'provenance_toggled'
  timestamp: string
  userId?: string
  sessionId: string
  metadata?: Record<string, any>
}

export interface InteractionMetrics {
  totalViews: number
  avgSessionDuration: number
  mostUsedFeatures: Array<{
    feature: string
    count: number
  }>
  errorRate: number
}

// ============================================================================
// Filter & Configuration Types
// ============================================================================

export interface TriPaneFilters {
  entityTypes: string[]
  relationshipTypes: string[]
  timeRange?: {
    start: Date
    end: Date
  }
  confidenceThreshold: number
  tags: string[]
  sources: string[]
  customFilters?: Record<string, any>
}

export interface TriPaneConfig {
  layout: {
    timelineWidth: number // percentage or pixels
    graphWidth: number
    mapWidth: number
    explainSidebarWidth: number
  }
  features: {
    enableXAI: boolean
    enableProvenance: boolean
    enableExplainSidebar: boolean
    enableKeyboardShortcuts: boolean
    enableAnimations: boolean
  }
  performance: {
    maxEntities: number
    maxRelationships: number
    debounceMs: number
    enableVirtualization: boolean
  }
  accessibility: {
    highContrast: boolean
    reducedMotion: boolean
    screenReaderMode: boolean
  }
}

// ============================================================================
// Viewport Synchronization Types
// ============================================================================

export interface TimelineViewport {
  selectedEventId?: string
  timeRange?: { start: Date; end: Date }
  scrollPosition: number
  visibleRange: { start: Date; end: Date }
}

export interface MapViewport {
  center: [number, number] // [lat, lng]
  zoom: number
  bounds: {
    north: number
    south: number
    east: number
    west: number
  }
  selectedLocationId?: string
}

export interface GraphViewport {
  selectedEntityId?: string
  focusedEntityIds: string[]
  highlightedRelationshipIds: string[]
  zoom: number
  pan: { x: number; y: number }
  layout: 'force' | 'radial' | 'hierarchic' | 'circular'
}

export interface ViewportSync {
  timeline: TimelineViewport
  map: MapViewport
  graph: GraphViewport
  lastUpdated: string
  updateSource: 'timeline' | 'map' | 'graph' | 'external'
}

// ============================================================================
// Time-Brushing Types
// ============================================================================

export interface TimeBrush {
  start: Date
  end: Date
  active: boolean
  histogram?: {
    buckets: Array<{
      date: string
      count: number
      entities: string[]
    }>
    maxCount: number
  }
}

export interface TimeHistogram {
  buckets: Map<string, number>
  granularity: 'hour' | 'day' | 'week' | 'month' | 'year'
  totalEvents: number
  dateRange: { start: Date; end: Date }
}

// ============================================================================
// Confidence Distribution Types
// ============================================================================

export interface ConfidenceBucket {
  range: { min: number; max: number }
  count: number
  percentage: number
  label: string
  color: string
}

export interface ConfidenceStats {
  high: ConfidenceBucket
  medium: ConfidenceBucket
  low: ConfidenceBucket
  distribution: number[] // Histogram values
  mean: number
  median: number
  stdDev: number
}

// ============================================================================
// Export Types
// ============================================================================

export interface TriPaneExport {
  version: string
  timestamp: string
  data: {
    entities: Entity[]
    relationships: Relationship[]
    timelineEvents: TimelineEvent[]
    geospatialEvents: GeospatialEvent[]
  }
  metadata: {
    filters: TriPaneFilters
    viewport: ViewportSync
    analytics: {
      sessionDuration: number
      interactionCount: number
    }
  }
  provenance?: ProvenanceInfo[]
  xai?: XAIExplanation[]
}

export type ExportFormat = 'json' | 'csv' | 'stix' | 'graphml' | 'neo4j'

// ============================================================================
// API Response Types
// ============================================================================

export interface TriPaneAPIResponse<T> {
  data: T
  loading: boolean
  error?: Error
  timestamp: string
  cached: boolean
}

export interface TriPaneAPIError {
  code: string
  message: string
  details?: Record<string, any>
  stack?: string
}

// ============================================================================
// Helper Type Guards
// ============================================================================

export function isXAIExplanation(obj: any): obj is XAIExplanation {
  return (
    obj &&
    typeof obj.entityId === 'string' &&
    Array.isArray(obj.reasons) &&
    typeof obj.importance === 'number'
  )
}

export function isProvenanceInfo(obj: any): obj is ProvenanceInfo {
  return (
    obj &&
    typeof obj.entityId === 'string' &&
    typeof obj.sourceId === 'string' &&
    Array.isArray(obj.transforms)
  )
}

export function isEntityContribution(obj: any): obj is EntityContribution {
  return (
    obj &&
    obj.entity &&
    typeof obj.score === 'number' &&
    Array.isArray(obj.reasons)
  )
}

// ============================================================================
// Utility Types
// ============================================================================

export type DeepPartial<T> = {
  [P in keyof T]?: T[P] extends object ? DeepPartial<T[P]> : T[P]
}

export type RequireAtLeastOne<T, Keys extends keyof T = keyof T> = Pick<
  T,
  Exclude<keyof T, Keys>
> &
  {
    [K in Keys]-?: Required<Pick<T, K>> & Partial<Pick<T, Exclude<Keys, K>>>
  }[Keys]

export type Nullable<T> = T | null

export type Optional<T> = T | undefined

// ============================================================================
// State Management Types
// ============================================================================

export interface TriPaneState {
  data: {
    entities: Entity[]
    relationships: Relationship[]
    timelineEvents: TimelineEvent[]
    geospatialEvents: GeospatialEvent[]
  }
  ui: {
    viewport: ViewportSync
    filters: TriPaneFilters
    focusedPane: 'timeline' | 'graph' | 'map' | null
    explainSidebarOpen: boolean
    xaiEnabled: boolean
    provenanceEnabled: boolean
  }
  computed: {
    filteredData: {
      entities: Entity[]
      relationships: Relationship[]
      timelineEvents: TimelineEvent[]
      geospatialEvents: GeospatialEvent[]
    }
    contributionScores: ContributionScores
    confidenceStats: ConfidenceStats
    provenanceSummary: ProvenanceSummary
  }
  meta: {
    loading: boolean
    error?: TriPaneAPIError
    lastUpdated: string
    version: string
  }
}

export type TriPaneAction =
  | { type: 'SET_ENTITIES'; payload: Entity[] }
  | { type: 'SET_RELATIONSHIPS'; payload: Relationship[] }
  | { type: 'SET_TIMELINE_EVENTS'; payload: TimelineEvent[] }
  | { type: 'SET_GEOSPATIAL_EVENTS'; payload: GeospatialEvent[] }
  | { type: 'UPDATE_VIEWPORT'; payload: Partial<ViewportSync> }
  | { type: 'UPDATE_FILTERS'; payload: Partial<TriPaneFilters> }
  | { type: 'FOCUS_PANE'; payload: 'timeline' | 'graph' | 'map' | null }
  | { type: 'TOGGLE_EXPLAIN_SIDEBAR' }
  | { type: 'TOGGLE_XAI' }
  | { type: 'TOGGLE_PROVENANCE' }
  | { type: 'SET_LOADING'; payload: boolean }
  | { type: 'SET_ERROR'; payload: TriPaneAPIError }
  | { type: 'RESET' }

// ============================================================================
// Hook Return Types
// ============================================================================

export interface UseTriPaneReturn {
  state: TriPaneState
  actions: {
    setEntities: (entities: Entity[]) => void
    setRelationships: (relationships: Relationship[]) => void
    updateViewport: (viewport: Partial<ViewportSync>) => void
    updateFilters: (filters: Partial<TriPaneFilters>) => void
    focusPane: (pane: 'timeline' | 'graph' | 'map' | null) => void
    toggleExplainSidebar: () => void
    toggleXAI: () => void
    toggleProvenance: () => void
    reset: () => void
  }
  computed: {
    topEntities: EntityContribution[]
    topEdges: EdgeContribution[]
    confidenceStats: ConfidenceStats
    provenanceSummary: ProvenanceSummary
  }
}

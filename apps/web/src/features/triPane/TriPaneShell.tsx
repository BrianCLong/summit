/**
 * Tri-Pane Analysis Shell
 *
 * Main component that orchestrates the three synchronized panes:
 * - Graph: Entity relationship visualization
 * - Timeline: Temporal event tracking
 * - Map: Geographic event visualization
 *
 * This shell provides synchronized brushing and filtering across all panes,
 * with clear contracts for future teams to integrate real data sources.
 */

import React, { useState, useCallback, useMemo, useEffect } from 'react'
import {
  Layers,
  Network,
  Clock,
  MapPin,
  Filter,
  RefreshCw,
  Download,
  Eye,
  EyeOff,
  Maximize2,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card'
import { Badge } from '@/components/ui/Badge'
import { Button } from '@/components/ui/Button'
import { GraphCanvas } from '@/graphs/GraphCanvas'
import { TimelineRail } from '@/components/panels/TimelineRail'
import { MapPane } from './MapPane'
import type { Entity, TimelineEvent } from '@/types'
import type { TriPaneShellProps, TriPaneSyncState, TimeWindow } from './types'

/**
 * Main TriPaneShell component
 */
export function TriPaneShell({
  entities,
  relationships,
  timelineEvents,
  geospatialEvents,
  initialSyncState,
  onEntitySelect,
  onEventSelect,
  onLocationSelect,
  onTimeWindowChange,
  onSyncStateChange,
  showProvenanceOverlay = false,
  className,
  onExport,
}: TriPaneShellProps) {
  // Synchronized state across all panes
  const [syncState, setSyncState] = useState<TriPaneSyncState>({
    graph: {
      layout: { type: 'force', settings: {} },
      ...initialSyncState?.graph,
    },
    timeline: {
      autoScroll: false,
      ...initialSyncState?.timeline,
    },
    map: {
      center: [0, 0],
      zoom: 2,
      ...initialSyncState?.map,
    },
    globalTimeWindow: initialSyncState?.globalTimeWindow,
  })

  const [showProvenance, setShowProvenance] = useState(showProvenanceOverlay)
  const [activePane, setActivePane] = useState<'graph' | 'timeline' | 'map'>(
    'graph'
  )

  // Filter data based on global time window
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

    // Filter entities that appear in the filtered events
    const relevantEntityIds = new Set(
      filteredTimelineEvents.map(e => e.entityId).filter(Boolean) as string[]
    )

    const filteredEntities = entities.filter(entity => {
      if (relevantEntityIds.has(entity.id)) return true

      // Also include entities updated within the time window
      if (entity.updatedAt) {
        const updateTime = new Date(entity.updatedAt)
        return updateTime >= start && updateTime <= end
      }

      return false
    })

    // Filter relationships to only include those between filtered entities
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

  // Handle entity selection from graph
  const handleEntitySelect = useCallback(
    (entity: Entity) => {
      setSyncState(prev => ({
        ...prev,
        graph: {
          ...prev.graph,
          selectedEntityId: entity.id,
          focusedEntityIds: [
            entity.id,
            ...relationships
              .filter(r => r.sourceId === entity.id || r.targetId === entity.id)
              .map(r => (r.sourceId === entity.id ? r.targetId : r.sourceId)),
          ],
        },
        timeline: {
          ...prev.timeline,
          selectedEventId: undefined,
        },
        map: {
          ...prev.map,
          selectedLocationId:
            entity.type === 'LOCATION' ? entity.id : undefined,
        },
      }))

      onEntitySelect?.(entity)
      onSyncStateChange?.(syncState)
    },
    [relationships, onEntitySelect, onSyncStateChange, syncState]
  )

  // Handle timeline event selection
  const handleTimelineEventSelect = useCallback(
    (event: TimelineEvent) => {
      if (event.entityId) {
        const entity = entities.find(e => e.id === event.entityId)
        if (entity) {
          handleEntitySelect(entity)
        }
      }

      setSyncState(prev => ({
        ...prev,
        timeline: {
          ...prev.timeline,
          selectedEventId: event.id,
        },
      }))

      onEventSelect?.(event)
      onSyncStateChange?.(syncState)
    },
    [entities, handleEntitySelect, onEventSelect, onSyncStateChange, syncState]
  )

  // Handle map location selection
  const handleLocationSelect = useCallback(
    (locationId: string) => {
      setSyncState(prev => ({
        ...prev,
        map: {
          ...prev.map,
          selectedLocationId: locationId,
        },
      }))

      onLocationSelect?.(locationId)
      onSyncStateChange?.(syncState)
    },
    [onLocationSelect, onSyncStateChange, syncState]
  )

  // Handle time window change from timeline
  const handleTimeWindowChange = useCallback(
    (range: { start: string; end: string }) => {
      const timeWindow: TimeWindow = {
        start: new Date(range.start),
        end: new Date(range.end),
      }

      setSyncState(prev => ({
        ...prev,
        globalTimeWindow: timeWindow,
        timeline: {
          ...prev.timeline,
          timeWindow,
        },
      }))

      onTimeWindowChange?.(timeWindow)
      onSyncStateChange?.(syncState)
    },
    [onTimeWindowChange, onSyncStateChange, syncState]
  )

  // Handle reset filters
  const handleResetFilters = useCallback(() => {
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

  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyPress = (e: KeyboardEvent) => {
      // Only handle shortcuts when not in an input
      if (
        e.target instanceof HTMLInputElement ||
        e.target instanceof HTMLTextAreaElement
      ) {
        return
      }

      if (e.key === 'g' && !e.ctrlKey && !e.metaKey) {
        setActivePane('graph')
      } else if (e.key === 't' && !e.ctrlKey && !e.metaKey) {
        setActivePane('timeline')
      } else if (e.key === 'm' && !e.ctrlKey && !e.metaKey) {
        setActivePane('map')
      } else if (e.key === 'r' && !e.ctrlKey && !e.metaKey) {
        handleResetFilters()
      } else if (e.key === 'e' && !e.ctrlKey && !e.metaKey) {
        onExport?.()
      } else if (e.key === 'p' && !e.ctrlKey && !e.metaKey) {
        setShowProvenance(prev => !prev)
      }
    }

    window.addEventListener('keydown', handleKeyPress)
    return () => window.removeEventListener('keydown', handleKeyPress)
  }, [handleResetFilters, onExport])

  return (
    <div
      className={cn('flex flex-col h-full gap-4', className)}
      role="main"
      aria-label="Tri-pane analysis shell"
    >
      {/* Header Controls */}
      <div className="flex items-center justify-between bg-background border rounded-lg p-3 shadow-sm">
        <div className="flex items-center gap-4">
          <h1 className="text-lg font-semibold flex items-center gap-2">
            <Layers className="h-5 w-5" />
            Tri-Pane Analysis
          </h1>

          <div className="flex items-center gap-2" role="status" aria-live="polite">
            <Badge
              variant="outline"
              className="flex items-center gap-1"
              title="Total entities"
            >
              <Network className="h-3 w-3" />
              {filteredData.entities.length}
            </Badge>
            <Badge
              variant="outline"
              className="flex items-center gap-1"
              title="Total events"
            >
              <Clock className="h-3 w-3" />
              {filteredData.timelineEvents.length}
            </Badge>
            <Badge
              variant="outline"
              className="flex items-center gap-1"
              title="Total locations"
            >
              <MapPin className="h-3 w-3" />
              {filteredData.geospatialEvents.length}
            </Badge>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => setShowProvenance(!showProvenance)}
            aria-label={`${showProvenance ? 'Hide' : 'Show'} provenance overlay`}
            title="Toggle provenance overlay (P)"
          >
            {showProvenance ? (
              <Eye className="h-4 w-4" />
            ) : (
              <EyeOff className="h-4 w-4" />
            )}
            <span className="ml-1">Provenance</span>
          </Button>

          <Button
            variant="outline"
            size="sm"
            onClick={handleResetFilters}
            disabled={!syncState.globalTimeWindow}
            aria-label="Reset all filters"
            title="Reset filters (R)"
          >
            <RefreshCw className="h-4 w-4" />
            <span className="ml-1">Reset</span>
          </Button>

          {onExport && (
            <Button
              variant="outline"
              size="sm"
              onClick={onExport}
              aria-label="Export data"
              title="Export data (E)"
            >
              <Download className="h-4 w-4" />
              <span className="ml-1">Export</span>
            </Button>
          )}
        </div>
      </div>

      {/* Three-pane layout */}
      <div className="flex-1 grid grid-cols-12 gap-4 min-h-0">
        {/* Timeline Pane */}
        <div className="col-span-3 flex flex-col min-h-0">
          <Card className="flex-1 flex flex-col min-h-0">
            <CardHeader className="pb-3 flex-shrink-0">
              <CardTitle className="flex items-center gap-2 text-sm">
                <Clock className="h-4 w-4" />
                Timeline
                {syncState.globalTimeWindow && (
                  <Badge variant="secondary" className="text-xs">
                    Filtered
                  </Badge>
                )}
                {activePane === 'timeline' && (
                  <Badge variant="default" className="text-xs">
                    Active (T)
                  </Badge>
                )}
              </CardTitle>
            </CardHeader>
            <CardContent className="p-0 flex-1 min-h-0">
              <TimelineRail
                data={filteredData.timelineEvents}
                onTimeRangeChange={handleTimeWindowChange}
                onEventSelect={handleTimelineEventSelect}
                selectedEventId={syncState.timeline.selectedEventId}
                autoScroll={syncState.timeline.autoScroll}
                className="border-0 h-full"
              />
            </CardContent>
          </Card>
        </div>

        {/* Graph Pane */}
        <div className="col-span-6 flex flex-col min-h-0">
          <Card className="flex-1 flex flex-col min-h-0">
            <CardHeader className="pb-3 flex-shrink-0">
              <CardTitle className="flex items-center gap-2 text-sm">
                <Network className="h-4 w-4" />
                Entity Graph
                {showProvenance && (
                  <Badge variant="secondary" className="text-xs">
                    Provenance
                  </Badge>
                )}
                {activePane === 'graph' && (
                  <Badge variant="default" className="text-xs">
                    Active (G)
                  </Badge>
                )}
              </CardTitle>
            </CardHeader>
            <CardContent className="p-0 flex-1 min-h-0">
              <GraphCanvas
                entities={filteredData.entities.map(entity => ({
                  ...entity,
                  confidence: showProvenance ? entity.confidence : 1.0,
                }))}
                relationships={filteredData.relationships}
                layout={syncState.graph.layout}
                onEntitySelect={handleEntitySelect}
                selectedEntityId={syncState.graph.selectedEntityId}
                className="h-full"
              />
            </CardContent>
          </Card>
        </div>

        {/* Map Pane */}
        <div className="col-span-3 flex flex-col min-h-0">
          <Card className="flex-1 flex flex-col min-h-0">
            <CardHeader className="pb-3 flex-shrink-0">
              <CardTitle className="flex items-center gap-2 text-sm">
                <MapPin className="h-4 w-4" />
                Geographic View
                {activePane === 'map' && (
                  <Badge variant="default" className="text-xs">
                    Active (M)
                  </Badge>
                )}
              </CardTitle>
            </CardHeader>
            <CardContent className="p-0 flex-1 min-h-0">
              <MapPane
                locations={filteredData.geospatialEvents}
                center={syncState.map.center}
                zoom={syncState.map.zoom}
                selectedLocationId={syncState.map.selectedLocationId}
                onLocationSelect={handleLocationSelect}
                className="h-full"
              />
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Status indicator for active filter */}
      {syncState.globalTimeWindow && (
        <div
          className="fixed bottom-4 right-4 bg-primary text-primary-foreground px-4 py-2 rounded-lg shadow-lg text-sm flex items-center gap-2"
          role="status"
          aria-live="polite"
        >
          <Filter className="h-4 w-4" />
          Time filter: {syncState.globalTimeWindow.start.toLocaleString()} -{' '}
          {syncState.globalTimeWindow.end.toLocaleString()}
        </div>
      )}

      {/* Keyboard shortcuts helper (hidden, for screen readers) */}
      <div className="sr-only" role="complementary" aria-label="Keyboard shortcuts">
        <h2>Keyboard Shortcuts</h2>
        <ul>
          <li>G: Focus graph pane</li>
          <li>T: Focus timeline pane</li>
          <li>M: Focus map pane</li>
          <li>R: Reset all filters</li>
          <li>E: Export data</li>
          <li>P: Toggle provenance overlay</li>
        </ul>
      </div>
    </div>
  )
}

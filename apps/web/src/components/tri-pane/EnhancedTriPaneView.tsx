import React, { useState, useCallback, useEffect, useMemo } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card'
import { Badge } from '@/components/ui/Badge'
import { Button } from '@/components/ui/Button'
import { Tooltip } from '@/components/ui/Tooltip'
import { TimelineRail } from '@/components/panels/TimelineRail'
import { GraphCanvas } from '@/graphs/GraphCanvas'
import { ExplainViewSidebar } from '@/features/explain/ExplainViewSidebar'
import { MapView } from '@/features/geospatial/MapView'
import { useAppSelector } from '@/store/hooks'
import { selectExplain } from '@/features/explain/explainSlice'
import {
  Layers,
  Eye,
  EyeOff,
  Filter,
  Download,
  RefreshCw,
  Clock,
  MapPin,
  Network,
  ZoomIn,
  ZoomOut,
  Maximize2,
  Calendar,
} from 'lucide-react'
import type {
  Entity,
  Relationship,
  TimelineEvent,
  GeospatialEvent,
  GraphLayout,
} from '@/types'

interface EnhancedTriPaneViewProps {
  entities: Entity[]
  relationships: Relationship[]
  timelineEvents: TimelineEvent[]
  geospatialEvents: GeospatialEvent[]
  onEntitySelect?: (entity: Entity) => void
  onTimeRangeChange?: (range: { start: Date; end: Date }) => void
  onExport?: () => void
  className?: string
}

interface TimeRange {
  start: Date
  end: Date
}

interface ViewportSync {
  timeline: {
    selectedEventId?: string
    timeRange?: TimeRange
  }
  map: {
    center?: [number, number]
    zoom?: number
    selectedLocationId?: string
  }
  graph: {
    selectedEntityId?: string
    focusedEntityIds?: string[]
  }
}

interface TimeBrush {
  start: Date
  end: Date
  active: boolean
}

export function EnhancedTriPaneView({
  entities,
  relationships,
  timelineEvents,
  geospatialEvents,
  onEntitySelect,
  onTimeRangeChange,
  onExport,
  className,
}: EnhancedTriPaneViewProps) {
  const explainState = useAppSelector(selectExplain)
  const [viewportSync, setViewportSync] = useState<ViewportSync>({
    timeline: {},
    map: {},
    graph: {},
  })

  const [timeFilter, setTimeFilter] = useState<TimeRange | null>(null)
  const [timeBrush, setTimeBrush] = useState<TimeBrush | null>(null)
  const [showProvenance, setShowProvenance] = useState(true)
  const [showXAI, setShowXAI] = useState(true)
  const [graphLayout] = useState<GraphLayout>({ type: 'force', options: {} })
  const [focusedPane, setFocusedPane] = useState<
    'timeline' | 'graph' | 'map' | null
  >(null)

  // Calculate active filters for Explain sidebar
  const activeFilters = useMemo(() => {
    return {
      entityTypes: Array.from(new Set(entities.map(e => e.type))),
      timeRange: timeFilter || undefined,
      confidenceThreshold: 0.5, // This could come from filter state
    }
  }, [entities, timeFilter])

  // Filter data based on time range
  const filteredData = useMemo(() => {
    if (!timeFilter) {
      return {
        entities,
        relationships,
        timelineEvents,
        geospatialEvents,
      }
    }

    const filteredTimelineEvents = timelineEvents.filter(event => {
      const eventTime = new Date(event.timestamp)
      return eventTime >= timeFilter.start && eventTime <= timeFilter.end
    })

    const filteredGeospatialEvents = geospatialEvents.filter(event => {
      const eventTime = new Date(event.timestamp)
      return eventTime >= timeFilter.start && eventTime <= timeFilter.end
    })

    const relevantEntityIds = new Set([
      ...filteredTimelineEvents.map(e => e.entityId).filter(Boolean),
    ] as string[])

    const filteredEntities = entities.filter(
      entity =>
        relevantEntityIds.has(entity.id) ||
        (entity.updatedAt &&
          new Date(entity.updatedAt) >= timeFilter.start &&
          new Date(entity.updatedAt) <= timeFilter.end)
    )

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
  }, [entities, relationships, timelineEvents, geospatialEvents, timeFilter])

  // Calculate time histogram for brushing
  const timeHistogram = useMemo(() => {
    const buckets = new Map<string, number>()
    timelineEvents.forEach(event => {
      const date = new Date(event.timestamp).toDateString()
      buckets.set(date, (buckets.get(date) || 0) + 1)
    })
    return buckets
  }, [timelineEvents])

  // Handle time range change from timeline
  const handleTimeRangeChange = useCallback(
    (range: { start: string; end: string }) => {
      const timeRange = {
        start: new Date(range.start),
        end: new Date(range.end),
      }

      setTimeFilter(timeRange)
      setTimeBrush({ ...timeRange, active: true })
      setViewportSync(prev => ({
        ...prev,
        timeline: { ...prev.timeline, timeRange },
      }))

      onTimeRangeChange?.(timeRange)
    },
    [onTimeRangeChange]
  )

  // Handle entity selection with XAI context
  const handleEntitySelect = useCallback(
    (entity: Entity) => {
      // Calculate why this entity is important (XAI)
      const connections = relationships.filter(
        r => r.sourceId === entity.id || r.targetId === entity.id
      )

      setViewportSync(prev => ({
        ...prev,
        graph: {
          ...prev.graph,
          selectedEntityId: entity.id,
          focusedEntityIds: [
            entity.id,
            ...connections.map(r =>
              r.sourceId === entity.id ? r.targetId : r.sourceId
            ),
          ],
        },
        timeline: { ...prev.timeline, selectedEventId: undefined },
        map: {
          ...prev.map,
          selectedLocationId:
            entity.type === 'LOCATION' ? entity.id : undefined,
        },
      }))

      onEntitySelect?.(entity)
    },
    [relationships, onEntitySelect]
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

      setViewportSync(prev => ({
        ...prev,
        timeline: { ...prev.timeline, selectedEventId: event.id },
      }))
    },
    [entities, handleEntitySelect]
  )

  // Handle map location selection
  const handleMapLocationSelect = useCallback(
    (locationId: string) => {
      const entity = entities.find(
        e => e.id === locationId && e.type === 'LOCATION'
      )
      if (entity) {
        handleEntitySelect(entity)
      }
    },
    [entities, handleEntitySelect]
  )

  // Keyboard navigation
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Cmd/Ctrl + 1/2/3 to focus panes
      if ((e.metaKey || e.ctrlKey) && e.key >= '1' && e.key <= '3') {
        e.preventDefault()
        const panes = ['timeline', 'graph', 'map'] as const
        setFocusedPane(panes[parseInt(e.key) - 1])
      }

      // Escape to clear focus
      if (e.key === 'Escape') {
        setFocusedPane(null)
      }

      // P to toggle provenance
      if (e.key === 'p' || e.key === 'P') {
        setShowProvenance(prev => !prev)
      }

      // X to toggle XAI overlays
      if (e.key === 'x' || e.key === 'X') {
        setShowXAI(prev => !prev)
      }
    }

    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [])

  const sidebarWidth = explainState.open ? 'calc(100% - 24rem)' : '100%'

  return (
    <div
      className={`relative h-full transition-all duration-300 ${className}`}
      style={{ width: sidebarWidth }}
    >
      <div className="grid grid-cols-12 grid-rows-12 gap-4 h-full">
        {/* Header Controls */}
        <div className="col-span-12 row-span-1 flex items-center justify-between bg-background border rounded-lg p-3">
          <div className="flex items-center gap-4">
            <h1
              className="text-lg font-semibold flex items-center gap-2"
              id="tri-pane-title"
            >
              <Layers className="h-5 w-5" />
              Enhanced Tri-Pane Analysis
            </h1>

            <div className="flex items-center gap-2" role="status" aria-live="polite">
              <Badge variant="outline" className="flex items-center gap-1">
                <Network className="h-3 w-3" />
                {filteredData.entities.length} entities
              </Badge>
              <Badge variant="outline" className="flex items-center gap-1">
                <Clock className="h-3 w-3" />
                {filteredData.timelineEvents.length} events
              </Badge>
              <Badge variant="outline" className="flex items-center gap-1">
                <MapPin className="h-3 w-3" />
                {filteredData.geospatialEvents.length} locations
              </Badge>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <Tooltip content="Toggle provenance overlays (P)">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setShowProvenance(!showProvenance)}
                aria-label="Toggle provenance"
                aria-pressed={showProvenance}
              >
                {showProvenance ? (
                  <Eye className="h-4 w-4" />
                ) : (
                  <EyeOff className="h-4 w-4" />
                )}
                Provenance
              </Button>
            </Tooltip>

            <Tooltip content="Toggle XAI overlays (X)">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setShowXAI(!showXAI)}
                aria-label="Toggle XAI overlays"
                aria-pressed={showXAI}
              >
                {showXAI ? (
                  <Eye className="h-4 w-4" />
                ) : (
                  <EyeOff className="h-4 w-4" />
                )}
                XAI
              </Button>
            </Tooltip>

            <Tooltip content="Clear time filter">
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  setTimeFilter(null)
                  setTimeBrush(null)
                }}
                disabled={!timeFilter}
                aria-label="Reset time filter"
              >
                <RefreshCw className="h-4 w-4" />
                Reset
              </Button>
            </Tooltip>

            <Tooltip content="Export current view">
              <Button
                variant="outline"
                size="sm"
                onClick={onExport}
                aria-label="Export view"
              >
                <Download className="h-4 w-4" />
                Export
              </Button>
            </Tooltip>
          </div>
        </div>

        {/* Timeline Panel (⌘1) */}
        <div
          className={`col-span-4 row-span-11 transition-all ${
            focusedPane === 'timeline'
              ? 'ring-2 ring-primary shadow-lg z-10'
              : ''
          }`}
        >
          <Card className="h-full" tabIndex={0} role="region" aria-labelledby="timeline-title">
            <CardHeader className="pb-3">
              <CardTitle className="flex items-center gap-2 text-sm" id="timeline-title">
                <Clock className="h-4 w-4" />
                Timeline
                <kbd className="ml-auto text-xs px-1.5 py-0.5 bg-muted rounded">
                  ⌘1
                </kbd>
                {timeFilter && (
                  <Badge variant="secondary" className="text-xs">
                    Filtered
                  </Badge>
                )}
              </CardTitle>
            </CardHeader>
            <CardContent className="p-0 h-[calc(100%-4rem)]">
              {/* Time Histogram for Brushing */}
              {timeBrush && (
                <div className="px-4 py-2 bg-accent border-b">
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-muted-foreground">Time Brush Active</span>
                    <span className="font-medium">
                      {timeBrush.start.toLocaleDateString()} -{' '}
                      {timeBrush.end.toLocaleDateString()}
                    </span>
                  </div>
                  <div className="mt-2 flex gap-1 h-8">
                    {Array.from(timeHistogram.entries()).map(([date, count]) => {
                      const maxCount = Math.max(...timeHistogram.values())
                      const height = (count / maxCount) * 100
                      return (
                        <div
                          key={date}
                          className="flex-1 bg-primary/20 hover:bg-primary/40 cursor-pointer transition-colors"
                          style={{ height: `${height}%`, alignSelf: 'flex-end' }}
                          title={`${date}: ${count} events`}
                        />
                      )
                    })}
                  </div>
                </div>
              )}

              <TimelineRail
                data={filteredData.timelineEvents}
                onTimeRangeChange={handleTimeRangeChange}
                onEventSelect={handleTimelineEventSelect}
                selectedEventId={viewportSync.timeline.selectedEventId}
                className="border-0"
              />
            </CardContent>
          </Card>
        </div>

        {/* Graph Panel (⌘2) */}
        <div
          className={`col-span-5 row-span-11 transition-all ${
            focusedPane === 'graph' ? 'ring-2 ring-primary shadow-lg z-10' : ''
          }`}
        >
          <Card className="h-full" tabIndex={0} role="region" aria-labelledby="graph-title">
            <CardHeader className="pb-3">
              <CardTitle className="flex items-center gap-2 text-sm" id="graph-title">
                <Network className="h-4 w-4" />
                Entity Graph
                <kbd className="ml-auto text-xs px-1.5 py-0.5 bg-muted rounded">
                  ⌘2
                </kbd>
                {showProvenance && (
                  <Badge variant="secondary" className="text-xs">
                    Provenance
                  </Badge>
                )}
                {showXAI && (
                  <Badge variant="secondary" className="text-xs">
                    XAI
                  </Badge>
                )}
              </CardTitle>
            </CardHeader>
            <CardContent className="p-0 h-[calc(100%-4rem)]">
              <div className="relative h-full">
                <GraphCanvas
                  entities={filteredData.entities.map(entity => ({
                    ...entity,
                    confidence: showProvenance ? entity.confidence : 1.0,
                  }))}
                  relationships={filteredData.relationships}
                  layout={graphLayout}
                  onEntitySelect={handleEntitySelect}
                  selectedEntityId={viewportSync.graph.selectedEntityId}
                  className="h-full"
                />

                {/* XAI Overlays */}
                {showXAI && viewportSync.graph.selectedEntityId && (
                  <div className="absolute top-4 right-4 bg-background/95 backdrop-blur-sm border rounded-lg p-3 shadow-lg max-w-xs">
                    <div className="text-xs font-semibold mb-2">
                      Why is this entity important?
                    </div>
                    <div className="space-y-1 text-xs text-muted-foreground">
                      {(() => {
                        const entity = filteredData.entities.find(
                          e => e.id === viewportSync.graph.selectedEntityId
                        )
                        if (!entity) return null

                        const connections = filteredData.relationships.filter(
                          r =>
                            r.sourceId === entity.id || r.targetId === entity.id
                        )

                        return (
                          <>
                            <div>• {connections.length} connections</div>
                            <div>
                              • {Math.round(entity.confidence * 100)}% confidence
                            </div>
                            <div>• Type: {entity.type}</div>
                            {connections.length > 5 && (
                              <div>• High centrality in network</div>
                            )}
                          </>
                        )
                      })()}
                    </div>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Map Panel (⌘3) */}
        <div
          className={`col-span-3 row-span-11 transition-all ${
            focusedPane === 'map' ? 'ring-2 ring-primary shadow-lg z-10' : ''
          }`}
        >
          <Card className="h-full" tabIndex={0} role="region" aria-labelledby="map-title">
            <CardHeader className="pb-3">
              <CardTitle className="flex items-center gap-2 text-sm" id="map-title">
                <MapPin className="h-4 w-4" />
                Geographic View
                <kbd className="ml-auto text-xs px-1.5 py-0.5 bg-muted rounded">
                  ⌘3
                </kbd>
              </CardTitle>
            </CardHeader>
            <CardContent className="p-0 h-[calc(100%-4rem)]">
              <MapView
                geospatialEvents={filteredData.geospatialEvents}
                entities={filteredData.entities}
                onLocationSelect={handleMapLocationSelect}
                selectedLocationId={viewportSync.map.selectedLocationId}
                center={viewportSync.map.center}
                zoom={viewportSync.map.zoom}
                className="h-full rounded-lg"
              />
            </CardContent>
          </Card>
        </div>

        {/* Sync Status Indicator */}
        {timeFilter && (
          <div
            className="fixed bottom-4 left-4 bg-primary text-primary-foreground px-3 py-2 rounded-lg shadow-lg text-sm flex items-center gap-2 z-30"
            role="status"
            aria-live="polite"
          >
            <Filter className="h-4 w-4" />
            Time filter: {timeFilter.start.toLocaleDateString()} -{' '}
            {timeFilter.end.toLocaleDateString()}
          </div>
        )}

        {/* Keyboard Shortcuts Help */}
        <div
          className="fixed bottom-4 right-4 bg-background border rounded-lg shadow-lg text-xs p-3 max-w-xs opacity-75 hover:opacity-100 transition-opacity"
          role="complementary"
          aria-label="Keyboard shortcuts"
        >
          <div className="font-semibold mb-2">Keyboard Shortcuts</div>
          <div className="space-y-1 text-muted-foreground">
            <div>
              <kbd>⌘1-3</kbd> Focus pane
            </div>
            <div>
              <kbd>P</kbd> Toggle provenance
            </div>
            <div>
              <kbd>X</kbd> Toggle XAI
            </div>
            <div>
              <kbd>Esc</kbd> Clear focus
            </div>
          </div>
        </div>
      </div>

      {/* Explain View Sidebar */}
      <ExplainViewSidebar
        entities={filteredData.entities}
        relationships={filteredData.relationships}
        activeFilters={activeFilters}
      />
    </div>
  )
}

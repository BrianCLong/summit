import React, { useState, useCallback, useEffect, useMemo } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card'
import { Badge } from '@/components/ui/Badge'
import { Button } from '@/components/ui/Button'
import { Tooltip } from '@/components/ui/Tooltip'
import { TimelineRail } from '@/components/panels/TimelineRail'
import { GraphCanvas } from '@/graphs/GraphCanvas'
import { ExplainSidebar, type ExplainData } from './ExplainSidebar'
import {
  Clock,
  Download,
  Eye,
  EyeOff,
  Filter,
  Info,
  Layers,
  Map as MapIcon,
  MapPin,
  Network,
  RefreshCw,
} from 'lucide-react'
import type {
  Entity,
  GeospatialEvent,
  GraphLayout,
  Relationship,
  TimelineEvent,
} from '@/types'

// Types for provenance data
interface ProvenanceInfo {
  sourceId: string
  sourceName: string
  transforms: Array<{
    id: string
    operation: string
    timestamp: Date
    confidence: number
  }>
  license: string
  lastSeen: Date
  confidence: number
}

interface TriPaneAnalysisViewProps {
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

export function TriPaneAnalysisView({
  entities,
  relationships,
  timelineEvents,
  geospatialEvents,
  onEntitySelect,
  onTimeRangeChange,
  onExport,
  className,
}: TriPaneAnalysisViewProps) {
  const [viewportSync, setViewportSync] = useState<ViewportSync>({
    timeline: {},
    map: {},
    graph: {},
  })

  const [timeFilter, setTimeFilter] = useState<TimeRange | null>(null)
  const [showProvenance, setShowProvenance] = useState(true)
  const [showExplain, setShowExplain] = useState(false)
  const [graphLayout] = useState<GraphLayout>({ type: 'force', settings: {} })
  const [provenanceData, setProvenanceData] = useState<
    Map<string, ProvenanceInfo>
  >(new Map())

  // Mock provenance data - in real app this would come from the prov-ledger service
  useEffect(() => {
    const mockProvenance = new Map<string, ProvenanceInfo>()
    entities.forEach(entity => {
      mockProvenance.set(entity.id, {
        sourceId: `src-${entity.id}`,
        sourceName: `Data Source ${entity.id.slice(0, 8)}`,
        transforms: [
          {
            id: `transform-${entity.id}`,
            operation: 'Entity Resolution',
            timestamp: new Date(Date.now() - Math.random() * 86400000),
            confidence: 0.85 + Math.random() * 0.15,
          },
        ],
        license: ['MIT', 'Apache-2.0', 'GPL-3.0'][
          Math.floor(Math.random() * 3)
        ],
        lastSeen: new Date(Date.now() - Math.random() * 3600000),
        confidence: entity.confidence,
      })
    })
    setProvenanceData(mockProvenance)
  }, [entities])

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

    // Filter entities that appear in the filtered events
    const relevantEntityIds = new Set([
      ...filteredTimelineEvents.map(e => e.entityId).filter(Boolean),
      // GeospatialEvent doesn't have entityId, so we skip it
    ])

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

  // Generate dynamic explain data
  const explainData = useMemo<ExplainData>(() => {
    return {
      activeFilters: timeFilter
        ? [{ label: 'Time Range', value: 'Custom' }]
        : [],
      assumptions: [
        {
          id: '1',
          description: 'Linked entities via shared IP address',
          confidence: 0.85,
        },
        {
          id: '2',
          description: 'Inferred ownership based on document metadata',
          confidence: 0.72,
        },
      ],
      topEntities: filteredData.entities.slice(0, 3).map(e => ({
        id: e.id,
        name: e.name,
        score: Math.round(e.confidence * 100) / 10,
        reason: 'High degree centrality in filtered subgraph',
      })),
      provenanceStats: {
        trustedSources: Math.floor(filteredData.entities.length * 0.8),
        totalSources: filteredData.entities.length,
        averageConfidence: 0.88,
      },
    }
  }, [filteredData, timeFilter])

  // Handle time brushing - synchronize all panes when time range changes
  const handleTimeRangeChange = useCallback(
    (range: { start: string; end: string }) => {
      const timeRange = {
        start: new Date(range.start),
        end: new Date(range.end),
      }

      setTimeFilter(timeRange)
      setViewportSync(prev => ({
        ...prev,
        timeline: { ...prev.timeline, timeRange },
      }))

      onTimeRangeChange?.(timeRange)
    },
    [onTimeRangeChange]
  )

  // Handle entity selection - synchronize across all panes
  const handleEntitySelect = useCallback(
    (entity: Entity) => {
      setViewportSync(prev => ({
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

  // Generate provenance tooltip content
  const getProvenanceTooltip = useCallback(
    (entityId: string) => {
      const provenance = provenanceData.get(entityId)
      if (!provenance) return null

      return (
        <div className="space-y-2 text-xs">
          <div>
            <strong>Source:</strong> {provenance.sourceName}
          </div>
          <div>
            <strong>License:</strong>
            <Badge variant="outline" className="ml-1 text-xs">
              {provenance.license}
            </Badge>
          </div>
          <div>
            <strong>Confidence:</strong>{' '}
            {Math.round(provenance.confidence * 100)}%
          </div>
          <div>
            <strong>Last Seen:</strong> {provenance.lastSeen.toLocaleString()}
          </div>
          <div>
            <strong>Transforms:</strong>
            {provenance.transforms.map(transform => (
              <div key={transform.id} className="ml-2 text-muted-foreground">
                • {transform.operation} (
                {Math.round(transform.confidence * 100)}%)
              </div>
            ))}
          </div>
        </div>
      )
    },
    [provenanceData]
  )

  // Performance optimization: debounced sync updates
  const [syncDebounceTimeout, setSyncDebounceTimeout] =
    useState<NodeJS.Timeout | null>(null)

  const debouncedSync = useCallback(
    (syncUpdate: Partial<ViewportSync>) => {
      if (syncDebounceTimeout) {
        clearTimeout(syncDebounceTimeout)
      }

      const timeout = setTimeout(() => {
        setViewportSync(prev => ({
          timeline: { ...prev.timeline, ...syncUpdate.timeline },
          map: { ...prev.map, ...syncUpdate.map },
          graph: { ...prev.graph, ...syncUpdate.graph },
        }))
      }, 120) // 120ms debounce for smooth interaction

      setSyncDebounceTimeout(timeout)
    },
    [syncDebounceTimeout]
  )

  // Calculate grid spans based on sidebar visibility
  const gridSpans = showExplain
    ? {
        timeline: 'col-span-3',
        graph: 'col-span-4',
        map: 'col-span-2',
      }
    : {
        timeline: 'col-span-4',
        graph: 'col-span-5',
        map: 'col-span-3',
      }

  return (
    <div className={`grid grid-cols-12 grid-rows-12 gap-4 h-full ${className}`}>
      {/* Header Controls */}
      <div className="col-span-12 row-span-1 flex items-center justify-between bg-background border rounded-lg p-3">
        <div className="flex items-center gap-4">
          <h1 className="text-lg font-semibold flex items-center gap-2">
            <Layers className="h-5 w-5" />
            Tri-Pane Analysis
          </h1>

          <div className="flex items-center gap-2">
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
          <Button
            variant={showExplain ? 'default' : 'outline'}
            size="sm"
            onClick={() => setShowExplain(!showExplain)}
            className="flex items-center gap-2"
          >
            <Info className="h-4 w-4" />
            Explain View
          </Button>

          <Button
            variant="outline"
            size="sm"
            onClick={() => setShowProvenance(!showProvenance)}
          >
            {showProvenance ? (
              <Eye className="h-4 w-4" />
            ) : (
              <EyeOff className="h-4 w-4" />
            )}
            Provenance
          </Button>

          <Button
            variant="outline"
            size="sm"
            onClick={() => setTimeFilter(null)}
            disabled={!timeFilter}
          >
            <RefreshCw className="h-4 w-4" />
            Reset Filter
          </Button>

          <Button variant="outline" size="sm" onClick={onExport}>
            <Download className="h-4 w-4" />
            Export
          </Button>
        </div>
      </div>

      {/* Timeline Panel */}
      <div className={`${gridSpans.timeline} row-span-11`}>
        <Card className="h-full">
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-sm">
              <Clock className="h-4 w-4" />
              Timeline
              {timeFilter && (
                <Badge variant="secondary" className="text-xs">
                  Filtered
                </Badge>
              )}
            </CardTitle>
          </CardHeader>
          <CardContent className="p-0 h-[calc(100%-4rem)]">
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

      {/* Graph Panel */}
      <div className={`${gridSpans.graph} row-span-11`}>
        <Card className="h-full">
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-sm">
              <Network className="h-4 w-4" />
              Entity Graph
              {showProvenance && (
                <Badge variant="secondary" className="text-xs">
                  Provenance On
                </Badge>
              )}
            </CardTitle>
          </CardHeader>
          <CardContent className="p-0 h-[calc(100%-4rem)]">
            <div className="relative h-full">
              <GraphCanvas
                entities={filteredData.entities.map(entity => ({
                  ...entity,
                  // Apply confidence-based opacity when provenance is shown
                  confidence: showProvenance ? entity.confidence : 1.0,
                }))}
                relationships={filteredData.relationships}
                layout={graphLayout}
                onEntitySelect={handleEntitySelect}
                selectedEntityId={viewportSync.graph.selectedEntityId}
                className="h-full"
              />

              {/* Provenance Tooltips Overlay */}
              {showProvenance &&
                filteredData.entities.map(entity => {
                  const provenance = provenanceData.get(entity.id)
                  if (!provenance) return null

                  return (
                    <Tooltip
                      key={entity.id}
                      content={getProvenanceTooltip(entity.id)}
                    >
                      <div
                        className="absolute w-2 h-2 bg-blue-500 rounded-full opacity-75 pointer-events-none"
                        style={{
                          // Position would be calculated from graph coordinates
                          // This is a placeholder - real implementation would sync with graph node positions
                          top: '50%',
                          left: '50%',
                          transform: 'translate(-50%, -50%)',
                          display: 'none', // Hiding placeholder to avoid clutter
                        }}
                      />
                    </Tooltip>
                  )
                })}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Map Panel */}
      <div className={`${gridSpans.map} row-span-11`}>
        <Card className="h-full">
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-sm">
              <MapPin className="h-4 w-4" />
              Geographic View
            </CardTitle>
          </CardHeader>
          <CardContent className="p-0 h-[calc(100%-4rem)]">
            <div className="h-full bg-slate-100 dark:bg-slate-800 rounded-lg flex items-center justify-center">
              {/* Placeholder for map component */}
              <div className="text-center space-y-2">
                <MapIcon className="h-12 w-12 mx-auto text-muted-foreground" />
                <p className="text-sm text-muted-foreground">Map component</p>
                <p className="text-xs text-muted-foreground">
                  {filteredData.geospatialEvents.length} location events
                </p>
                {viewportSync.map.selectedLocationId && (
                  <Badge variant="secondary" className="text-xs">
                    Selected: {viewportSync.map.selectedLocationId.slice(0, 8)}
                  </Badge>
                )}
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Explain Sidebar */}
      {showExplain && (
        <div className="col-span-3 row-span-11">
          <Card className="h-full overflow-hidden">
            <ExplainSidebar
              open={showExplain}
              data={explainData}
              className="h-full border-0"
            />
          </Card>
        </div>
      )}

      {/* Sync Status Indicator */}
      {timeFilter && (
        <div className="fixed bottom-4 right-4 bg-primary text-primary-foreground px-3 py-2 rounded-lg shadow-lg text-sm flex items-center gap-2">
          <Filter className="h-4 w-4" />
          Time filter active: {timeFilter.start.toLocaleString()} -{' '}
          {timeFilter.end.toLocaleString()}
        </div>
      )}
    </div>
  )
}

// Enhanced entity interface with provenance
export interface EnhancedEntity extends Entity {
  provenance?: ProvenanceInfo
  provenanceOpacity?: number // For visual indication of confidence
}

// Export for use in other components
export type { ProvenanceInfo, ViewportSync }

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
  AlertTriangle,
  GitBranch,
  HelpCircle,
  X,
  Keyboard
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card'
import { Badge } from '@/components/ui/Badge'
import { Button } from '@/components/ui/Button'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/Dialog'
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

  // View States
  const [showProvenance, setShowProvenance] = useState(showProvenanceOverlay)
  const [showRiskSignals, setShowRiskSignals] = useState(false)
  const [showNarrativeFlows, setShowNarrativeFlows] = useState(false)
  const [showShortcutsDialog, setShowShortcutsDialog] = useState(false)

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

      // Help Dialog (?)
      if (e.key === '?' && !e.ctrlKey && !e.metaKey) {
        setShowShortcutsDialog(true)
      }

      // Pane Focus
      if (e.key === 'g' && !e.ctrlKey && !e.metaKey) {
        setActivePane('graph')
      } else if (e.key === 't' && !e.ctrlKey && !e.metaKey) {
        setActivePane('timeline')
      } else if (e.key === 'm' && !e.ctrlKey && !e.metaKey) {
        setActivePane('map')
      }
      // Actions
      else if (e.key === 'r' && !e.ctrlKey && !e.metaKey) {
        handleResetFilters()
      } else if (e.key === 'e' && !e.ctrlKey && !e.metaKey) {
        onExport?.()
      } else if (e.key === 'p' && !e.ctrlKey && !e.metaKey) {
        setShowProvenance(prev => !prev)
      } else if (e.key === '!' && e.shiftKey) { // Shift + 1
        setShowRiskSignals(prev => !prev)
      } else if (e.key === '@' && e.shiftKey) { // Shift + 2
        setShowNarrativeFlows(prev => !prev)
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
          {/* Visual Overlays Toggles */}
          <div className="flex items-center border-r pr-2 mr-2 gap-1">
             <Button
              variant={showRiskSignals ? "secondary" : "ghost"}
              size="sm"
              onClick={() => setShowRiskSignals(!showRiskSignals)}
              title="Toggle Risk Signals (Shift+1)"
              aria-pressed={showRiskSignals}
            >
              <AlertTriangle className={cn("h-4 w-4", showRiskSignals && "text-destructive")} />
            </Button>
            <Button
              variant={showNarrativeFlows ? "secondary" : "ghost"}
              size="sm"
              onClick={() => setShowNarrativeFlows(!showNarrativeFlows)}
              title="Toggle Narrative Flows (Shift+2)"
              aria-pressed={showNarrativeFlows}
            >
              <GitBranch className={cn("h-4 w-4", showNarrativeFlows && "text-blue-500")} />
            </Button>
             <Button
              variant={showProvenance ? "secondary" : "ghost"}
              size="sm"
              onClick={() => setShowProvenance(!showProvenance)}
              title="Toggle Provenance (P)"
              aria-pressed={showProvenance}
            >
               {showProvenance ? (
                <Eye className="h-4 w-4 text-green-600" />
              ) : (
                <EyeOff className="h-4 w-4" />
              )}
            </Button>
          </div>

          <Button
            variant="ghost"
            size="sm"
            onClick={handleResetFilters}
            disabled={!syncState.globalTimeWindow}
            aria-label="Reset all filters"
            title="Reset filters (R)"
          >
            <RefreshCw className="h-4 w-4" />
          </Button>

          {onExport && (
            <Button
              variant="ghost"
              size="sm"
              onClick={onExport}
              aria-label="Export data"
              title="Export data (E)"
            >
              <Download className="h-4 w-4" />
            </Button>
          )}

           <Button
            variant="ghost"
            size="sm"
            onClick={() => setShowShortcutsDialog(true)}
            aria-label="Keyboard Shortcuts"
            title="Keyboard Shortcuts (?)"
          >
            <Keyboard className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {/* Three-pane layout */}
      <div className="flex-1 grid grid-cols-12 gap-4 min-h-0">
        {/* Timeline Pane */}
        <div className="col-span-3 flex flex-col min-h-0">
          <Card className={cn("flex-1 flex flex-col min-h-0", activePane === 'timeline' && "ring-2 ring-primary ring-offset-2")}>
            <CardHeader className="pb-3 flex-shrink-0">
              <CardTitle className="flex items-center gap-2 text-sm">
                <Clock className="h-4 w-4" />
                Timeline
                {syncState.globalTimeWindow && (
                  <Badge variant="secondary" className="text-xs">
                    Filtered
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
          <Card className={cn("flex-1 flex flex-col min-h-0", activePane === 'graph' && "ring-2 ring-primary ring-offset-2")}>
            <CardHeader className="pb-3 flex-shrink-0">
              <CardTitle className="flex items-center gap-2 text-sm">
                <Network className="h-4 w-4" />
                Entity Graph
                {showProvenance && (
                  <Badge variant="outline" className="text-xs border-green-500 text-green-600">
                    Provenance On
                  </Badge>
                )}
                 {showRiskSignals && (
                  <Badge variant="outline" className="text-xs border-red-500 text-red-600">
                    Risk Signals
                  </Badge>
                )}
              </CardTitle>
            </CardHeader>
            <CardContent className="p-0 flex-1 min-h-0 relative">
              <GraphCanvas
                entities={filteredData.entities.map(entity => ({
                  ...entity,
                  confidence: showProvenance ? entity.confidence : 1.0,
                }))}
                relationships={filteredData.relationships}
                layout={syncState.graph.layout}
                onEntitySelect={handleEntitySelect}
                selectedEntityId={syncState.graph.selectedEntityId}
                // Pass overlay props
                showRiskSignals={showRiskSignals}
                showNarrativeFlows={showNarrativeFlows}
                className="h-full"
              />
            </CardContent>
          </Card>
        </div>

        {/* Map Pane */}
        <div className="col-span-3 flex flex-col min-h-0">
          <Card className={cn("flex-1 flex flex-col min-h-0", activePane === 'map' && "ring-2 ring-primary ring-offset-2")}>
            <CardHeader className="pb-3 flex-shrink-0">
              <CardTitle className="flex items-center gap-2 text-sm">
                <MapPin className="h-4 w-4" />
                Geographic View
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

      {/* Shortcuts Dialog */}
      <Dialog open={showShortcutsDialog} onOpenChange={setShowShortcutsDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Keyboard className="h-5 w-5" />
              Keyboard Shortcuts
            </DialogTitle>
            <DialogDescription>
              Quick navigation for power users.
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <h4 className="font-medium text-sm text-muted-foreground">Navigation</h4>
                <ul className="space-y-1 text-sm">
                   <li className="flex justify-between"><span className="font-mono bg-muted px-1 rounded">g</span> <span>Focus Graph</span></li>
                   <li className="flex justify-between"><span className="font-mono bg-muted px-1 rounded">t</span> <span>Focus Timeline</span></li>
                   <li className="flex justify-between"><span className="font-mono bg-muted px-1 rounded">m</span> <span>Focus Map</span></li>
                </ul>
              </div>
              <div className="space-y-2">
                <h4 className="font-medium text-sm text-muted-foreground">Actions</h4>
                 <ul className="space-y-1 text-sm">
                   <li className="flex justify-between"><span className="font-mono bg-muted px-1 rounded">r</span> <span>Reset Filters</span></li>
                   <li className="flex justify-between"><span className="font-mono bg-muted px-1 rounded">e</span> <span>Export</span></li>
                   <li className="flex justify-between"><span className="font-mono bg-muted px-1 rounded">?</span> <span>Show Shortcuts</span></li>
                </ul>
              </div>
              <div className="space-y-2 col-span-2">
                 <h4 className="font-medium text-sm text-muted-foreground">Overlays</h4>
                 <ul className="space-y-1 text-sm grid grid-cols-2 gap-4">
                   <li className="flex justify-between"><span className="font-mono bg-muted px-1 rounded">p</span> <span>Toggle Provenance</span></li>
                   <li className="flex justify-between"><span className="font-mono bg-muted px-1 rounded">Shift+1</span> <span>Toggle Risk Signals</span></li>
                   <li className="flex justify-between"><span className="font-mono bg-muted px-1 rounded">Shift+2</span> <span>Toggle Narrative Flows</span></li>
                 </ul>
              </div>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}

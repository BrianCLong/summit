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

import React, { useState, useCallback, useMemo, useEffect, useRef } from 'react'
import $ from 'jquery'
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
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card'
import { Badge } from '@/components/ui/Badge'
import { Button } from '@/components/ui/Button'
import { GraphCanvas } from '@/graphs/GraphCanvas'
import { TimelineRail } from '@/components/panels/TimelineRail'
import { MapPane } from './MapPane'
import AnnotationPanel from '@/features/annotations/AnnotationPanel'
import { useCollaboration } from '@/lib/yjs/useCollaboration'
import { useGraphSync } from '@/lib/yjs/useGraphSync'
import { CollaborationPanel } from '@/components/CollaborationPanel'
import { CollaborativeCursors } from '@/components/collaboration/CollaborativeCursors'
import { useAuth } from '@/contexts/AuthContext'
import type { Entity, TimelineEvent } from '@/types'
import type { TriPaneShellProps, TriPaneSyncState, TimeWindow } from './types'
import { useSnapshotHandler } from '@/features/snapshots'
import { isFeatureEnabled } from '@/config'
import {
  usePresenceChannel,
  type PresenceChannelSelection,
} from './usePresenceChannel'
import { getStringColor } from '@/lib/utils/colors'

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
  const [pinnedTools, setPinnedTools] = useState<string[]>([])
  const [densityMode, setDensityMode] = useState<'comfortable' | 'compact'>(
    'comfortable'
  )
  const [annotationContext, setAnnotationContext] = useState<{
    entity?: Entity
    timelineEvent?: TimelineEvent
    locationId?: string
  }>({})
  const { user } = useAuth()
  const triPaneRef = useRef<HTMLDivElement | null>(null)
  const localUserId = user?.id || 'anon'

  const parsePresenceSelection = useCallback(
    (selection?: string): PresenceChannelSelection | null => {
      if (!selection) return null
      try {
        const parsed = JSON.parse(selection) as PresenceChannelSelection
        if (!parsed?.pane || !parsed?.id) return null
        return parsed
      } catch (error) {
        return null
      }
    },
    []
  )

  const hexToRgba = useCallback((hex: string, alpha: number) => {
    const normalized = hex.replace('#', '')
    const full =
      normalized.length === 3
        ? normalized
            .split('')
            .map(char => `${char}${char}`)
            .join('')
        : normalized
    const int = Number.parseInt(full, 16)
    if (Number.isNaN(int)) {
      return `rgba(59, 130, 246, ${alpha})`
    }
    const r = (int >> 16) & 255
    const g = (int >> 8) & 255
    const b = int & 255
    return `rgba(${r}, ${g}, ${b}, ${alpha})`
  }, [])

  // Snapshot integration
  useSnapshotHandler(
    'triPane',
    () => ({
      syncState,
      activePane,
      showProvenance,
      pinnedTools,
      densityMode,
    }),
    data => {
      if (data.syncState) setSyncState(data.syncState)
      if (data.activePane) setActivePane(data.activePane)
      if (typeof data.showProvenance === 'boolean')
        setShowProvenance(data.showProvenance)
      if (data.pinnedTools) setPinnedTools(data.pinnedTools)
      if (data.densityMode) setDensityMode(data.densityMode)
    }
  )

  // Auth context
  const token = localStorage.getItem('auth_token') || undefined

  // Initialize collaboration
  const { doc, users, isConnected, isSynced } = useCollaboration(
    'main-graph', // TODO: Make dynamic based on workspace/investigation ID
    user
      ? { id: user.id, name: user.name || user.email }
      : { id: 'anon', name: 'Anonymous' },
    token
  )

  const {
    cursors: presenceCursors,
    members: presenceMembers,
    emitPresenceUpdate,
  } = usePresenceChannel({
    workspaceId: 'tri-pane',
    channel: 'tri-pane',
    userId: localUserId,
    userName: user?.name || user?.email || 'Anonymous',
    token,
  })

  const remoteSelections = useMemo(() => {
    return Array.from(presenceMembers.values())
      .filter(member => member.userId !== localUserId && member.selection)
      .map(member => {
        const selection = parsePresenceSelection(member.selection)
        if (!selection) return null
        return {
          userId: member.userId,
          userName: member.userName,
          selection,
        }
      })
      .filter(
        (
          entry
        ): entry is {
          userId: string
          userName: string
          selection: PresenceChannelSelection
        } => Boolean(entry)
      )
  }, [localUserId, parsePresenceSelection, presenceMembers])

  // Sync graph data
  const {
    entities: graphEntities,
    relationships: graphRelationships,
    updateEntityPosition,
  } = useGraphSync(doc, entities, relationships)

  // Filter data based on global time window
  const filteredData = useMemo(() => {
    const currentEntities = graphEntities
    const currentRelationships = graphRelationships

    if (!syncState.globalTimeWindow) {
      return {
        entities: currentEntities,
        relationships: currentRelationships,
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

    const filteredEntities = currentEntities.filter(entity => {
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
    const filteredRelationships = currentRelationships.filter(
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
    graphEntities,
    graphRelationships,
    timelineEvents,
    geospatialEvents,
    syncState.globalTimeWindow,
  ])

  useEffect(() => {
    if (!triPaneRef.current) return

    const selectionDetails = [
      {
        pane: 'graph',
        id: syncState.graph.selectedEntityId,
        label:
          filteredData.entities.find(
            entity => entity.id === syncState.graph.selectedEntityId
          )?.name || syncState.graph.selectedEntityId,
      },
      {
        pane: 'timeline',
        id: syncState.timeline.selectedEventId,
        label:
          filteredData.timelineEvents.find(
            event => event.id === syncState.timeline.selectedEventId
          )?.title || syncState.timeline.selectedEventId,
      },
      {
        pane: 'map',
        id: syncState.map.selectedLocationId,
        label: syncState.map.selectedLocationId,
      },
    ]

    const $root = $(triPaneRef.current)
    selectionDetails.forEach(({ pane, id, label }) => {
      const $pane = $root.find(`[data-pane="${pane}"]`)
      if ($pane.length === 0) return

      let $overlay = $pane.find('.tri-pane-selection-overlay')
      if ($overlay.length === 0) {
        $overlay = $('<div/>', { class: 'tri-pane-selection-overlay' }).css({
          position: 'absolute',
          inset: 0,
          background: 'rgba(59, 130, 246, 0.12)',
          border: '2px solid rgba(59, 130, 246, 0.45)',
          borderRadius: '0.5rem',
          pointerEvents: 'none',
          display: 'none',
          zIndex: 10,
        })
        const $label = $('<div/>', {
          class: 'tri-pane-selection-overlay__label',
        }).css({
          position: 'absolute',
          top: '0.5rem',
          right: '0.5rem',
          background: 'rgba(37, 99, 235, 0.9)',
          color: '#fff',
          padding: '0.25rem 0.5rem',
          borderRadius: '9999px',
          fontSize: '0.75rem',
          fontWeight: 600,
          maxWidth: '70%',
          overflow: 'hidden',
          textOverflow: 'ellipsis',
          whiteSpace: 'nowrap',
        })
        $overlay.append($label)
        $pane.append($overlay)
      }

      const $label = $overlay.find('.tri-pane-selection-overlay__label')
      if (id) {
        $label.text(label || id)
        $overlay.show()
      } else {
        $overlay.hide()
      }
    })
  }, [
    filteredData.entities,
    filteredData.timelineEvents,
    syncState.graph.selectedEntityId,
    syncState.timeline.selectedEventId,
    syncState.map.selectedLocationId,
  ])

  useEffect(() => {
    if (!triPaneRef.current) return
    const $root = $(triPaneRef.current)
    const panes: Array<'graph' | 'timeline' | 'map'> = [
      'graph',
      'timeline',
      'map',
    ]
    const selectionsByPane = new Map<
      'graph' | 'timeline' | 'map',
      Array<{
        userId: string
        userName: string
        selection: PresenceChannelSelection
      }>
    >()

    remoteSelections.forEach(entry => {
      const pane = entry.selection.pane
      const list = selectionsByPane.get(pane) ?? []
      list.push(entry)
      selectionsByPane.set(pane, list)
    })

    panes.forEach(pane => {
      const $pane = $root.find(`[data-pane="${pane}"]`)
      if ($pane.length === 0) return

      let $layer = $pane.find('.tri-pane-remote-selection-layer')
      const paneSelections = selectionsByPane.get(pane) ?? []

      if (paneSelections.length === 0) {
        $layer.remove()
        return
      }

      if ($layer.length === 0) {
        $layer = $('<div/>', { class: 'tri-pane-remote-selection-layer' }).css({
          position: 'absolute',
          inset: 0,
          pointerEvents: 'none',
          zIndex: 9,
        })
        $pane.append($layer)
      }

      const activeUserIds = new Set(paneSelections.map(entry => entry.userId))

      paneSelections.forEach((entry, index) => {
        const { userId, userName, selection } = entry
        let $overlay = $layer.find(`[data-user="${userId}"]`)
        const baseColor = getStringColor(userId)
        const borderColor = hexToRgba(baseColor, 0.55)
        const fillColor = hexToRgba(baseColor, 0.12)
        const labelText = `${userName}: ${selection.label || selection.id}`

        if ($overlay.length === 0) {
          $overlay = $('<div/>', {
            class: 'tri-pane-remote-selection-overlay',
            'data-user': userId,
          }).css({
            position: 'absolute',
            inset: 0,
            borderRadius: '0.5rem',
            borderStyle: 'dashed',
            borderWidth: '2px',
            pointerEvents: 'none',
            display: 'none',
          })
          const $label = $('<div/>', {
            class: 'tri-pane-remote-selection-overlay__label',
          }).css({
            position: 'absolute',
            left: '0.5rem',
            background: baseColor,
            color: '#fff',
            padding: '0.2rem 0.5rem',
            borderRadius: '9999px',
            fontSize: '0.7rem',
            fontWeight: 600,
            maxWidth: '70%',
            overflow: 'hidden',
            textOverflow: 'ellipsis',
            whiteSpace: 'nowrap',
          })
          $overlay.append($label)
          $layer.append($overlay)
        }

        $overlay.css({
          borderColor,
          background: fillColor,
          display: selection.id ? 'block' : 'none',
        })

        $overlay
          .find('.tri-pane-remote-selection-overlay__label')
          .css({ top: `calc(0.5rem + ${index * 1.5}rem)` })
          .text(labelText)
      })

      $layer.find('.tri-pane-remote-selection-overlay').each((_, element) => {
        const $element = $(element)
        const userId = $element.data('user')
        if (!activeUserIds.has(userId)) {
          $element.remove()
        }
      })
    })
  }, [remoteSelections, hexToRgba])

  useEffect(() => {
    if (!triPaneRef.current) return
    const container = triPaneRef.current

    const handleMouseMove = (event: MouseEvent) => {
      const rect = container.getBoundingClientRect()
      const x = event.clientX - rect.left
      const y = event.clientY - rect.top
      emitPresenceUpdate({ cursor: { x, y } })
    }

    container.addEventListener('mousemove', handleMouseMove)
    return () => container.removeEventListener('mousemove', handleMouseMove)
  }, [emitPresenceUpdate])

  useEffect(() => {
    const selection = syncState.graph.selectedEntityId
      ? {
          pane: 'graph',
          id: syncState.graph.selectedEntityId,
          label:
            filteredData.entities.find(
              entity => entity.id === syncState.graph.selectedEntityId
            )?.name || syncState.graph.selectedEntityId,
        }
      : syncState.timeline.selectedEventId
        ? {
            pane: 'timeline',
            id: syncState.timeline.selectedEventId,
            label:
              filteredData.timelineEvents.find(
                event => event.id === syncState.timeline.selectedEventId
              )?.title || syncState.timeline.selectedEventId,
          }
        : syncState.map.selectedLocationId
          ? {
              pane: 'map',
              id: syncState.map.selectedLocationId,
            }
          : undefined

    emitPresenceUpdate({ selection })
  }, [
    emitPresenceUpdate,
    filteredData.entities,
    filteredData.timelineEvents,
    syncState.graph.selectedEntityId,
    syncState.timeline.selectedEventId,
    syncState.map.selectedLocationId,
  ])

  // Handle entity selection from graph
  const handleEntitySelect = useCallback(
    (entity: Entity) => {
      setAnnotationContext(prev => ({ ...prev, entity }))
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

      setAnnotationContext(prev => ({ ...prev, timelineEvent: event }))
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
      setAnnotationContext(prev => ({ ...prev, locationId }))
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

          <div
            className="flex items-center gap-2"
            role="status"
            aria-live="polite"
          >
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
            onClick={() => {
              setShowProvenance(!showProvenance)
            }}
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
      <div
        className="flex-1 grid grid-cols-12 gap-4 min-h-0 relative"
        ref={triPaneRef}
      >
        <CollaborativeCursors cursors={presenceCursors} />
        {/* Timeline Pane */}
        <div className="col-span-3 flex flex-col min-h-0">
          <Card
            className="flex-1 flex flex-col min-h-0 relative overflow-hidden"
            data-pane="timeline"
          >
            <CardHeader className="pb-3 flex-shrink-0">
              <CardTitle
                className="flex items-center gap-2 text-sm"
                role="heading"
                aria-level={2}
              >
                <Clock className="h-4 w-4" aria-hidden="true" />
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
          <Card
            className="flex-1 flex flex-col min-h-0 relative overflow-hidden"
            data-pane="graph"
          >
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
                onNodeDragEnd={(node, pos) =>
                  updateEntityPosition(node.id, pos.x, pos.y)
                }
                selectedEntityId={syncState.graph.selectedEntityId}
                className="h-full"
              />
            </CardContent>
          </Card>
        </div>

        {/* Map Pane */}
        <div className="col-span-3 flex flex-col min-h-0">
          <Card
            className="flex-1 flex flex-col min-h-0 relative overflow-hidden"
            data-pane="map"
          >
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

      {isFeatureEnabled('ui.annotationsV1') && (
        <div className="grid grid-cols-12 gap-4 min-h-[260px]">
          <div className="col-span-12 lg:col-span-5">
            <AnnotationPanel
              context={{
                entity: annotationContext.entity,
                timelineEvent: annotationContext.timelineEvent,
                location: filteredData.geospatialEvents.find(
                  loc => loc.id === annotationContext.locationId
                ),
              }}
            />
          </div>
        </div>
      )}

      <CollaborationPanel
        users={users}
        isConnected={isConnected}
        isSynced={isSynced}
      />

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
      <div
        className="sr-only"
        role="complementary"
        aria-label="Keyboard shortcuts"
      >
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

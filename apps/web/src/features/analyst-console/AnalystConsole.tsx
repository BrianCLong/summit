/**
 * Analyst Console
 *
 * Main tri-pane analyst console component with Graph, Timeline, Map,
 * and "Explain This View" panel. All panes share synchronized global
 * view state for cross-highlighting, filtering, and selection.
 *
 * Frontend Stack: React 19 + TypeScript + Tailwind + Vite
 */

import React, { useMemo, useCallback, useEffect, useState } from 'react'
import {
  Layers,
  Network,
  Clock,
  MapPin,
  Download,
  RefreshCw,
  Eye,
  EyeOff,
  Lightbulb,
  Keyboard,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card'
import { Badge } from '@/components/ui/Badge'
import { Button } from '@/components/ui/Button'
import { Tooltip } from '@/components/ui/Tooltip'
import {
  AnalystViewProvider,
  useAnalystView,
  createDefaultViewState,
} from './AnalystViewContext'
import { GraphPane } from './GraphPane'
import { TimelinePane } from './TimelinePane'
import { AnalystMapPane } from './AnalystMapPane'
import { ExplainThisViewPanel } from './ExplainThisViewPanel'
import type { AnalystConsoleProps, AnalystViewState } from './types'

/**
 * Inner console component that uses the context
 */
function AnalystConsoleInner({
  entities,
  links,
  events,
  locations,
  className,
  onExport,
}: AnalystConsoleProps) {
  const { state, resetSelection, resetFilters, resetAll } = useAnalystView()
  const [showExplainPanel, setShowExplainPanel] = useState(true)
  const [showProvenance, setShowProvenance] = useState(false)
  const [focusedPane, setFocusedPane] = useState<'graph' | 'timeline' | 'map' | null>(null)

  // Calculate visible counts for header badges
  const visibleCounts = useMemo(() => {
    const fromTime = new Date(state.timeWindow.from).getTime()
    const toTime = new Date(state.timeWindow.to).getTime()

    // Filter events by time window
    const visibleEvents = events.filter(event => {
      const eventTime = new Date(event.timestamp).getTime()
      return eventTime >= fromTime && eventTime <= toTime
    })

    // Get entity IDs involved in visible events
    const entityIdsInTimeWindow = new Set(visibleEvents.flatMap(e => e.entityIds))

    // Filter entities (could be more sophisticated)
    let visibleEntities = entities
    if (state.filters.entityTypes && state.filters.entityTypes.length > 0) {
      visibleEntities = visibleEntities.filter(e =>
        state.filters.entityTypes?.includes(e.type)
      )
    }

    // Filter locations by time window
    const visibleLocations = locations.filter(loc => {
      if (loc.firstSeenAt && loc.lastSeenAt) {
        const firstSeen = new Date(loc.firstSeenAt).getTime()
        const lastSeen = new Date(loc.lastSeenAt).getTime()
        return firstSeen <= toTime && lastSeen >= fromTime
      }
      return true
    })

    // Filter links
    const visibleEntityIds = new Set(visibleEntities.map(e => e.id))
    const visibleLinks = links.filter(
      link =>
        visibleEntityIds.has(link.sourceId) && visibleEntityIds.has(link.targetId)
    )

    return {
      entities: visibleEntities.length,
      links: visibleLinks.length,
      events: visibleEvents.length,
      locations: visibleLocations.length,
    }
  }, [entities, links, events, locations, state])

  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Skip if in input/textarea
      if (
        e.target instanceof HTMLInputElement ||
        e.target instanceof HTMLTextAreaElement
      ) {
        return
      }

      // Cmd/Ctrl + 1/2/3 to focus panes
      if ((e.metaKey || e.ctrlKey) && e.key >= '1' && e.key <= '3') {
        e.preventDefault()
        const panes = ['graph', 'timeline', 'map'] as const
        setFocusedPane(panes[parseInt(e.key) - 1])
      }

      // Escape to clear focus
      if (e.key === 'Escape') {
        setFocusedPane(null)
        resetSelection()
      }

      // P for provenance
      if (e.key === 'p' || e.key === 'P') {
        setShowProvenance(prev => !prev)
      }

      // E for explain panel
      if (e.key === 'e' || e.key === 'E') {
        setShowExplainPanel(prev => !prev)
      }

      // R for reset
      if (e.key === 'r' && !e.metaKey && !e.ctrlKey) {
        resetAll()
      }
    }

    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [resetSelection, resetAll])

  // Check if any filters are active
  const hasActiveFilters =
    (state.filters.entityTypes && state.filters.entityTypes.length > 0) ||
    (state.filters.eventTypes && state.filters.eventTypes.length > 0) ||
    state.filters.minConfidence !== undefined

  const hasSelection =
    state.selection.selectedEntityIds.length > 0 ||
    state.selection.selectedEventIds.length > 0 ||
    state.selection.selectedLocationIds.length > 0

  return (
    <div
      className={cn(
        'flex flex-col h-full w-full bg-slate-950 text-slate-50',
        className
      )}
      role="main"
      aria-label="Tri-pane analyst console"
    >
      {/* Header Controls */}
      <div className="flex items-center justify-between bg-slate-900 border-b border-slate-800 p-3">
        <div className="flex items-center gap-4">
          <h1 className="text-lg font-semibold flex items-center gap-2">
            <Layers className="h-5 w-5 text-blue-400" />
            Analyst Console
          </h1>

          {/* Status badges */}
          <div className="flex items-center gap-2" role="status" aria-live="polite">
            <Badge variant="outline" className="flex items-center gap-1">
              <Network className="h-3 w-3" />
              {visibleCounts.entities} entities
            </Badge>
            <Badge variant="outline" className="flex items-center gap-1">
              <Clock className="h-3 w-3" />
              {visibleCounts.events} events
            </Badge>
            <Badge variant="outline" className="flex items-center gap-1">
              <MapPin className="h-3 w-3" />
              {visibleCounts.locations} locations
            </Badge>
          </div>
        </div>

        {/* Controls */}
        <div className="flex items-center gap-2">
          <Tooltip content="Toggle provenance overlay (P)">
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
              <span className="ml-1 hidden sm:inline">Provenance</span>
            </Button>
          </Tooltip>

          <Tooltip content="Toggle explain panel (E)">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setShowExplainPanel(!showExplainPanel)}
              aria-label="Toggle explain panel"
              aria-pressed={showExplainPanel}
            >
              <Lightbulb className="h-4 w-4" />
              <span className="ml-1 hidden sm:inline">Explain</span>
            </Button>
          </Tooltip>

          <Tooltip content="Reset all filters and selection (R)">
            <Button
              variant="outline"
              size="sm"
              onClick={resetAll}
              disabled={!hasActiveFilters && !hasSelection}
              aria-label="Reset all"
            >
              <RefreshCw className="h-4 w-4" />
              <span className="ml-1 hidden sm:inline">Reset</span>
            </Button>
          </Tooltip>

          {onExport && (
            <Tooltip content="Export current view">
              <Button variant="outline" size="sm" onClick={onExport} aria-label="Export">
                <Download className="h-4 w-4" />
                <span className="ml-1 hidden sm:inline">Export</span>
              </Button>
            </Tooltip>
          )}
        </div>
      </div>

      {/* Main content area */}
      <div className="flex flex-1 min-h-0 overflow-hidden">
        {/* Tri-pane layout */}
        <div
          className={cn(
            'flex flex-col flex-1 min-w-0 transition-all duration-300',
            showExplainPanel ? 'mr-0' : ''
          )}
        >
          <div className="flex flex-1 min-h-0 overflow-hidden">
            {/* Left: Graph + Timeline stacked */}
            <div className="flex flex-col flex-[2] min-w-0 border-r border-slate-800">
              {/* Graph Pane */}
              <div
                className={cn(
                  'flex-1 min-h-0 transition-all',
                  focusedPane === 'graph' && 'ring-2 ring-blue-500 ring-inset'
                )}
              >
                <Card className="h-full rounded-none border-0 border-b border-slate-800">
                  <CardHeader className="pb-2 bg-slate-900/50">
                    <CardTitle className="text-sm flex items-center gap-2">
                      <Network className="h-4 w-4" />
                      Graph
                      <kbd className="ml-auto text-xs px-1.5 py-0.5 bg-slate-800 rounded hidden sm:inline">
                        ⌘1
                      </kbd>
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="p-0 h-[calc(100%-3rem)]">
                    <GraphPane entities={entities} links={links} events={events} />
                  </CardContent>
                </Card>
              </div>

              {/* Timeline Pane */}
              <div
                className={cn(
                  'h-48 min-h-[12rem] transition-all',
                  focusedPane === 'timeline' && 'ring-2 ring-blue-500 ring-inset'
                )}
              >
                <Card className="h-full rounded-none border-0">
                  <CardHeader className="pb-2 bg-slate-900/50">
                    <CardTitle className="text-sm flex items-center gap-2">
                      <Clock className="h-4 w-4" />
                      Timeline
                      <kbd className="ml-auto text-xs px-1.5 py-0.5 bg-slate-800 rounded hidden sm:inline">
                        ⌘2
                      </kbd>
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="p-0 h-[calc(100%-3rem)]">
                    <TimelinePane events={events} />
                  </CardContent>
                </Card>
              </div>
            </div>

            {/* Right: Map Pane */}
            <div
              className={cn(
                'flex flex-1 min-w-0 transition-all',
                focusedPane === 'map' && 'ring-2 ring-blue-500 ring-inset'
              )}
            >
              <Card className="h-full w-full rounded-none border-0">
                <CardHeader className="pb-2 bg-slate-900/50">
                  <CardTitle className="text-sm flex items-center gap-2">
                    <MapPin className="h-4 w-4" />
                    Map
                    <kbd className="ml-auto text-xs px-1.5 py-0.5 bg-slate-800 rounded hidden sm:inline">
                      ⌘3
                    </kbd>
                  </CardTitle>
                </CardHeader>
                <CardContent className="p-0 h-[calc(100%-3rem)]">
                  <AnalystMapPane locations={locations} events={events} />
                </CardContent>
              </Card>
            </div>
          </div>
        </div>

        {/* Explain This View Panel */}
        {showExplainPanel && (
          <div className="w-80 min-w-[20rem] max-w-sm flex-shrink-0">
            <ExplainThisViewPanel
              entities={entities}
              links={links}
              events={events}
              locations={locations}
            />
          </div>
        )}
      </div>

      {/* Keyboard shortcuts overlay (bottom right) */}
      <div className="fixed bottom-4 right-4 bg-slate-900/90 backdrop-blur-sm border border-slate-800 rounded-lg shadow-lg text-xs p-3 max-w-xs opacity-60 hover:opacity-100 transition-opacity z-50 hidden lg:block">
        <div className="flex items-center gap-2 font-semibold mb-2 text-slate-300">
          <Keyboard className="h-4 w-4" />
          Shortcuts
        </div>
        <div className="space-y-1 text-slate-400">
          <div>
            <kbd className="px-1 bg-slate-800 rounded">⌘1-3</kbd> Focus pane
          </div>
          <div>
            <kbd className="px-1 bg-slate-800 rounded">P</kbd> Provenance
          </div>
          <div>
            <kbd className="px-1 bg-slate-800 rounded">E</kbd> Explain panel
          </div>
          <div>
            <kbd className="px-1 bg-slate-800 rounded">R</kbd> Reset
          </div>
          <div>
            <kbd className="px-1 bg-slate-800 rounded">Esc</kbd> Clear selection
          </div>
        </div>
      </div>
    </div>
  )
}

/**
 * Main AnalystConsole component - wraps inner component with provider
 */
export function AnalystConsole({
  entities,
  links,
  events,
  locations,
  initialTimeWindow,
  className,
  onExport,
}: AnalystConsoleProps) {
  // Create initial state
  const initialState: AnalystViewState = useMemo(() => {
    const defaultState = createDefaultViewState()

    if (initialTimeWindow) {
      return {
        ...defaultState,
        timeWindow: initialTimeWindow,
      }
    }

    // If no initial time window, derive from events if possible
    if (events.length > 0) {
      const timestamps = events.map(e => new Date(e.timestamp).getTime())
      const minTime = Math.min(...timestamps)
      const maxTime = Math.max(...timestamps)

      // Add some padding
      const padding = (maxTime - minTime) * 0.1

      return {
        ...defaultState,
        timeWindow: {
          from: new Date(minTime - padding).toISOString(),
          to: new Date(maxTime + padding).toISOString(),
        },
      }
    }

    return defaultState
  }, [events, initialTimeWindow])

  return (
    <AnalystViewProvider initialState={initialState}>
      <AnalystConsoleInner
        entities={entities}
        links={links}
        events={events}
        locations={locations}
        className={className}
        onExport={onExport}
      />
    </AnalystViewProvider>
  )
}

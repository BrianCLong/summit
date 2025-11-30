/**
 * Explain This View Panel
 *
 * An intelligent summary panel that explains the current state of the
 * analyst console in human-readable text. Updates dynamically as the
 * view state changes.
 */

import React, { useMemo, useState } from 'react'
import {
  Lightbulb,
  X,
  ChevronDown,
  ChevronUp,
  Network,
  Clock,
  MapPin,
  Filter,
  TrendingUp,
  BarChart3,
  Info,
  Users,
  Link2,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card'
import { Badge } from '@/components/ui/Badge'
import { Button } from '@/components/ui/Button'
import { useAnalystView } from './AnalystViewContext'
import type {
  ExplainThisViewPanelProps,
  AnalystEntity,
  AnalystLink,
  ViewExplanation,
  ViewExplanationMetrics,
} from './types'

/**
 * Build a human-readable explanation of the current view
 */
function buildViewExplanation(params: {
  timeWindow: { from: string; to: string }
  visibleEntities: AnalystEntity[]
  visibleLinks: AnalystLink[]
  visibleEventCount: number
  visibleLocationCount: number
  selection: {
    selectedEntityIds: string[]
    selectedEventIds: string[]
    selectedLocationIds: string[]
  }
  filters: {
    entityTypes?: string[]
    eventTypes?: string[]
    minConfidence?: number
  }
}): ViewExplanation {
  const {
    timeWindow,
    visibleEntities,
    visibleLinks,
    visibleEventCount,
    visibleLocationCount,
    selection,
    filters,
  } = params

  // Calculate metrics
  const entityTypeDistribution: Record<string, number> = {}
  visibleEntities.forEach(e => {
    entityTypeDistribution[e.type] = (entityTypeDistribution[e.type] || 0) + 1
  })

  // Find top entities by connections (degree centrality)
  const connectionCounts = new Map<string, number>()
  visibleLinks.forEach(link => {
    connectionCounts.set(
      link.sourceId,
      (connectionCounts.get(link.sourceId) || 0) + 1
    )
    connectionCounts.set(
      link.targetId,
      (connectionCounts.get(link.targetId) || 0) + 1
    )
  })

  const topEntities = visibleEntities
    .map(entity => ({
      entity,
      connectionCount: connectionCounts.get(entity.id) || 0,
    }))
    .sort((a, b) => {
      // Sort by importance score first, then by connections
      const aScore = a.entity.importanceScore || 0
      const bScore = b.entity.importanceScore || 0
      if (bScore !== aScore) return bScore - aScore
      return b.connectionCount - a.connectionCount
    })
    .slice(0, 5)

  const metrics: ViewExplanationMetrics = {
    visibleEntityCount: visibleEntities.length,
    visibleLinkCount: visibleLinks.length,
    visibleEventCount,
    visibleLocationCount,
    topEntities,
    entityTypeDistribution,
    eventTypeDistribution: {}, // Could be populated from events
  }

  // Build headline
  const fromDate = new Date(timeWindow.from)
  const toDate = new Date(timeWindow.to)
  const daysDiff = Math.ceil(
    (toDate.getTime() - fromDate.getTime()) / (1000 * 60 * 60 * 24)
  )

  let headline = `Viewing ${visibleEntities.length} entities and ${visibleLinks.length} relationships`

  if (daysDiff <= 1) {
    headline += ` from the past day`
  } else if (daysDiff <= 7) {
    headline += ` from the past ${daysDiff} days`
  } else if (daysDiff <= 30) {
    headline += ` from the past ${Math.ceil(daysDiff / 7)} weeks`
  } else {
    headline += ` from ${fromDate.toLocaleDateString()} to ${toDate.toLocaleDateString()}`
  }

  // Add selection context to headline
  if (selection.selectedEntityIds.length > 0) {
    const selectedEntity = visibleEntities.find(
      e => e.id === selection.selectedEntityIds[0]
    )
    if (selectedEntity) {
      headline += `. Currently focused on "${selectedEntity.label}"`
    }
  }

  // Build detail bullets
  const detailBullets: string[] = []

  // Visible counts
  detailBullets.push(
    `Visible: ${visibleEntities.length} entities, ${visibleLinks.length} links, ${visibleEventCount} events, ${visibleLocationCount} locations`
  )

  // Top entities
  if (topEntities.length > 0) {
    const topNames = topEntities
      .slice(0, 3)
      .map(t => t.entity.label)
      .join(', ')
    detailBullets.push(`Top entities by importance: ${topNames}`)
  }

  // Entity type breakdown
  const typeEntries = Object.entries(entityTypeDistribution)
  if (typeEntries.length > 0) {
    const typeBreakdown = typeEntries
      .sort((a, b) => b[1] - a[1])
      .slice(0, 4)
      .map(([type, count]) => `${count} ${type}`)
      .join(', ')
    detailBullets.push(`Entity types: ${typeBreakdown}`)
  }

  // Active filters
  if (filters.entityTypes && filters.entityTypes.length > 0) {
    detailBullets.push(
      `Filtering by entity types: ${filters.entityTypes.join(', ')}`
    )
  }
  if (filters.minConfidence !== undefined) {
    detailBullets.push(
      `Minimum confidence threshold: ${Math.round(filters.minConfidence * 100)}%`
    )
  }

  // Selection info
  if (selection.selectedEntityIds.length > 0) {
    detailBullets.push(
      `Currently selected: ${selection.selectedEntityIds.length} entities`
    )
  }

  return {
    headline,
    detailBullets,
    metrics,
  }
}

/**
 * ExplainThisViewPanel component
 */
export function ExplainThisViewPanel({
  entities,
  links,
  events,
  locations,
  className,
}: ExplainThisViewPanelProps) {
  const { state, resetSelection, resetFilters } = useAnalystView()
  const [isCollapsed, setIsCollapsed] = useState(false)
  const [expandedSections, setExpandedSections] = useState<Set<string>>(
    new Set(['summary', 'metrics', 'top-entities'])
  )

  // Filter data based on current view state
  const filteredData = useMemo(() => {
    const fromTime = new Date(state.timeWindow.from).getTime()
    const toTime = new Date(state.timeWindow.to).getTime()

    // Filter entities
    let visibleEntities = entities.filter(entity => {
      // Filter by entity types if specified
      if (
        state.filters.entityTypes &&
        state.filters.entityTypes.length > 0 &&
        !state.filters.entityTypes.includes(entity.type)
      ) {
        return false
      }
      // Filter by confidence if specified
      if (
        state.filters.minConfidence !== undefined &&
        (entity.confidence ?? 1) < state.filters.minConfidence
      ) {
        return false
      }
      return true
    })

    // Filter events by time window
    const visibleEvents = events.filter(event => {
      const eventTime = new Date(event.timestamp).getTime()
      if (eventTime < fromTime || eventTime > toTime) return false
      if (
        state.filters.eventTypes &&
        state.filters.eventTypes.length > 0 &&
        !state.filters.eventTypes.includes(event.type)
      ) {
        return false
      }
      return true
    })

    // Filter links to only include those between visible entities
    const visibleEntityIds = new Set(visibleEntities.map(e => e.id))
    const visibleLinks = links.filter(
      link =>
        visibleEntityIds.has(link.sourceId) && visibleEntityIds.has(link.targetId)
    )

    // Filter locations by time window
    const visibleLocations = locations.filter(loc => {
      if (loc.firstSeenAt && loc.lastSeenAt) {
        const firstSeen = new Date(loc.firstSeenAt).getTime()
        const lastSeen = new Date(loc.lastSeenAt).getTime()
        return firstSeen <= toTime && lastSeen >= fromTime
      }
      return true
    })

    return {
      entities: visibleEntities,
      links: visibleLinks,
      events: visibleEvents,
      locations: visibleLocations,
    }
  }, [entities, links, events, locations, state])

  // Build explanation
  const explanation = useMemo(() => {
    return buildViewExplanation({
      timeWindow: state.timeWindow,
      visibleEntities: filteredData.entities,
      visibleLinks: filteredData.links,
      visibleEventCount: filteredData.events.length,
      visibleLocationCount: filteredData.locations.length,
      selection: state.selection,
      filters: state.filters,
    })
  }, [filteredData, state])

  const toggleSection = (section: string) => {
    setExpandedSections(prev => {
      const next = new Set(prev)
      if (next.has(section)) {
        next.delete(section)
      } else {
        next.add(section)
      }
      return next
    })
  }

  if (isCollapsed) {
    return (
      <Button
        variant="secondary"
        size="sm"
        onClick={() => setIsCollapsed(false)}
        className={cn('flex items-center gap-2', className)}
        aria-label="Expand Explain This View panel"
      >
        <Lightbulb className="h-4 w-4" />
        Explain This View
      </Button>
    )
  }

  return (
    <div
      className={cn(
        'flex flex-col h-full bg-slate-900 border-l border-slate-800 overflow-hidden',
        className
      )}
      role="complementary"
      aria-label="Explain This View panel"
    >
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b border-slate-800">
        <h2 className="text-sm font-semibold flex items-center gap-2 text-slate-200">
          <Lightbulb className="h-4 w-4 text-yellow-400" />
          Explain This View
        </h2>
        <Button
          variant="ghost"
          size="icon"
          className="h-6 w-6"
          onClick={() => setIsCollapsed(true)}
          aria-label="Collapse panel"
        >
          <X className="h-4 w-4" />
        </Button>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {/* Headline Summary */}
        <Card className="bg-slate-800/50 border-slate-700">
          <CardHeader
            className="pb-2 cursor-pointer"
            onClick={() => toggleSection('summary')}
          >
            <CardTitle className="text-sm flex items-center justify-between">
              <span className="flex items-center gap-2">
                <Info className="h-4 w-4" />
                Summary
              </span>
              {expandedSections.has('summary') ? (
                <ChevronUp className="h-4 w-4" />
              ) : (
                <ChevronDown className="h-4 w-4" />
              )}
            </CardTitle>
          </CardHeader>
          {expandedSections.has('summary') && (
            <CardContent className="pt-0">
              <p className="text-sm text-slate-300 leading-relaxed">
                {explanation.headline}
              </p>
              <ul className="mt-3 space-y-1">
                {explanation.detailBullets.map((bullet, i) => (
                  <li
                    key={i}
                    className="text-xs text-slate-400 flex items-start gap-2"
                  >
                    <span className="text-slate-500 mt-0.5">•</span>
                    <span>{bullet}</span>
                  </li>
                ))}
              </ul>
            </CardContent>
          )}
        </Card>

        {/* Metrics Overview */}
        <Card className="bg-slate-800/50 border-slate-700">
          <CardHeader
            className="pb-2 cursor-pointer"
            onClick={() => toggleSection('metrics')}
          >
            <CardTitle className="text-sm flex items-center justify-between">
              <span className="flex items-center gap-2">
                <BarChart3 className="h-4 w-4" />
                View Metrics
              </span>
              {expandedSections.has('metrics') ? (
                <ChevronUp className="h-4 w-4" />
              ) : (
                <ChevronDown className="h-4 w-4" />
              )}
            </CardTitle>
          </CardHeader>
          {expandedSections.has('metrics') && (
            <CardContent className="pt-0">
              <div className="grid grid-cols-2 gap-3">
                <div className="bg-slate-900/50 rounded-lg p-3 text-center">
                  <Network className="h-5 w-5 mx-auto text-blue-400 mb-1" />
                  <div className="text-lg font-bold text-slate-200">
                    {explanation.metrics.visibleEntityCount}
                  </div>
                  <div className="text-xs text-slate-500">Entities</div>
                </div>
                <div className="bg-slate-900/50 rounded-lg p-3 text-center">
                  <Link2 className="h-5 w-5 mx-auto text-purple-400 mb-1" />
                  <div className="text-lg font-bold text-slate-200">
                    {explanation.metrics.visibleLinkCount}
                  </div>
                  <div className="text-xs text-slate-500">Links</div>
                </div>
                <div className="bg-slate-900/50 rounded-lg p-3 text-center">
                  <Clock className="h-5 w-5 mx-auto text-green-400 mb-1" />
                  <div className="text-lg font-bold text-slate-200">
                    {explanation.metrics.visibleEventCount}
                  </div>
                  <div className="text-xs text-slate-500">Events</div>
                </div>
                <div className="bg-slate-900/50 rounded-lg p-3 text-center">
                  <MapPin className="h-5 w-5 mx-auto text-orange-400 mb-1" />
                  <div className="text-lg font-bold text-slate-200">
                    {explanation.metrics.visibleLocationCount}
                  </div>
                  <div className="text-xs text-slate-500">Locations</div>
                </div>
              </div>
            </CardContent>
          )}
        </Card>

        {/* Top Entities */}
        <Card className="bg-slate-800/50 border-slate-700">
          <CardHeader
            className="pb-2 cursor-pointer"
            onClick={() => toggleSection('top-entities')}
          >
            <CardTitle className="text-sm flex items-center justify-between">
              <span className="flex items-center gap-2">
                <TrendingUp className="h-4 w-4" />
                Top Entities
              </span>
              {expandedSections.has('top-entities') ? (
                <ChevronUp className="h-4 w-4" />
              ) : (
                <ChevronDown className="h-4 w-4" />
              )}
            </CardTitle>
          </CardHeader>
          {expandedSections.has('top-entities') && (
            <CardContent className="pt-0 space-y-2">
              {explanation.metrics.topEntities.length === 0 ? (
                <p className="text-xs text-slate-500 italic">
                  No entities in current view
                </p>
              ) : (
                explanation.metrics.topEntities.map(({ entity, connectionCount }) => (
                  <div
                    key={entity.id}
                    className="flex items-center justify-between p-2 rounded-lg bg-slate-900/50 hover:bg-slate-900/70 transition-colors"
                  >
                    <div className="flex-1 min-w-0">
                      <div className="text-sm font-medium text-slate-200 truncate">
                        {entity.label}
                      </div>
                      <div className="flex items-center gap-2 mt-1">
                        <Badge variant="outline" className="text-xs">
                          {entity.type}
                        </Badge>
                        <span className="text-xs text-slate-500">
                          {connectionCount} connections
                        </span>
                      </div>
                    </div>
                    {entity.importanceScore && (
                      <div className="text-xs text-slate-400">
                        Score: {Math.round(entity.importanceScore * 100)}
                      </div>
                    )}
                  </div>
                ))
              )}
            </CardContent>
          )}
        </Card>

        {/* Entity Type Distribution */}
        <Card className="bg-slate-800/50 border-slate-700">
          <CardHeader
            className="pb-2 cursor-pointer"
            onClick={() => toggleSection('distribution')}
          >
            <CardTitle className="text-sm flex items-center justify-between">
              <span className="flex items-center gap-2">
                <Users className="h-4 w-4" />
                Entity Distribution
              </span>
              {expandedSections.has('distribution') ? (
                <ChevronUp className="h-4 w-4" />
              ) : (
                <ChevronDown className="h-4 w-4" />
              )}
            </CardTitle>
          </CardHeader>
          {expandedSections.has('distribution') && (
            <CardContent className="pt-0 space-y-2">
              {Object.entries(explanation.metrics.entityTypeDistribution)
                .sort((a, b) => b[1] - a[1])
                .map(([type, count]) => {
                  const percentage =
                    (count / explanation.metrics.visibleEntityCount) * 100
                  return (
                    <div key={type} className="space-y-1">
                      <div className="flex items-center justify-between text-xs">
                        <span className="text-slate-300">{type}</span>
                        <span className="text-slate-500">
                          {count} ({Math.round(percentage)}%)
                        </span>
                      </div>
                      <div className="w-full bg-slate-900 rounded-full h-1.5">
                        <div
                          className="bg-blue-500 h-1.5 rounded-full transition-all"
                          style={{ width: `${percentage}%` }}
                        />
                      </div>
                    </div>
                  )
                })}
            </CardContent>
          )}
        </Card>

        {/* Active Filters */}
        {(state.filters.entityTypes?.length ||
          state.filters.eventTypes?.length ||
          state.filters.minConfidence !== undefined) && (
          <Card className="bg-slate-800/50 border-slate-700">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm flex items-center gap-2">
                <Filter className="h-4 w-4" />
                Active Filters
              </CardTitle>
            </CardHeader>
            <CardContent className="pt-0 space-y-2">
              {state.filters.entityTypes?.length ? (
                <div>
                  <div className="text-xs text-slate-500 mb-1">Entity Types</div>
                  <div className="flex flex-wrap gap-1">
                    {state.filters.entityTypes.map(type => (
                      <Badge key={type} variant="secondary" className="text-xs">
                        {type}
                      </Badge>
                    ))}
                  </div>
                </div>
              ) : null}

              {state.filters.minConfidence !== undefined && (
                <div>
                  <div className="text-xs text-slate-500 mb-1">
                    Min Confidence
                  </div>
                  <Badge variant="secondary" className="text-xs">
                    ≥ {Math.round(state.filters.minConfidence * 100)}%
                  </Badge>
                </div>
              )}

              <Button
                variant="outline"
                size="sm"
                className="w-full mt-2 text-xs"
                onClick={resetFilters}
              >
                Clear All Filters
              </Button>
            </CardContent>
          </Card>
        )}

        {/* Selection State */}
        {(state.selection.selectedEntityIds.length > 0 ||
          state.selection.selectedEventIds.length > 0 ||
          state.selection.selectedLocationIds.length > 0) && (
          <Card className="bg-yellow-900/20 border-yellow-700/50">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm flex items-center gap-2 text-yellow-400">
                <TrendingUp className="h-4 w-4" />
                Current Selection
              </CardTitle>
            </CardHeader>
            <CardContent className="pt-0 space-y-2">
              {state.selection.selectedEntityIds.length > 0 && (
                <div className="text-xs text-slate-300">
                  {state.selection.selectedEntityIds.length} entities selected
                </div>
              )}
              {state.selection.selectedEventIds.length > 0 && (
                <div className="text-xs text-slate-300">
                  {state.selection.selectedEventIds.length} events selected
                </div>
              )}
              {state.selection.selectedLocationIds.length > 0 && (
                <div className="text-xs text-slate-300">
                  {state.selection.selectedLocationIds.length} locations selected
                </div>
              )}
              <Button
                variant="outline"
                size="sm"
                className="w-full mt-2 text-xs"
                onClick={resetSelection}
              >
                Clear Selection
              </Button>
            </CardContent>
          </Card>
        )}

        {/* Help text */}
        <div className="text-xs text-slate-500 italic p-3 bg-slate-800/30 rounded-lg">
          <div className="flex items-start gap-2">
            <Info className="h-4 w-4 mt-0.5 flex-shrink-0" />
            <p>
              This panel summarizes what you're currently seeing. Select entities
              in the graph, adjust the time brush in the timeline, or click
              locations on the map to update this summary.
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}

/**
 * Graph Pane Component
 *
 * Displays entity network visualization with selection wiring to the
 * global analyst view state. Clicking nodes updates selection across all panes.
 */

import React, { useMemo, useCallback } from 'react'
import { Network, ZoomIn, ZoomOut, Maximize2 } from 'lucide-react'
import { cn } from '@/lib/utils'
import { Badge } from '@/components/ui/Badge'
import { Button } from '@/components/ui/Button'
import { useAnalystView, useSelection, useGlobalTimeBrush } from './AnalystViewContext'
import type { GraphPaneProps, AnalystEntity, AnalystLink } from './types'

/**
 * GraphPane component with synchronized selection
 */
export function GraphPane({
  entities,
  links,
  events,
  className,
}: GraphPaneProps) {
  const { state } = useAnalystView()
  const { selection, selectEntity, isEntitySelected, resetSelection } = useSelection()
  const { timeWindow } = useGlobalTimeBrush()

  // Filter entities based on time window and filters
  const filteredEntities = useMemo(() => {
    let result = entities

    // Filter by entity types if specified
    if (state.filters.entityTypes && state.filters.entityTypes.length > 0) {
      result = result.filter(e => state.filters.entityTypes?.includes(e.type))
    }

    // Filter by confidence if specified
    if (state.filters.minConfidence !== undefined) {
      result = result.filter(
        e => (e.confidence ?? 1) >= (state.filters.minConfidence ?? 0)
      )
    }

    // Filter by time window - only include entities involved in events within the window
    const fromTime = new Date(timeWindow.from).getTime()
    const toTime = new Date(timeWindow.to).getTime()

    const entityIdsInTimeWindow = new Set(
      events
        .filter(event => {
          const eventTime = new Date(event.timestamp).getTime()
          return eventTime >= fromTime && eventTime <= toTime
        })
        .flatMap(event => event.entityIds)
    )

    // If we have events with entity IDs, filter to those entities
    // Otherwise, show all entities (no time-based filtering on entities without events)
    if (entityIdsInTimeWindow.size > 0) {
      result = result.filter(e => entityIdsInTimeWindow.has(e.id))
    }

    return result
  }, [entities, events, state.filters, timeWindow])

  // Filter links to only include those between visible entities
  const filteredLinks = useMemo(() => {
    const visibleEntityIds = new Set(filteredEntities.map(e => e.id))
    return links.filter(
      link =>
        visibleEntityIds.has(link.sourceId) && visibleEntityIds.has(link.targetId)
    )
  }, [links, filteredEntities])

  // Get selected and connected entity IDs for highlighting
  const highlightedEntityIds = useMemo(() => {
    const highlighted = new Set(selection.selectedEntityIds)

    // Add connected entities
    selection.selectedEntityIds.forEach(selectedId => {
      links.forEach(link => {
        if (link.sourceId === selectedId) {
          highlighted.add(link.targetId)
        }
        if (link.targetId === selectedId) {
          highlighted.add(link.sourceId)
        }
      })
    })

    return highlighted
  }, [selection.selectedEntityIds, links])

  // Handle node click
  const handleNodeClick = useCallback(
    (entity: AnalystEntity) => {
      selectEntity(entity.id)
    },
    [selectEntity]
  )

  // Calculate node positions (simple force-directed simulation placeholder)
  const nodePositions = useMemo(() => {
    const positions = new Map<string, { x: number; y: number }>()
    const width = 600
    const height = 400
    const centerX = width / 2
    const centerY = height / 2

    filteredEntities.forEach((entity, index) => {
      // Simple circular layout as placeholder
      const angle = (index / filteredEntities.length) * 2 * Math.PI
      const radius = Math.min(width, height) * 0.35
      positions.set(entity.id, {
        x: centerX + radius * Math.cos(angle),
        y: centerY + radius * Math.sin(angle),
      })
    })

    return positions
  }, [filteredEntities])

  // Get color for entity type
  const getEntityColor = (type: string, isSelected: boolean, isHighlighted: boolean) => {
    const colors: Record<string, string> = {
      Person: 'fill-blue-500',
      Org: 'fill-purple-500',
      Organization: 'fill-purple-500',
      Account: 'fill-green-500',
      Location: 'fill-orange-500',
      IP_ADDRESS: 'fill-red-500',
      DOMAIN: 'fill-cyan-500',
      default: 'fill-slate-500',
    }

    if (isSelected) return 'fill-yellow-400'
    if (isHighlighted) return 'fill-yellow-200'
    return colors[type] || colors.default
  }

  return (
    <div
      className={cn('relative w-full h-full overflow-hidden bg-slate-900', className)}
      role="region"
      aria-label="Entity graph visualization"
    >
      {/* SVG Graph Canvas */}
      <svg className="w-full h-full">
        <defs>
          {/* Arrow marker for directed edges */}
          <marker
            id="arrowhead"
            markerWidth="10"
            markerHeight="7"
            refX="9"
            refY="3.5"
            orient="auto"
          >
            <polygon
              points="0 0, 10 3.5, 0 7"
              className="fill-slate-400"
            />
          </marker>
        </defs>

        {/* Render links/edges */}
        <g className="edges">
          {filteredLinks.map(link => {
            const sourcePos = nodePositions.get(link.sourceId)
            const targetPos = nodePositions.get(link.targetId)
            if (!sourcePos || !targetPos) return null

            const isHighlighted =
              highlightedEntityIds.has(link.sourceId) &&
              highlightedEntityIds.has(link.targetId)

            return (
              <line
                key={link.id}
                x1={sourcePos.x}
                y1={sourcePos.y}
                x2={targetPos.x}
                y2={targetPos.y}
                className={cn(
                  'stroke-slate-600 transition-all duration-200',
                  isHighlighted && 'stroke-yellow-400 stroke-2'
                )}
                strokeWidth={isHighlighted ? 2 : 1}
                markerEnd="url(#arrowhead)"
              />
            )
          })}
        </g>

        {/* Render nodes */}
        <g className="nodes">
          {filteredEntities.map(entity => {
            const pos = nodePositions.get(entity.id)
            if (!pos) return null

            const isSelected = isEntitySelected(entity.id)
            const isHighlighted = highlightedEntityIds.has(entity.id)
            const nodeRadius = isSelected ? 20 : isHighlighted ? 16 : 12

            return (
              <g
                key={entity.id}
                transform={`translate(${pos.x}, ${pos.y})`}
                className="cursor-pointer"
                onClick={() => handleNodeClick(entity)}
                role="button"
                tabIndex={0}
                aria-label={`Entity: ${entity.label}, Type: ${entity.type}`}
                onKeyDown={e => {
                  if (e.key === 'Enter' || e.key === ' ') {
                    e.preventDefault()
                    handleNodeClick(entity)
                  }
                }}
              >
                {/* Selection ring */}
                {isSelected && (
                  <circle
                    r={nodeRadius + 4}
                    className="fill-none stroke-yellow-400 stroke-2"
                  />
                )}

                {/* Node circle */}
                <circle
                  r={nodeRadius}
                  className={cn(
                    'transition-all duration-200',
                    getEntityColor(entity.type, isSelected, isHighlighted),
                    'hover:opacity-80'
                  )}
                />

                {/* Node label */}
                <text
                  y={nodeRadius + 14}
                  textAnchor="middle"
                  className="fill-slate-300 text-xs pointer-events-none"
                >
                  {entity.label.length > 12
                    ? `${entity.label.slice(0, 12)}...`
                    : entity.label}
                </text>

                {/* Importance indicator */}
                {entity.importanceScore && entity.importanceScore > 0.8 && (
                  <circle
                    r={4}
                    cx={nodeRadius - 2}
                    cy={-nodeRadius + 2}
                    className="fill-red-500"
                  />
                )}
              </g>
            )
          })}
        </g>
      </svg>

      {/* Controls overlay */}
      <div className="absolute top-4 right-4 flex flex-col gap-2">
        <Button
          variant="secondary"
          size="icon"
          className="h-8 w-8 shadow-md"
          aria-label="Zoom in"
        >
          <ZoomIn className="h-4 w-4" />
        </Button>
        <Button
          variant="secondary"
          size="icon"
          className="h-8 w-8 shadow-md"
          aria-label="Zoom out"
        >
          <ZoomOut className="h-4 w-4" />
        </Button>
        <Button
          variant="secondary"
          size="icon"
          className="h-8 w-8 shadow-md"
          aria-label="Fit to view"
        >
          <Maximize2 className="h-4 w-4" />
        </Button>
      </div>

      {/* Stats overlay */}
      <div className="absolute bottom-4 left-4 bg-background/90 backdrop-blur-sm border rounded-lg shadow-lg p-3">
        <div className="flex items-center gap-2 text-xs text-muted-foreground">
          <Network className="h-4 w-4" />
          <span>
            {filteredEntities.length} nodes, {filteredLinks.length} edges
          </span>
        </div>
        {selection.selectedEntityIds.length > 0 && (
          <div className="mt-2 flex items-center gap-2">
            <Badge variant="secondary" className="text-xs">
              {selection.selectedEntityIds.length} selected
            </Badge>
            <Button
              variant="ghost"
              size="sm"
              className="h-6 text-xs"
              onClick={resetSelection}
            >
              Clear
            </Button>
          </div>
        )}
      </div>

      {/* Legend */}
      <div className="absolute top-4 left-4 bg-background/90 backdrop-blur-sm border rounded-lg shadow-lg p-3">
        <div className="text-xs font-semibold mb-2">Entity Types</div>
        <div className="space-y-1">
          {[
            { type: 'Person', color: 'bg-blue-500' },
            { type: 'Organization', color: 'bg-purple-500' },
            { type: 'Account', color: 'bg-green-500' },
            { type: 'Location', color: 'bg-orange-500' },
          ].map(({ type, color }) => (
            <div key={type} className="flex items-center gap-2 text-xs">
              <div className={cn('w-3 h-3 rounded-full', color)} />
              <span className="text-slate-400">{type}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Empty state */}
      {filteredEntities.length === 0 && (
        <div className="absolute inset-0 flex items-center justify-center">
          <div className="text-center space-y-2">
            <Network className="h-12 w-12 mx-auto text-muted-foreground opacity-50" />
            <p className="text-sm text-muted-foreground">
              No entities to display
            </p>
            <p className="text-xs text-muted-foreground">
              Adjust filters or time window to see data
            </p>
          </div>
        </div>
      )}
    </div>
  )
}

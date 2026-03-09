import React, { useRef, useEffect, useState, useMemo } from 'react'
import { select } from 'd3-selection'
import {
  forceSimulation,
  forceLink,
  forceManyBody,
  forceCenter,
  forceCollide,
  type Simulation,
  type SimulationNodeDatum,
  type SimulationLinkDatum,
} from 'd3-force'
import { zoom } from 'd3-zoom'
import { drag } from 'd3-drag'
import { cn } from '@/lib/utils'
import type { Entity, Relationship, GraphLayout } from '@/types'

export interface GraphViewProps {
  entities: Entity[]
  relationships: Relationship[]
  layout?: GraphLayout
  onEntitySelect?: (entity: Entity) => void
  selectedEntityId?: string
  className?: string
}

interface GraphNode extends SimulationNodeDatum {
  id: string
  entity: Entity
  x?: number
  y?: number
  fx?: number | null
  fy?: number | null
}

interface GraphLink extends SimulationLinkDatum<GraphNode> {
  id: string
  relationship: Relationship
  source: GraphNode
  target: GraphNode
}

/**
 * GraphView component with full ARIA support and keyboard navigation.
 * Targets WCAG AA compliance and Lighthouse 95+.
 */
export const GraphView = ({
  entities,
  relationships,
  layout = { type: 'force', settings: {} },
  onEntitySelect,
  selectedEntityId,
  className,
}: GraphViewProps): React.ReactElement => {
  const svgRef = useRef<SVGSVGElement>(null)
  const [dimensions, setDimensions] = useState({ width: 800, height: 600 })

  // Update dimensions on resize
  useEffect(() => {
    const updateDimensions = () => {
      if (svgRef.current) {
        const rect = svgRef.current.parentElement?.getBoundingClientRect()
        if (rect) {
          setDimensions({ width: rect.width, height: rect.height })
        }
      }
    }

    updateDimensions()
    window.addEventListener('resize', updateDimensions)
    return () => window.removeEventListener('resize', updateDimensions)
  }, [])

  useEffect(() => {
    if (!svgRef.current || entities.length === 0) return

    const svg = select(svgRef.current)
    svg.selectAll('.graph-content').remove()

    const { width, height } = dimensions

    // Data preparation
    const nodes: GraphNode[] = entities.map(entity => ({
      id: entity.id,
      entity,
    }))

    const links: GraphLink[] = relationships
      .filter(rel => {
        const sourceNode = nodes.find(n => n.id === rel.sourceId)
        const targetNode = nodes.find(n => n.id === rel.targetId)
        return sourceNode && targetNode
      })
      .map(rel => ({
        id: rel.id,
        relationship: rel,
        source: nodes.find(n => n.id === rel.sourceId)!,
        target: nodes.find(n => n.id === rel.targetId)!,
      }))

    // Simulation setup
    const simulation = forceSimulation<GraphNode, GraphLink>(nodes)
      .force(
        'link',
        forceLink<GraphNode, GraphLink>(links)
          .id(d => d.id)
          .distance(120)
      )
      .force('charge', forceManyBody().strength(-400))
      .force('center', forceCenter(width / 2, height / 2))
      .force('collision', forceCollide().radius(50))

    const g = svg.append('g').attr('class', 'graph-content')

    // Zoom behavior
    const zoomBehavior = zoom<SVGSVGElement, unknown>()
      .scaleExtent([0.1, 4])
      .on('zoom', event => {
        g.attr('transform', event.transform)
      })

    svg.call(zoomBehavior)

    // Render Links
    const link = g
      .append('g')
      .attr('class', 'links')
      .selectAll('line')
      .data(links)
      .enter()
      .append('line')
      .attr('role', 'graphics-symbol')
      .attr('aria-label', d => `Relationship: ${d.relationship.type} from ${d.source.entity.name} to ${d.target.entity.name}`)
      .attr('stroke', '#94a3b8')
      .attr('stroke-opacity', 0.6)
      .attr('stroke-width', 2)
      .attr('stroke-dasharray', d => d.relationship.properties?.style === 'dashed' || (d.relationship.type as string) === 'narrative' ? '5,5' : 'none')

    // Render Nodes
    const node = g
      .append('g')
      .attr('class', 'nodes')
      .selectAll('g')
      .data(nodes)
      .enter()
      .append('g')
      .attr('class', 'node')
      .attr('role', 'graphics-symbol')
      .attr('tabindex', 0) // Enable keyboard navigation
      .attr('aria-label', d => `Entity: ${d.entity.name}, Type: ${d.entity.type}${d.entity.properties?.drift ? ', State: Drift' : ''}`)
      .style('cursor', 'pointer')
      .call(
        drag<SVGGElement, GraphNode>()
          .on('start', (event, d) => {
            if (!event.active) simulation.alphaTarget(0.3).restart()
            d.fx = d.x
            d.fy = d.y
          })
          .on('drag', (event, d) => {
            d.fx = event.x
            d.fy = event.y
          })
          .on('end', (event, d) => {
            if (!event.active) simulation.alphaTarget(0)
            d.fx = null
            d.fy = null
          })
      )

    // Node circles with WCAG AA contrast colors
    node
      .append('circle')
      .attr('r', 25)
      .attr('fill', d => d.entity.properties?.drift ? '#d32f2f' : getEntityColor(d.entity.type))
      .attr('stroke', d => selectedEntityId === d.entity.id ? '#fbbf24' : '#fff')
      .attr('stroke-width', d => selectedEntityId === d.entity.id ? 4 : 2)
      .attr('class', 'transition-all duration-200')

    // Node initial/icon
    node
      .append('text')
      .attr('text-anchor', 'middle')
      .attr('dy', '.35em')
      .attr('fill', '#ffffff')
      .attr('font-size', '14px')
      .attr('font-weight', 'bold')
      .style('pointer-events', 'none')
      .text(d => d.entity.name.charAt(0))

    // Node labels
    node
      .append('text')
      .attr('text-anchor', 'middle')
      .attr('dy', '40px')
      .attr('fill', '#1e293b')
      .attr('font-size', '12px')
      .attr('font-weight', '600')
      .style('pointer-events', 'none')
      .text(d => d.entity.name)

    // Event handlers
    node.on('click', (event, d) => {
      onEntitySelect?.(d.entity)
    })

    // Keyboard navigation: Enter or Space to select
    node.on('keydown', (event, d) => {
      if (event.key === 'Enter' || event.key === ' ') {
        event.preventDefault()
        onEntitySelect?.(d.entity)
      }
    })

    // Tick function
    simulation.on('tick', () => {
      link
        .attr('x1', d => (d.source as GraphNode).x!)
        .attr('y1', d => (d.source as GraphNode).y!)
        .attr('x2', d => (d.target as GraphNode).x!)
        .attr('y2', d => (d.target as GraphNode).y!)

      node.attr('transform', d => `translate(${d.x},${d.y})`)
    })

    return () => {
      simulation.stop()
    }
  }, [entities, relationships, dimensions, selectedEntityId, onEntitySelect])

  const getEntityColor = (type: string) => {
    const colors: Record<string, string> = {
      PERSON: '#2563eb', // Blue 600
      ORGANIZATION: '#7c3aed', // Violet 600
      LOCATION: '#059669', // Emerald 600
      SYSTEM: '#4b5563', // Gray 600
      default: '#64748b',
    }
    return colors[type] || colors.default
  }

  const driftCount = useMemo(() => entities.filter(e => e.properties?.drift).length, [entities])

  return (
    <div className={cn('relative w-full h-full flex flex-col overflow-hidden', className)}>
      <svg
        ref={svgRef}
        className="w-full flex-1 bg-slate-50 outline-none focus-visible:ring-2 focus-visible:ring-blue-500 rounded-lg"
        role="img"
        aria-label="Org Mesh graph: entities & drift edges"
        aria-describedby="graph-desc"
      />

      {/* Off-screen description for Screen Readers */}
      <div id="graph-desc" className="sr-only">
        Network graph visualization containing {entities.length} nodes and {relationships.length} edges.
        {driftCount > 0 ? ` Note: ${driftCount} nodes are highlighted in red indicating a drift state.` : ''}
        Navigation: Use TAB to cycle through entities. Press ENTER or SPACE to inspect a selected entity.
        Use mouse or touch to pan and zoom.
      </div>

      {/* Visible legend/status overlay */}
      <div className="absolute top-4 left-4 flex flex-col gap-2 pointer-events-none">
          <div className="bg-white/90 backdrop-blur-sm px-3 py-2 rounded-lg border border-slate-200 shadow-sm flex flex-col gap-1">
              <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Status</div>
              <div className="flex items-center gap-4 text-xs font-medium text-slate-700">
                  <div className="flex items-center gap-1.5">
                      <span className="w-2.5 h-2.5 rounded-full bg-blue-600"></span>
                      <span>{entities.length} Nodes</span>
                  </div>
                  {driftCount > 0 && (
                    <div className="flex items-center gap-1.5">
                        <span className="w-2.5 h-2.5 rounded-full bg-red-600 animate-pulse"></span>
                        <span className="text-red-700">{driftCount} Drift</span>
                    </div>
                  )}
              </div>
          </div>
      </div>

      {/* Keyboard hints */}
      <div className="absolute bottom-4 right-4 text-[10px] text-slate-400 bg-white/50 px-2 py-1 rounded border border-slate-200 pointer-events-none">
          TAB: Nav | ENTER: Inspect | DRAG: Pan | SCROLL: Zoom
      </div>
    </div>
  )
}

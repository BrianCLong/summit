import React, { useRef, useEffect, useState, useMemo } from 'react'
// Tree-shaken D3 imports for better bundle size
import { select, type Selection, type BaseType } from 'd3-selection'
import {
  forceSimulation,
  forceLink,
  forceManyBody,
  forceCenter,
  forceCollide,
  forceRadial,
  forceY,
  forceX,
  type Simulation,
  type SimulationNodeDatum,
  type SimulationLinkDatum,
} from 'd3-force'
import { zoom } from 'd3-zoom'
import { drag } from 'd3-drag'
import { cn } from '@/lib/utils'
import type { Entity, Relationship, GraphLayout } from '@/types'
import { CanvasGraphRenderer } from './CanvasGraphRenderer'

interface GraphCanvasProps {
  entities: Entity[]
  relationships: Relationship[]
  layout: GraphLayout
  onEntitySelect?: (entity: Entity) => void
  selectedEntityId?: string
  width?: number
  height?: number
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

// Entity type to color mapping
const ENTITY_COLORS: Record<string, string> = {
  PERSON: '#3b82f6',
  ORGANIZATION: '#8b5cf6',
  LOCATION: '#10b981',
  IP_ADDRESS: '#f59e0b',
  DOMAIN: '#06b6d4',
  EMAIL: '#ec4899',
  FILE: '#ef4444',
  PROJECT: '#84cc16',
  SYSTEM: '#6b7280',
}
const DEFAULT_COLOR = '#6b7280'

// Entity type to icon mapping
const ENTITY_ICONS: Record<string, string> = {
  PERSON: '👤',
  ORGANIZATION: '🏢',
  LOCATION: '📍',
  IP_ADDRESS: '🌐',
  DOMAIN: '🔗',
  EMAIL: '📧',
  FILE: '📄',
  PROJECT: '📊',
  SYSTEM: '⚙️',
}
const DEFAULT_ICON = '📊'

function SVGGraphRenderer({
  entities,
  relationships,
  layout,
  onEntitySelect,
  selectedEntityId,
  className,
}: GraphCanvasProps) {
  const svgRef = useRef<SVGSVGElement>(null)
  const nodeSelectionRef = useRef<Selection<SVGGElement, GraphNode, BaseType, unknown> | null>(null)
  const linkSelectionRef = useRef<Selection<SVGLineElement, GraphLink, BaseType, unknown> | null>(null)
  // Store callback in ref to avoid stale closures in event handlers
  const onEntitySelectRef = useRef(onEntitySelect)

  const [dimensions, setDimensions] = useState({ width: 800, height: 600 })
  const [fps, setFps] = useState(0)
  const [debugMode, setDebugMode] = useState(false)
  const frameCountRef = useRef(0)
  const lastTimeRef = useRef(0)

  // Update callback ref
  useEffect(() => {
    onEntitySelectRef.current = onEntitySelect
  }, [onEntitySelect])

  // Calculate FPS
  useEffect(() => {
    if (!debugMode) return

    lastTimeRef.current = performance.now()
    let animationFrameId: number

    const renderLoop = (time: number) => {
      frameCountRef.current++
      if (time - lastTimeRef.current >= 1000) {
        setFps(
          Math.round((frameCountRef.current * 1000) / (time - lastTimeRef.current))
        )
        frameCountRef.current = 0
        lastTimeRef.current = time
      }
      animationFrameId = requestAnimationFrame(renderLoop)
    }

    animationFrameId = requestAnimationFrame(renderLoop)
    return () => cancelAnimationFrame(animationFrameId)
  }, [debugMode])

  // Update dimensions on resize
  useEffect(() => {
    const updateDimensions = () => {
      if (svgRef.current) {
        const rect = svgRef.current.getBoundingClientRect()
        setDimensions({ width: rect.width, height: rect.height })
      }
    }

    updateDimensions()
    window.addEventListener('resize', updateDimensions)
    return () => window.removeEventListener('resize', updateDimensions)
  }, [])

  // Memoize nodes and links creation
  const { nodes, links } = useMemo(() => {
    const nodesData: GraphNode[] = entities.map(entity => ({
      id: entity.id,
      entity,
    }))

    const linksData: GraphLink[] = relationships
      .filter(rel => {
        const sourceNode = nodesData.find(n => n.id === rel.sourceId)
        const targetNode = nodesData.find(n => n.id === rel.targetId)
        return sourceNode && targetNode
      })
      .map(rel => ({
        id: rel.id,
        relationship: rel,
        source: nodesData.find(n => n.id === rel.sourceId)!,
        target: nodesData.find(n => n.id === rel.targetId)!,
      }))

    return { nodes: nodesData, links: linksData }
  }, [entities, relationships])

  // Simulation setup effect
  useEffect(() => {
    if (!svgRef.current || nodes.length === 0) {
        nodeSelectionRef.current = null
        linkSelectionRef.current = null
        return
    }

    const svg = select(svgRef.current)
    svg.selectAll('*').remove()

    const { width, height } = dimensions

    // Create simulation based on layout type
    let simulation: Simulation<GraphNode, GraphLink>

    switch (layout.type) {
      case 'force':
        simulation = forceSimulation(nodes)
          .force(
            'link',
            forceLink<GraphNode, GraphLink>(links)
              .id(d => d.id)
              .distance(100)
          )
          .force('charge', forceManyBody().strength(-300))
          .force('center', forceCenter(width / 2, height / 2))
          .force('collision', forceCollide().radius(30))
        break

      case 'radial':
        simulation = forceSimulation(nodes)
          .force(
            'link',
            forceLink<GraphNode, GraphLink>(links)
              .id(d => d.id)
              .distance(80)
          )
          .force('charge', forceManyBody().strength(-200))
          .force('radial', forceRadial(150, width / 2, height / 2))
        break

      case 'hierarchic':
        // Simple hierarchical layout - in a real app you'd use dagre or similar
        simulation = forceSimulation(nodes)
          .force(
            'link',
            forceLink<GraphNode, GraphLink>(links)
              .id(d => d.id)
              .distance(60)
          )
          .force('charge', forceManyBody().strength(-100))
          .force(
            'y',
            forceY<GraphNode>().y(d => (d.index || 0) * 80 + 100)
          )
          .force('x', forceX(width / 2))
        break

      default:
        simulation = forceSimulation(nodes)
          .force(
            'link',
            forceLink<GraphNode, GraphLink>(links).id(d => d.id)
          )
          .force('charge', forceManyBody())
          .force('center', forceCenter(width / 2, height / 2))
    }

    // Create container groups
    const container = svg.append('g')
    const linksGroup = container.append('g').attr('class', 'links')
    const nodesGroup = container.append('g').attr('class', 'nodes')

    // Add zoom behavior
    const zoomBehavior = zoom<SVGSVGElement, unknown>()
      .scaleExtent([0.1, 4])
      .on('zoom', event => {
        container.attr('transform', event.transform)
      })

    svg.call(zoomBehavior)

    // Draw links
    const link = linksGroup
      .selectAll<SVGLineElement, GraphLink>('line')
      .data(links)
      .enter()
      .append('line')
      .attr('class', 'link')
      .attr('stroke', '#999')
      .attr('stroke-opacity', 0.6)
      .attr('stroke-width', d => Math.sqrt(d.relationship.confidence * 3))

    linkSelectionRef.current = link

    // Draw link labels
    const linkLabel = linksGroup
      .selectAll<SVGTextElement, GraphLink>('text')
      .data(links)
      .enter()
      .append('text')
      .attr('class', 'link-label')
      .attr('font-size', '10px')
      .attr('fill', '#666')
      .attr('text-anchor', 'middle')
      .text(d => d.relationship.type.replace('_', ' ').toLowerCase())

    // Draw nodes
    const node = nodesGroup
      .selectAll<SVGGElement, GraphNode>('g')
      .data(nodes)
      .enter()
      .append('g')
      .attr('class', 'node')
      .style('cursor', 'pointer')
      .call(
        drag<SVGGElement, GraphNode>()
          .on('start', (event, d) => {
            if (!event.active) {simulation.alphaTarget(0.3).restart()}
            d.fx = d.x
            d.fy = d.y
          })
          .on('drag', (event, d) => {
            d.fx = event.x
            d.fy = event.y
          })
          .on('end', (event, d) => {
            if (!event.active) {simulation.alphaTarget(0)}
            d.fx = null
            d.fy = null
          })
      )

    nodeSelectionRef.current = node

    // Node circles
    node
      .append('circle')
      .attr('r', d => 15 + d.entity.confidence * 10)
      .attr('fill', d => ENTITY_COLORS[d.entity.type] || DEFAULT_COLOR)
      // Note: Stroke and filter are now handled in the styling effect

    // Node icons (using text for simplicity)
    node
      .append('text')
      .attr('text-anchor', 'middle')
      .attr('dy', '.35em')
      .attr('font-size', '12px')
      .text(d => ENTITY_ICONS[d.entity.type] || DEFAULT_ICON)

    // Node labels
    node
      .append('text')
      .attr('text-anchor', 'middle')
      .attr('dy', '25px')
      .attr('font-size', '11px')
      .attr('font-weight', 'bold')
      .attr('fill', '#333')
      .style('pointer-events', 'none')
      .text(d =>
        d.entity.name.length > 15
          ? `${d.entity.name.slice(0, 15)  }...`
          : d.entity.name
      )

    // Confidence indicator
    node
      .append('text')
      .attr('text-anchor', 'middle')
      .attr('dy', '37px')
      .attr('font-size', '9px')
      .attr('fill', '#666')
      .style('pointer-events', 'none')
      .text(d => `${Math.round(d.entity.confidence * 100)}%`)

    // Click handler for nodes
    node.on('click', (event, d) => {
      event.stopPropagation()
      onEntitySelectRef.current?.(d.entity)
    })

    // Hover effects
    node.on('mouseenter', (event, d) => {
      select(event.currentTarget as SVGGElement)
        .select('circle')
        .transition()
        .duration(200)
        .attr('r', 20 + d.entity.confidence * 10)

      // Highlight connected links
      link.style('stroke-opacity', l =>
        l.source === d || l.target === d ? 1 : 0.2
      )
    })

    node.on('mouseleave', (event, d) => {
      select(event.currentTarget as SVGGElement)
        .select('circle')
        .transition()
        .duration(200)
        .attr('r', 15 + d.entity.confidence * 10)

      // Reset link opacity
      link.style('stroke-opacity', 0.6)
    })

    // Update positions on simulation tick
    simulation.on('tick', () => {
      link
        .attr('x1', d => (d.source as GraphNode).x!)
        .attr('y1', d => (d.source as GraphNode).y!)
        .attr('x2', d => (d.target as GraphNode).x!)
        .attr('y2', d => (d.target as GraphNode).y!)

      linkLabel
        .attr(
          'x',
          d => ((d.source as GraphNode).x! + (d.target as GraphNode).x!) / 2
        )
        .attr(
          'y',
          d => ((d.source as GraphNode).y! + (d.target as GraphNode).y!) / 2
        )

      node.attr('transform', d => `translate(${d.x},${d.y})`)
    })

    // Cleanup
    return () => {
      simulation.stop()
    }
  }, [
    nodes,
    links,
    layout,
    dimensions,
  ])

  // Styling effect - runs when selection changes without restarting simulation
  useEffect(() => {
    if (!nodeSelectionRef.current) return

    nodeSelectionRef.current.select('circle')
      .attr('stroke', d =>
        selectedEntityId === d.entity.id ? '#fbbf24' : '#fff'
      )
      .attr('stroke-width', d => (selectedEntityId === d.entity.id ? 3 : 2))
      .style('filter', d =>
        selectedEntityId === d.entity.id
          ? 'drop-shadow(0 0 8px rgba(251, 191, 36, 0.6))'
          : 'none'
      )
  }, [selectedEntityId, nodes])

  return (
    <div className={cn('relative w-full h-full', className)}>
      <svg
        ref={svgRef}
        className="w-full h-full bg-gradient-to-br from-slate-50 to-slate-100 dark:from-slate-900 dark:to-slate-800"
        style={{
          background:
            'radial-gradient(circle at 50% 50%, rgba(6, 182, 212, 0.05) 0%, transparent 50%)',
        }}
      />

      {/* Graph controls overlay */}
      <div className="absolute top-4 right-4 flex flex-col gap-2">
        <div className="bg-background/90 backdrop-blur-sm border rounded-lg p-2 shadow-sm">
          <div className="flex justify-between items-center mb-1 gap-2">
            <div className="text-xs font-medium text-muted-foreground">
              Graph Info
            </div>
            <button
              onClick={() => setDebugMode(!debugMode)}
              className="text-[10px] px-1.5 py-0.5 rounded border hover:bg-muted transition-colors"
            >
              {debugMode ? 'Debug: ON' : 'Debug'}
            </button>
          </div>
          <div className="text-xs space-y-1">
            <div>Entities: {entities.length}</div>
            <div>Relationships: {relationships.length}</div>
            <div>Layout: {layout.type}</div>
            {debugMode && (
              <>
                <div className="border-t my-1 pt-1 border-muted" />
                <div className="font-mono text-[10px]">FPS: {fps}</div>
                <div className="font-mono text-[10px]">
                  Density:{' '}
                  {entities.length > 1
                    ? (
                        (2 * relationships.length) /
                        (entities.length * (entities.length - 1))
                      ).toFixed(4)
                    : '0.0000'}
                </div>
              </>
            )}
          </div>
        </div>
      </div>

      {/* Legend */}
      <div className="absolute bottom-4 left-4 bg-background/90 backdrop-blur-sm border rounded-lg p-3 shadow-sm">
        <div className="text-xs font-medium text-muted-foreground mb-2">
          Entity Types
        </div>
        <div className="grid grid-cols-2 gap-2 text-xs">
          {Array.from(new Set(entities.map(e => e.type))).map(type => (
            <div key={type} className="flex items-center gap-2">
              <div
                className="w-3 h-3 rounded-full border"
                style={{
                  backgroundColor: ENTITY_COLORS[type] || DEFAULT_COLOR,
                }}
              />
              <span>{type.replace('_', ' ')}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}

export function GraphCanvas(props: GraphCanvasProps) {
  const { entities } = props

  // Use canvas renderer for large graphs
  const PERFORMANCE_THRESHOLD = 500
  if (entities.length > PERFORMANCE_THRESHOLD) {
    return (
      <CanvasGraphRenderer
        {...props}
      />
    )
  }

  return <SVGGraphRenderer {...props} />
}

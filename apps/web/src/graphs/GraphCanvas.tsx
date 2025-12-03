import React, { useRef, useEffect, useState, useMemo } from 'react'
import * as d3 from 'd3'
import { cn } from '@/lib/utils'
import type { Entity, Relationship, GraphLayout } from '@/types'
import { AlertTriangle, Zap, Activity, Eye } from 'lucide-react'

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

interface GraphNode extends d3.SimulationNodeDatum {
  id: string
  entity: Entity
  x?: number
  y?: number
  fx?: number | null
  fy?: number | null
}

interface GraphLink extends d3.SimulationLinkDatum<GraphNode> {
  id: string
  relationship: Relationship
  source: GraphNode
  target: GraphNode
}

type RenderQuality = 'high' | 'medium' | 'low' | 'critical'

const getRenderQuality = (nodeCount: number): RenderQuality => {
  if (nodeCount > 2000) return 'critical'
  if (nodeCount > 500) return 'low'
  if (nodeCount > 100) return 'medium'
  return 'high'
}

export function GraphCanvas({
  entities: rawEntities,
  relationships: rawRelationships,
  layout,
  onEntitySelect,
  selectedEntityId,
  className,
}: GraphCanvasProps) {
  const svgRef = useRef<SVGSVGElement>(null)
  const [dimensions, setDimensions] = useState({ width: 800, height: 600 })

  // Determine rendering quality based on raw dataset size
  const quality = useMemo(() => getRenderQuality(rawEntities.length), [rawEntities.length])

  // Process data based on quality (sampling for critical size)
  const { entities, relationships } = useMemo(() => {
    if (quality === 'critical') {
      // Sample top 1500 entities by confidence
      const sortedEntities = [...rawEntities]
        .sort((a, b) => b.confidence - a.confidence)
        .slice(0, 1500)

      const entityIds = new Set(sortedEntities.map(e => e.id))
      const relevantRelationships = rawRelationships.filter(
        r => entityIds.has(r.sourceId) && entityIds.has(r.targetId)
      )

      return { entities: sortedEntities, relationships: relevantRelationships }
    }
    return { entities: rawEntities, relationships: rawRelationships }
  }, [rawEntities, rawRelationships, quality])

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

  useEffect(() => {
    if (!svgRef.current || entities.length === 0) return

    const svg = d3.select(svgRef.current)
    svg.selectAll('*').remove()

    const { width, height } = dimensions

    // Create nodes and links
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

    // Create simulation based on layout type and quality
    let simulation: d3.Simulation<GraphNode, GraphLink>

    // Adjust physics parameters based on quality
    const alphaDecay = quality === 'high' ? 0.0228 : (quality === 'medium' ? 0.05 : 0.1) // Stabilize faster for large graphs
    const chargeStrength = quality === 'high' ? -300 : (quality === 'medium' ? -200 : -100)
    const collisionRadius = quality === 'high' ? 30 : 15

    switch (layout.type) {
      case 'force':
        simulation = d3
          .forceSimulation(nodes)
          .alphaDecay(alphaDecay)
          .force(
            'link',
            d3
              .forceLink<GraphNode, GraphLink>(links)
              .id(d => d.id)
              .distance(quality === 'high' ? 100 : 60)
          )
          .force('charge', d3.forceManyBody().strength(chargeStrength))
          .force('center', d3.forceCenter(width / 2, height / 2))

        // Disable expensive collision detection for low/critical quality
        if (quality === 'high' || quality === 'medium') {
          simulation.force('collision', d3.forceCollide().radius(collisionRadius))
        }
        break

      case 'radial':
        simulation = d3
          .forceSimulation(nodes)
          .alphaDecay(alphaDecay)
          .force(
            'link',
            d3
              .forceLink<GraphNode, GraphLink>(links)
              .id(d => d.id)
              .distance(80)
          )
          .force('charge', d3.forceManyBody().strength(chargeStrength))
          .force('radial', d3.forceRadial(Math.min(width, height) / 3, width / 2, height / 2))
        break

      case 'hierarchic':
        simulation = d3
          .forceSimulation(nodes)
          .alphaDecay(alphaDecay)
          .force(
            'link',
            d3
              .forceLink<GraphNode, GraphLink>(links)
              .id(d => d.id)
              .distance(60)
          )
          .force('charge', d3.forceManyBody().strength(-100))
          .force(
            'y',
            d3.forceY().y(d => (d.index || 0) * 80 + 100)
          )
          .force('x', d3.forceX(width / 2))
        break

      default:
        simulation = d3
          .forceSimulation(nodes)
          .alphaDecay(alphaDecay)
          .force(
            'link',
            d3.forceLink<GraphNode, GraphLink>(links).id(d => d.id)
          )
          .force('charge', d3.forceManyBody())
          .force('center', d3.forceCenter(width / 2, height / 2))
    }

    // Create container groups
    const container = svg.append('g')
    const linksGroup = container.append('g').attr('class', 'links')
    const nodesGroup = container.append('g').attr('class', 'nodes')

    // Add zoom behavior
    const zoom = d3
      .zoom<SVGSVGElement, unknown>()
      .scaleExtent([0.1, 4])
      .on('zoom', event => {
        container.attr('transform', event.transform)

        // Semantic Zoom: Show/hide labels based on zoom level for medium/low quality
        if (quality !== 'high') {
          const k = event.transform.k
          svg.selectAll('.node-label').style('opacity', k > 1.5 ? 1 : 0)
          svg.selectAll('.link-label').style('opacity', k > 2.0 ? 1 : 0)
        }
      })

    svg.call(zoom)

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

    // Draw link labels (only for high quality or zoomed in)
    let linkLabel: d3.Selection<SVGTextElement, GraphLink, SVGGElement, unknown> | null = null

    if (quality === 'high' || quality === 'medium') {
      linkLabel = linksGroup
        .selectAll<SVGTextElement, GraphLink>('text')
        .data(links)
        .enter()
        .append('text')
        .attr('class', 'link-label')
        .attr('font-size', '10px')
        .attr('fill', '#666')
        .attr('text-anchor', 'middle')
        .style('opacity', quality === 'high' ? 1 : 0) // Hidden by default on medium
        .text(d => d.relationship.type.replace('_', ' ').toLowerCase())
    }

    // Entity type to color mapping
    const getEntityColor = (type: string) => {
      const colors: Record<string, string> = {
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
      return colors[type] || '#6b7280'
    }

    // Entity type to icon mapping
    const getEntityIcon = (type: string) => {
      const icons: Record<string, string> = {
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
      return icons[type] || '📊'
    }

    // Draw nodes
    const node = nodesGroup
      .selectAll<SVGGElement, GraphNode>('g')
      .data(nodes)
      .enter()
      .append('g')
      .attr('class', 'node')
      .style('cursor', 'pointer')
      .call(
        d3
          .drag<SVGGElement, GraphNode>()
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

    // Node circles
    node
      .append('circle')
      .attr('r', d => quality === 'high' ? 15 + d.entity.confidence * 10 : 10)
      .attr('fill', d => getEntityColor(d.entity.type))
      .attr('stroke', d =>
        selectedEntityId === d.entity.id ? '#fbbf24' : '#fff'
      )
      .attr('stroke-width', d => (selectedEntityId === d.entity.id ? 3 : 2))
      .style('filter', d =>
        selectedEntityId === d.entity.id
          ? 'drop-shadow(0 0 8px rgba(251, 191, 36, 0.6))'
          : 'none'
      )

    // Node icons (only for high/medium quality)
    if (quality !== 'low' && quality !== 'critical') {
      node
        .append('text')
        .attr('text-anchor', 'middle')
        .attr('dy', '.35em')
        .attr('font-size', '12px')
        .text(d => getEntityIcon(d.entity.type))
    }

    // Node labels
    const labelText = node
      .append('text')
      .attr('class', 'node-label')
      .attr('text-anchor', 'middle')
      .attr('dy', quality === 'high' ? '25px' : '20px')
      .attr('font-size', '11px')
      .attr('font-weight', 'bold')
      .attr('fill', '#333')
      .style('pointer-events', 'none')
      .style('opacity', quality === 'high' ? 1 : 0) // Hidden by default on medium/low
      .text(d =>
        d.entity.name.length > 15
          ? d.entity.name.slice(0, 15) + '...'
          : d.entity.name
      )

    // Confidence indicator (only high quality)
    if (quality === 'high') {
      node
        .append('text')
        .attr('text-anchor', 'middle')
        .attr('dy', '37px')
        .attr('font-size', '9px')
        .attr('fill', '#666')
        .style('pointer-events', 'none')
        .text(d => `${Math.round(d.entity.confidence * 100)}%`)
    }

    // Click handler for nodes
    node.on('click', (event, d) => {
      event.stopPropagation()
      onEntitySelect?.(d.entity)
    })

    // Hover effects
    node.on('mouseenter', function (event, d) {
      d3.select(this)
        .select('circle')
        .transition()
        .duration(200)
        .attr('r', 20 + d.entity.confidence * 10)

      // Show label on hover regardless of quality
      d3.select(this).select('.node-label').style('opacity', 1)

      // Highlight connected links
      link.style('stroke-opacity', l =>
        l.source === d || l.target === d ? 1 : 0.2
      )
    })

    node.on('mouseleave', function (event, d) {
      d3.select(this)
        .select('circle')
        .transition()
        .duration(200)
        .attr('r', quality === 'high' ? 15 + d.entity.confidence * 10 : 10)

      // Hide label on leave if not high quality (it will revert to zoom-based opacity)
      // d3.select(this).select('.node-label').style('opacity', quality === 'high' ? 1 : 0)

      // Reset link opacity
      link.style('stroke-opacity', 0.6)
    })

    // Update positions on simulation tick
    // Throttle updates for low quality to improve performance
    let tickCount = 0
    simulation.on('tick', () => {
      tickCount++
      if ((quality === 'low' || quality === 'critical') && tickCount % 2 !== 0) return

      link
        .attr('x1', d => (d.source as GraphNode).x!)
        .attr('y1', d => (d.source as GraphNode).y!)
        .attr('x2', d => (d.target as GraphNode).x!)
        .attr('y2', d => (d.target as GraphNode).y!)

      if (linkLabel) {
        linkLabel
          .attr(
            'x',
            d => ((d.source as GraphNode).x! + (d.target as GraphNode).x!) / 2
          )
          .attr(
            'y',
            d => ((d.source as GraphNode).y! + (d.target as GraphNode).y!) / 2
          )
      }

      node.attr('transform', d => `translate(${d.x},${d.y})`)
    })

    // Cleanup
    return () => {
      simulation.stop()
    }
  }, [
    entities,
    relationships,
    layout,
    dimensions,
    selectedEntityId,
    onEntitySelect,
    quality
  ])

  // Performance Badge Component
  const PerformanceBadge = () => {
    const config = {
      high: { color: 'text-green-600', bg: 'bg-green-100', text: 'Full Detail', icon: Eye },
      medium: { color: 'text-blue-600', bg: 'bg-blue-100', text: 'Balanced', icon: Activity },
      low: { color: 'text-orange-600', bg: 'bg-orange-100', text: 'Performance', icon: Zap },
      critical: { color: 'text-red-600', bg: 'bg-red-100', text: 'Sampled View', icon: AlertTriangle },
    }[quality]

    const Icon = config.icon

    return (
      <div className={`flex items-center gap-1.5 px-2 py-1 rounded-full text-xs font-medium border ${config.bg} ${config.color} border-current/20`}>
        <Icon className="w-3 h-3" />
        <span>{config.text}</span>
      </div>
    )
  }

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
      <div className="absolute top-4 right-4 flex flex-col gap-2 pointer-events-none">
        <div className="bg-background/90 backdrop-blur-sm border rounded-lg p-2 shadow-sm pointer-events-auto">
          <div className="flex items-center justify-between gap-4 mb-2">
            <div className="text-xs font-medium text-muted-foreground">
              Graph Info
            </div>
            <PerformanceBadge />
          </div>
          <div className="text-xs space-y-1">
            <div className="flex justify-between gap-4">
              <span className="text-muted-foreground">Nodes:</span>
              <span className="font-mono">{entities.length}</span>
            </div>
            <div className="flex justify-between gap-4">
              <span className="text-muted-foreground">Edges:</span>
              <span className="font-mono">{relationships.length}</span>
            </div>
            {quality === 'critical' && (
              <div className="text-[10px] text-red-500 pt-1 border-t mt-1">
                Displaying top 1500 entities by confidence
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Legend */}
      <div className="absolute bottom-4 left-4 bg-background/90 backdrop-blur-sm border rounded-lg p-3 shadow-sm pointer-events-auto">
        <div className="text-xs font-medium text-muted-foreground mb-2">
          Entity Types
        </div>
        <div className="grid grid-cols-2 gap-2 text-xs">
          {Array.from(new Set(entities.map(e => e.type))).map(type => (
            <div key={type} className="flex items-center gap-2">
              <div
                className="w-3 h-3 rounded-full border"
                style={{
                  backgroundColor: (() => {
                    const colors: Record<string, string> = {
                      PERSON: '#3b82f6',
                      ORGANIZATION: '#8b5cf6',
                      LOCATION: '#10b981',
                      IP_ADDRESS: '#f59e0b',
                      DOMAIN: '#06b6d4',
                      EMAIL: '#ec4899',
                      FILE: '#ef4444',
                      PROJECT: '#84cc16',
                      SYSTEM: '#6b7280',
                      // Default
                    }
                    return colors[type] || '#6b7280'
                  })(),
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

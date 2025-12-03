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

  // Refs for simulation state persistence
  const simulationRef = useRef<d3.Simulation<GraphNode, GraphLink> | null>(null)
  const nodesMapRef = useRef<Map<string, GraphNode>>(new Map())
  const linksMapRef = useRef<Map<string, GraphLink>>(new Map())
  const qualityRef = useRef<RenderQuality>('high') // To access current quality in closures

  // Refs for D3 selections
  const groupsRef = useRef<{
    svg: d3.Selection<SVGSVGElement, unknown, null, undefined>
    container: d3.Selection<SVGGElement, unknown, null, undefined>
    nodesGroup: d3.Selection<SVGGElement, unknown, null, undefined>
    linksGroup: d3.Selection<SVGGElement, unknown, null, undefined>
  } | null>(null)

  // Determine rendering quality
  const quality = useMemo(() => getRenderQuality(rawEntities.length), [rawEntities.length])

  // Sync quality ref
  useEffect(() => {
    qualityRef.current = quality
  }, [quality])

  // Process data based on quality
  const { entities, relationships } = useMemo(() => {
    if (quality === 'critical') {
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

  // Drag handlers
  const dragStarted = (event: any, d: GraphNode) => {
    if (!event.active) simulationRef.current?.alphaTarget(0.3).restart()
    d.fx = d.x
    d.fy = d.y
  }

  const dragged = (event: any, d: GraphNode) => {
    d.fx = event.x
    d.fy = event.y
  }

  const dragEnded = (event: any, d: GraphNode) => {
    if (!event.active) simulationRef.current?.alphaTarget(0)
    d.fx = null
    d.fy = null
  }

  // 1. Initialize SVG structure and Simulation (Run Once)
  useEffect(() => {
    if (!svgRef.current) return

    const svg = d3.select(svgRef.current)
    svg.selectAll('*').remove() // Cleanup for HMR

    const container = svg.append('g')
    const linksGroup = container.append('g').attr('class', 'links')
    const nodesGroup = container.append('g').attr('class', 'nodes')

    groupsRef.current = { svg, container, linksGroup, nodesGroup }

    // Init Simulation
    simulationRef.current = d3.forceSimulation<GraphNode, GraphLink>()
      .force('charge', d3.forceManyBody())
      .force('link', d3.forceLink<GraphNode, GraphLink>().id(d => d.id))
      .force('center', d3.forceCenter(dimensions.width / 2, dimensions.height / 2))

    // Zoom behavior
    const zoom = d3.zoom<SVGSVGElement, unknown>()
      .scaleExtent([0.1, 4])
      .on('zoom', (event) => {
        container.attr('transform', event.transform)

        // Semantic Zoom with access to current quality
        const currentQuality = qualityRef.current
        if (currentQuality !== 'high') {
          const k = event.transform.k
          svg.selectAll('.node-label').style('opacity', k > 1.5 ? 1 : 0)
          svg.selectAll('.link-label').style('opacity', k > 2.0 ? 1 : 0)
        }
      })
    svg.call(zoom)

    // Handle window resize
    const updateDimensions = () => {
      if (svgRef.current) {
        const rect = svgRef.current.getBoundingClientRect()
        setDimensions({ width: rect.width, height: rect.height })
      }
    }
    updateDimensions()
    window.addEventListener('resize', updateDimensions)

    return () => {
      simulationRef.current?.stop()
      window.removeEventListener('resize', updateDimensions)
    }
  }, [])

  // 2. Handle Resize updates
  useEffect(() => {
    if (simulationRef.current) {
      simulationRef.current.force('center', d3.forceCenter(dimensions.width / 2, dimensions.height / 2))
      simulationRef.current.alpha(0.3).restart()
    }
  }, [dimensions.width, dimensions.height])

  // 3. Update Simulation Data, Layout & Render
  useEffect(() => {
    if (!simulationRef.current || !groupsRef.current) return

    const simulation = simulationRef.current
    const { nodesGroup, linksGroup } = groupsRef.current

    // --- Merge Nodes ---
    const currentNodesMap = nodesMapRef.current
    const nextNodesMap = new Map<string, GraphNode>()
    const newNodes: GraphNode[] = []

    entities.forEach(entity => {
      const existing = currentNodesMap.get(entity.id)
      if (existing) {
        existing.entity = entity
        nextNodesMap.set(entity.id, existing)
        newNodes.push(existing)
      } else {
        const newNode: GraphNode = {
          id: entity.id,
          entity,
          x: dimensions.width / 2 + (Math.random() - 0.5) * 50,
          y: dimensions.height / 2 + (Math.random() - 0.5) * 50
        }
        nextNodesMap.set(entity.id, newNode)
        newNodes.push(newNode)
      }
    })
    nodesMapRef.current = nextNodesMap

    // --- Merge Links ---
    const currentLinksMap = linksMapRef.current
    const nextLinksMap = new Map<string, GraphLink>()
    const newLinks: GraphLink[] = []

    relationships.forEach(rel => {
      const source = nextNodesMap.get(rel.sourceId)
      const target = nextNodesMap.get(rel.targetId)
      if (source && target) {
        const existing = currentLinksMap.get(rel.id)
        if (existing) {
          existing.relationship = rel
          existing.source = source
          existing.target = target
          nextLinksMap.set(rel.id, existing)
          newLinks.push(existing)
        } else {
          const newLink: GraphLink = { id: rel.id, relationship: rel, source, target }
          nextLinksMap.set(rel.id, newLink)
          newLinks.push(newLink)
        }
      }
    })
    linksMapRef.current = nextLinksMap

    // --- Update Simulation ---
    simulation.nodes(newNodes)
    simulation.force<d3.ForceLink<GraphNode, GraphLink>>('link')?.links(newLinks)

    // Adjust physics parameters
    const alphaDecay = quality === 'high' ? 0.0228 : (quality === 'medium' ? 0.05 : 0.1)
    const chargeStrength = quality === 'high' ? -300 : (quality === 'medium' ? -200 : -100)
    const collisionRadius = quality === 'high' ? 30 : 15

    simulation.alphaDecay(alphaDecay)
    simulation.force('charge', d3.forceManyBody().strength(chargeStrength))

    // Handle Layout Types
    if (layout.type === 'force') {
      simulation.force('radial', null)
      simulation.force('y', null)
      simulation.force('x', null)
      simulation.force('center', d3.forceCenter(dimensions.width / 2, dimensions.height / 2))

      const linkForce = simulation.force<d3.ForceLink<GraphNode, GraphLink>>('link')
      linkForce?.distance(quality === 'high' ? 100 : 60)

      if (quality === 'high' || quality === 'medium') {
        simulation.force('collision', d3.forceCollide().radius(collisionRadius))
      } else {
        simulation.force('collision', null)
      }
    } else if (layout.type === 'radial') {
      simulation.force('radial', d3.forceRadial(Math.min(dimensions.width, dimensions.height) / 3, dimensions.width / 2, dimensions.height / 2))
      simulation.force('y', null)
      simulation.force('x', null)
      simulation.force('center', null)
      simulation.force('collision', d3.forceCollide().radius(collisionRadius)) // Keep collision to avoid overlap in rings
    } else if (layout.type === 'hierarchic') {
      simulation.force('radial', null)
      simulation.force('center', null)
      simulation.force('y', d3.forceY<GraphNode>().y(d => (d.index || 0) * 80 + 100)) // Simple vertical spread based on index
      simulation.force('x', d3.forceX(dimensions.width / 2))
      simulation.force('collision', d3.forceCollide().radius(collisionRadius))
    }

    simulation.alpha(1).restart()

    // --- Render Elements (D3 Join) ---

    // LINKS
    const linkSelection = linksGroup.selectAll<SVGLineElement, GraphLink>('line.link')
      .data(newLinks, d => d.id)

    const linkEnter = linkSelection.enter()
      .append('line')
      .attr('class', 'link')
      .attr('stroke', '#999')
      .attr('stroke-opacity', 0)
      .attr('stroke-width', d => Math.sqrt(d.relationship.confidence * 3))

    linkEnter.transition().duration(500).attr('stroke-opacity', 0.6)

    linkSelection.exit()
      .transition().duration(500)
      .attr('stroke-opacity', 0)
      .remove()

    const allLinks = linkEnter.merge(linkSelection)

    // Link Labels
    const linkLabelSelection = linksGroup.selectAll<SVGTextElement, GraphLink>('text.link-label')
      .data((quality === 'high' || quality === 'medium') ? newLinks : [], d => d.id)

    const linkLabelEnter = linkLabelSelection.enter()
      .append('text')
      .attr('class', 'link-label')
      .attr('font-size', '10px')
      .attr('fill', '#666')
      .attr('text-anchor', 'middle')
      .style('opacity', 0)
      .text(d => d.relationship.type.replace('_', ' ').toLowerCase())

    if (quality === 'high') {
       linkLabelEnter.transition().duration(500).style('opacity', 1)
    }

    linkLabelSelection.exit().remove()

    const allLinkLabels = linkLabelEnter.merge(linkLabelSelection)


    // NODES
    const nodeSelection = nodesGroup.selectAll<SVGGElement, GraphNode>('g.node')
      .data(newNodes, d => d.id)

    const nodeEnter = nodeSelection.enter()
      .append('g')
      .attr('class', 'node')
      .style('cursor', 'pointer')
      .style('opacity', 0)
      .call(
        d3.drag<SVGGElement, GraphNode>()
          .on('start', dragStarted)
          .on('drag', dragged)
          .on('end', dragEnded)
      )

    nodeEnter.transition().duration(500).style('opacity', 1)

    nodeSelection.exit()
      .transition().duration(500)
      .style('opacity', 0)
      .remove()

    const allNodes = nodeEnter.merge(nodeSelection)

    // Helper for styles
    const getEntityColor = (type: string) => {
      const colors: Record<string, string> = {
        PERSON: '#3b82f6', ORGANIZATION: '#8b5cf6', LOCATION: '#10b981',
        IP_ADDRESS: '#f59e0b', DOMAIN: '#06b6d4', EMAIL: '#ec4899',
        FILE: '#ef4444', PROJECT: '#84cc16', SYSTEM: '#6b7280',
      }
      return colors[type] || '#6b7280'
    }

    const getEntityIcon = (type: string) => {
      const icons: Record<string, string> = {
        PERSON: '👤', ORGANIZATION: '🏢', LOCATION: '📍', IP_ADDRESS: '🌐',
        DOMAIN: '🔗', EMAIL: '📧', FILE: '📄', PROJECT: '📊', SYSTEM: '⚙️',
      }
      return icons[type] || '📊'
    }

    // Join Circle
    allNodes.selectAll<SVGCircleElement, GraphNode>('circle')
      .data(d => [d])
      .join('circle')
      .attr('r', d => quality === 'high' ? 15 + d.entity.confidence * 10 : 10)
      .attr('fill', d => getEntityColor(d.entity.type))
      .attr('stroke', '#fff') // Reset, will be overridden by selection effect
      .attr('stroke-width', 2)

    // Join Icon
    allNodes.selectAll<SVGTextElement, GraphNode>('text.node-icon')
      .data(d => (quality !== 'low' && quality !== 'critical') ? [d] : [])
      .join('text')
      .attr('class', 'node-icon')
      .attr('text-anchor', 'middle')
      .attr('dy', '.35em')
      .attr('font-size', '12px')
      .text(d => getEntityIcon(d.entity.type))

    // Join Label
    allNodes.selectAll<SVGTextElement, GraphNode>('text.node-label')
      .data(d => [d])
      .join('text')
      .attr('class', 'node-label')
      .attr('text-anchor', 'middle')
      .attr('dy', quality === 'high' ? '25px' : '20px')
      .attr('font-size', '11px')
      .attr('font-weight', 'bold')
      .attr('fill', '#333')
      .style('pointer-events', 'none')
      .style('opacity', quality === 'high' ? 1 : 0)
      .text(d => d.entity.name.length > 15 ? d.entity.name.slice(0, 15) + '...' : d.entity.name)

    // Join Confidence
    allNodes.selectAll<SVGTextElement, GraphNode>('text.node-conf')
      .data(d => quality === 'high' ? [d] : [])
      .join('text')
      .attr('class', 'node-conf')
      .attr('text-anchor', 'middle')
      .attr('dy', '37px')
      .attr('font-size', '9px')
      .attr('fill', '#666')
      .style('pointer-events', 'none')
      .text(d => `${Math.round(d.entity.confidence * 100)}%`)

    // Events
    allNodes.on('click', (event, d) => {
      event.stopPropagation()
      onEntitySelect?.(d.entity)
    })

    // Hover effects (simplified, attach to group)
    allNodes.on('mouseenter', function (event, d) {
       d3.select(this).select('circle').transition().duration(200)
         .attr('r', 20 + d.entity.confidence * 10)
       d3.select(this).select('.node-label').style('opacity', 1)

       allLinks.style('stroke-opacity', l => (l.source === d || l.target === d) ? 1 : 0.2)
    })
    .on('mouseleave', function (event, d) {
       d3.select(this).select('circle').transition().duration(200)
         .attr('r', quality === 'high' ? 15 + d.entity.confidence * 10 : 10)

       // Revert label opacity based on zoom/quality (handled by next semantic zoom trigger or reset here)
       // Simple reset:
       d3.select(this).select('.node-label').style('opacity', quality === 'high' ? 1 : 0)

       allLinks.style('stroke-opacity', 0.6)
    })


    // --- Tick Handler ---
    let tickCount = 0
    simulation.on('tick', () => {
      tickCount++
      if ((quality === 'low' || quality === 'critical') && tickCount % 2 !== 0) return

      allLinks
        .attr('x1', d => (d.source as GraphNode).x!)
        .attr('y1', d => (d.source as GraphNode).y!)
        .attr('x2', d => (d.target as GraphNode).x!)
        .attr('y2', d => (d.target as GraphNode).y!)

      allLinkLabels
        .attr('x', d => ((d.source as GraphNode).x! + (d.target as GraphNode).x!) / 2)
        .attr('y', d => ((d.source as GraphNode).y! + (d.target as GraphNode).y!) / 2)

      allNodes.attr('transform', d => `translate(${d.x},${d.y})`)
    })

  }, [entities, relationships, layout, quality, dimensions]) // Note: onEntitySelect omitted to avoid re-runs

  // 4. Selection Style Updates
  useEffect(() => {
    if (!groupsRef.current) return
    const { nodesGroup } = groupsRef.current

    const allNodes = nodesGroup.selectAll<SVGGElement, GraphNode>('g.node')

    allNodes.select('circle')
      .transition().duration(200)
      .attr('stroke', d => selectedEntityId === d.id ? '#fbbf24' : '#fff')
      .attr('stroke-width', d => (selectedEntityId === d.id ? 3 : 2))
      .style('filter', d => selectedEntityId === d.id ? 'drop-shadow(0 0 8px rgba(251, 191, 36, 0.6))' : 'none')

  }, [selectedEntityId]) // Only runs when selection changes

  // ... (PerformanceBadge and Return) ...
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

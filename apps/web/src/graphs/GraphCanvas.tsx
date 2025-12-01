import React, { useRef, useEffect, useState } from 'react'
import * as d3 from 'd3'
import { cn } from '@/lib/utils'
import type { Entity, Relationship, GraphLayout } from '@/types'

interface GraphCanvasProps {
  entities: Entity[]
  relationships: Relationship[]
  layout: GraphLayout
  onEntitySelect?: (entity: Entity) => void
  selectedEntityId?: string
  width?: number
  height?: number
  className?: string
  // Overlays
  showRiskSignals?: boolean
  showNarrativeFlows?: boolean
}

interface GraphNode extends d3.SimulationNodeDatum {
  id: string
  entity: Entity
  x?: number
  y?: number
  fx?: number | null
  fy?: number | null
  // Delta rendering support
  isNew?: boolean
}

interface GraphLink extends d3.SimulationLinkDatum<GraphNode> {
  id: string
  relationship: Relationship
  source: GraphNode
  target: GraphNode
}

export function GraphCanvas({
  entities,
  relationships,
  layout,
  onEntitySelect,
  selectedEntityId,
  className,
  showRiskSignals = false,
  showNarrativeFlows = false,
}: GraphCanvasProps) {
  const svgRef = useRef<SVGSVGElement>(null)
  const [dimensions, setDimensions] = useState({ width: 800, height: 600 })
  const [zoomLevel, setZoomLevel] = useState(1) // 1 = 100%

  // Track previous entities to detect changes (Delta rendering)
  const prevEntitiesRef = useRef<Set<string>>(new Set());

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
    // Clear previous render - simple approach.
    // Optimization: could be improved to use enter/update/exit better, but keeping it robust for now.
    svg.selectAll('*').remove()

    const { width, height } = dimensions

    // Delta Rendering: Mark new entities
    const currentEntityIds = new Set(entities.map(e => e.id));
    const entitiesWithMeta = entities.map(entity => ({
        ...entity,
        isNew: !prevEntitiesRef.current.has(entity.id) && prevEntitiesRef.current.size > 0
    }));
    prevEntitiesRef.current = currentEntityIds;

    // LOD & Clustering Logic
    // If zoom level is very low (< 0.5), we might want to cluster nodes
    const shouldCluster = zoomLevel < 0.5 && entities.length > 50;

    let nodesToRender: GraphNode[];
    let linksToRender: GraphLink[];

    if (shouldCluster) {
        // Simple clustering: group by type
        // This is a visual simplification only for the demo
        // Real implementation would be more complex
        const clusters = d3.group(entitiesWithMeta, d => d.type);
        nodesToRender = Array.from(clusters).map(([type, group], i) => ({
            id: `cluster-${type}`,
            entity: {
                id: `cluster-${type}`,
                type: type,
                name: `${type} (${group.length})`,
                confidence: 1,
                // Metadata to indicate it's a cluster
                metadata: { isCluster: true, count: group.length }
            } as any,
             // preserve somewhat stable positions if possible (not implemented here)
        }));
        // Simplified links between clusters?
        // For now, no links in cluster mode to keep it clean or just intra-cluster
         linksToRender = [];
    } else {
        nodesToRender = entitiesWithMeta.map(entity => ({
            id: entity.id,
            entity,
            isNew: (entity as any).isNew
        }));

        linksToRender = relationships
        .filter(rel => {
            const sourceNode = nodesToRender.find(n => n.id === rel.sourceId)
            const targetNode = nodesToRender.find(n => n.id === rel.targetId)
            return sourceNode && targetNode
        })
        .map(rel => ({
            id: rel.id,
            relationship: rel,
            source: nodesToRender.find(n => n.id === rel.sourceId)!,
            target: nodesToRender.find(n => n.id === rel.targetId)!,
        }));
    }


    // Create simulation based on layout type
    let simulation: d3.Simulation<GraphNode, GraphLink>

    const chargeStrength = shouldCluster ? -500 : -300;
    const linkDistance = shouldCluster ? 200 : 100;

    switch (layout.type) {
      case 'force':
        simulation = d3
          .forceSimulation(nodesToRender)
          .force(
            'link',
            d3
              .forceLink<GraphNode, GraphLink>(linksToRender)
              .id(d => d.id)
              .distance(linkDistance)
          )
          .force('charge', d3.forceManyBody().strength(chargeStrength))
          .force('center', d3.forceCenter(width / 2, height / 2))
          .force('collision', d3.forceCollide().radius(shouldCluster ? 50 : 30))
        break

      case 'radial':
        simulation = d3
          .forceSimulation(nodesToRender)
          .force(
            'link',
            d3
              .forceLink<GraphNode, GraphLink>(linksToRender)
              .id(d => d.id)
              .distance(80)
          )
          .force('charge', d3.forceManyBody().strength(-200))
          .force('radial', d3.forceRadial(150, width / 2, height / 2))
        break

      // ... (other cases like hierarchic remain similar)
      default:
         simulation = d3
          .forceSimulation(nodesToRender)
          .force(
            'link',
            d3.forceLink<GraphNode, GraphLink>(linksToRender).id(d => d.id)
          )
          .force('charge', d3.forceManyBody())
          .force('center', d3.forceCenter(width / 2, height / 2))
    }

    // Create container groups
    const container = svg.append('g')
    const linksGroup = container.append('g').attr('class', 'links')
    const nodesGroup = container.append('g').attr('class', 'nodes')

    // Overlay Groups
    const narrativeFlowGroup = container.append('g').attr('class', 'narrative-flows')
    const riskSignalGroup = container.append('g').attr('class', 'risk-signals')

    // Add zoom behavior
    const zoom = d3
      .zoom<SVGSVGElement, unknown>()
      .scaleExtent([0.1, 4])
      .on('zoom', event => {
        container.attr('transform', event.transform)
        setZoomLevel(event.transform.k); // Update zoom state for LOD
      })

    svg.call(zoom)

    // Draw links
    const link = linksGroup
      .selectAll<SVGLineElement, GraphLink>('line')
      .data(linksToRender)
      .enter()
      .append('line')
      .attr('class', 'link')
      .attr('stroke', '#999')
      .attr('stroke-opacity', 0.6)
      .attr('stroke-width', d => Math.sqrt(d.relationship.confidence * 3))

    // Draw link labels (LOD: hide labels when zoomed out)
    const linkLabel = linksGroup
      .selectAll<SVGTextElement, GraphLink>('text')
      .data(linksToRender)
      .enter()
      .append('text')
      .attr('class', 'link-label')
      .attr('font-size', '10px')
      .attr('fill', '#666')
      .attr('text-anchor', 'middle')
      .text(d => zoomLevel > 0.8 ? d.relationship.type.replace('_', ' ').toLowerCase() : '') // LOD check

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
      .data(nodesToRender)
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
      .attr('r', d => {
          if ((d.entity as any).metadata?.isCluster) return 30;
          return 15 + d.entity.confidence * 10
      })
      .attr('fill', d => getEntityColor(d.entity.type))
      .attr('stroke', d => {
        if (d.isNew) return '#22c55e'; // Green stroke for new nodes
        return selectedEntityId === d.entity.id ? '#fbbf24' : '#fff'
      })
      .attr('stroke-width', d => (selectedEntityId === d.entity.id || d.isNew ? 3 : 2))
      .style('filter', d =>
        selectedEntityId === d.entity.id
          ? 'drop-shadow(0 0 8px rgba(251, 191, 36, 0.6))'
          : 'none'
      )
      // Pulse animation for new nodes
      .filter(d => !!d.isNew)
      .append('animate')
      .attr('attributeName', 'r')
      .attr('values', d => `${15 + d.entity.confidence * 10};${20 + d.entity.confidence * 10};${15 + d.entity.confidence * 10}`)
      .attr('dur', '1.5s')
      .attr('repeatCount', '3');


    // Node icons (LOD: hide icons when very zoomed out if crowded)
    node
      .append('text')
      .attr('text-anchor', 'middle')
      .attr('dy', '.35em')
      .attr('font-size', '12px')
      .text(d => zoomLevel > 0.4 ? getEntityIcon(d.entity.type) : '')

    // Node labels (LOD: Hide labels if zoomed out)
    node
      .append('text')
      .attr('text-anchor', 'middle')
      .attr('dy', '25px')
      .attr('font-size', '11px')
      .attr('font-weight', 'bold')
      .attr('fill', '#333')
      .style('pointer-events', 'none')
      .text(d => {
        if (zoomLevel < 0.6 && !(selectedEntityId === d.entity.id)) return ''; // Hide labels when zoomed out unless selected
        return d.entity.name.length > 15
          ? d.entity.name.slice(0, 15) + '...'
          : d.entity.name
      })

    // Confidence indicator (LOD: Only show when zoomed in)
    node
      .append('text')
      .attr('text-anchor', 'middle')
      .attr('dy', '37px')
      .attr('font-size', '9px')
      .attr('fill', '#666')
      .style('pointer-events', 'none')
      .text(d => {
           if (zoomLevel < 1.2) return '';
           return `${Math.round(d.entity.confidence * 100)}%`
      })

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

      // Update Overlays
      if (showRiskSignals) {
         riskSignalGroup.selectAll('*').remove();
         // Simulate risk based on confidence < 0.8 for demo
         const riskyNodes = nodesToRender.filter(n => n.entity.confidence < 0.8);
         riskyNodes.forEach(n => {
             if (n.x && n.y) {
                 riskSignalGroup.append('circle')
                    .attr('cx', n.x)
                    .attr('cy', n.y)
                    .attr('r', 25)
                    .attr('fill', 'none')
                    .attr('stroke', 'red')
                    .attr('stroke-width', 2)
                    .attr('stroke-dasharray', '4 2')
                    .append('animateTransform')
                    .attr('attributeName', 'transform')
                    .attr('type', 'rotate')
                    .attr('from', `0 ${n.x} ${n.y}`)
                    .attr('to', `360 ${n.x} ${n.y}`)
                    .attr('dur', '10s')
                    .attr('repeatCount', 'indefinite');
             }
         });
      } else {
          riskSignalGroup.selectAll('*').remove();
      }

      if (showNarrativeFlows) {
           narrativeFlowGroup.selectAll('*').remove();
           // Draw a path connecting nodes in order of creation/index (mock flow)
           if (nodesToRender.length > 1) {
               const pathGenerator = d3.line<GraphNode>()
                 .x(d => d.x!)
                 .y(d => d.y!)
                 .curve(d3.curveCatmullRom);

                // Just take first 5 nodes as a 'narrative'
                const flowNodes = nodesToRender.slice(0, 5);

                if (flowNodes.every(n => n.x && n.y)) {
                    narrativeFlowGroup.append('path')
                        .datum(flowNodes)
                        .attr('d', pathGenerator)
                        .attr('fill', 'none')
                        .attr('stroke', '#3b82f6')
                        .attr('stroke-width', 4)
                        .attr('stroke-opacity', 0.3)
                        .attr('stroke-dasharray', '10 5')
                        .attr('class', 'flow-line');
                }
           }
      } else {
          narrativeFlowGroup.selectAll('*').remove();
      }
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
    showRiskSignals,
    showNarrativeFlows,
    // zoomLevel triggers re-render only if thresholds crossed, managed by setZoomLevel but here we just depend on entities/layout mainly.
    // Ideally we would want to re-run sim only if structure changes, but for LOD labels/icons we might need re-render or d3 update.
    // For simplicity in this React wrapper, we re-run sim if entities change.
    // For pure visual LOD (labels), we can use a separate effect or just let D3 handle it via classes/css or update selections.
    // Here we include zoomLevel in dep array to force re-render of labels/icons.
    zoomLevel < 0.5 // crude dependency to trigger re-render on major zoom change for clustering
  ])

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
          <div className="text-xs font-medium text-muted-foreground mb-1">
            Graph Info
          </div>
          <div className="text-xs space-y-1">
            <div>Entities: {entities.length}</div>
            <div>Relationships: {relationships.length}</div>
            <div>Layout: {layout.type}</div>
            <div>Zoom: {Math.round(zoomLevel * 100)}%</div>
             {showRiskSignals && <div className="text-red-500 font-bold">Risk Signals ON</div>}
             {showNarrativeFlows && <div className="text-blue-500 font-bold">Narrative Flows ON</div>}
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

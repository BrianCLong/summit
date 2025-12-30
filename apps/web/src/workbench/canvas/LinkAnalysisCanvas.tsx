import React, { useRef, useEffect, useState, useCallback } from 'react'
import * as d3 from 'd3'
import { useWorkbenchStore } from '../store/viewStore'
import { ContextMenu, ContextMenuContent, ContextMenuItem, ContextMenuTrigger } from '@/components/ui/ContextMenu'
import type { Entity, Relationship } from '@/types'

// Use a local interface if Types are missing
interface Node extends d3.SimulationNodeDatum {
  id: string
  entity: Entity
  x?: number
  y?: number
  fx?: number | null
  fy?: number | null
}

interface Link extends d3.SimulationLinkDatum<Node> {
  source: Node | string
  target: Node | string
  relationship: Relationship
}

interface LinkAnalysisCanvasProps {
  nodes: Entity[]
  edges: Relationship[]
  onNodeContextMenu?: (entity: Entity, x: number, y: number) => void
}

export function LinkAnalysisCanvas({ nodes: initialNodes, edges: initialEdges }: LinkAnalysisCanvasProps) {
  const svgRef = useRef<SVGSVGElement>(null)
  const wrapperRef = useRef<HTMLDivElement>(null)

  const { selectedEntityIds, selectEntity } = useWorkbenchStore()

  // D3 State
  const simulationRef = useRef<d3.Simulation<Node, Link> | null>(null)

  // Transform state for zoom/pan
  const transformRef = useRef<d3.ZoomTransform>(d3.zoomIdentity)

  useEffect(() => {
    if (!svgRef.current || !wrapperRef.current) return

    const width = wrapperRef.current.clientWidth
    const height = wrapperRef.current.clientHeight

    const svg = d3.select(svgRef.current)
      .attr('width', width)
      .attr('height', height)
      .attr('viewBox', [0, 0, width, height])

    // Clear previous
    svg.selectAll('*').remove()

    const g = svg.append('g')

    // Zoom behavior
    const zoom = d3.zoom<SVGSVGElement, unknown>()
      .scaleExtent([0.1, 4])
      .on('zoom', (event) => {
        g.attr('transform', event.transform)
        transformRef.current = event.transform
      })

    svg.call(zoom)

    // Data preparation
    const nodes: Node[] = initialNodes.map(n => ({ ...n, entity: n }))
    const links: Link[] = initialEdges.map(e => ({ ...e, relationship: e, source: e.sourceId, target: e.targetId }))

    // Simulation
    const simulation = d3.forceSimulation(nodes)
      .force('link', d3.forceLink(links).id((d: any) => d.id).distance(100))
      .force('charge', d3.forceManyBody().strength(-300))
      .force('center', d3.forceCenter(width / 2, height / 2))
      .force('collide', d3.forceCollide(30))

    simulationRef.current = simulation

    // Render Links
    const link = g.append('g')
      .selectAll('line')
      .data(links)
      .join('line')
      .attr('stroke', '#999')
      .attr('stroke-opacity', 0.6)
      .attr('stroke-width', 2)

    // Render Nodes
    const node = g.append('g')
      .selectAll('g')
      .data(nodes)
      .join('g')
      .attr('class', 'node')
      .call(d3.drag<SVGGElement, Node>()
        .on('start', dragstarted)
        .on('drag', dragged)
        .on('end', dragended)
      )

    // Node circles
    node.append('circle')
      .attr('r', 20)
      .attr('fill', d => getTypeColor(d.entity.type))
      .attr('stroke', '#fff')
      .attr('stroke-width', 1.5)

    // Node labels
    node.append('text')
      .text(d => d.entity.name.substring(0, 10))
      .attr('x', 22)
      .attr('y', 5)
      .style('font-size', '10px')
      .style('pointer-events', 'none')

    // Click handler
    node.on('click', (event, d) => {
        if (event.defaultPrevented) return // Dragged
        const multi = event.shiftKey || event.metaKey
        selectEntity(d.id, multi)
    })

    // Selection styling update
    simulation.on('tick', () => {
      link
        .attr('x1', d => (d.source as Node).x!)
        .attr('y1', d => (d.source as Node).y!)
        .attr('x2', d => (d.target as Node).x!)
        .attr('y2', d => (d.target as Node).y!)

      node
        .attr('transform', d => `translate(${d.x},${d.y})`)
    })

    function dragstarted(event: any, d: Node) {
      if (!event.active) simulation.alphaTarget(0.3).restart()
      d.fx = d.x
      d.fy = d.y
    }

    function dragged(event: any, d: Node) {
      d.fx = event.x
      d.fy = event.y
    }

    function dragended(event: any, d: Node) {
      if (!event.active) simulation.alphaTarget(0)
      d.fx = null
      d.fy = null
    }

    return () => {
      simulation.stop()
    }
  }, [initialNodes, initialEdges, selectEntity])

  // Effect to update selection visuals without re-running simulation
  useEffect(() => {
    if (!svgRef.current) return
    const svg = d3.select(svgRef.current)

    svg.selectAll('.node circle')
      .attr('stroke', (d: any) => selectedEntityIds.includes(d.id) ? '#fbbf24' : '#fff') // Yellow selection
      .attr('stroke-width', (d: any) => selectedEntityIds.includes(d.id) ? 3 : 1.5)
  }, [selectedEntityIds])

  function getTypeColor(type: string) {
    const colors: Record<string, string> = {
      PERSON: '#3b82f6',
      ORGANIZATION: '#8b5cf6',
      LOCATION: '#10b981',
      default: '#6b7280'
    }
    return colors[type] || colors.default
  }

  return (
    <div ref={wrapperRef} className="w-full h-full bg-slate-50 relative overflow-hidden">
      <svg ref={svgRef} className="w-full h-full block" />
      {/* Context Menu implementation would go here using Radix Primitives wrapping the SVG or specific nodes */}
    </div>
  )
}

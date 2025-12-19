import React, { useRef, useEffect, useState, forwardRef, useImperativeHandle } from 'react'
import * as d3 from 'd3'
// Tree-shaken D3 imports for better bundle size
import { select } from 'd3-selection'
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

export interface GraphCanvasProps {
  entities: Entity[]
  relationships: Relationship[]
  layout: GraphLayout
  onEntitySelect?: (entity: Entity) => void
  onNodeDrop?: (type: string, x: number, y: number) => void
  onLinkCreate?: (sourceId: string, targetId: string) => void
  selectedEntityId?: string
  width?: number
  height?: number
  className?: string
}

export interface GraphCanvasRef {
  exportAsPNG: () => Promise<Blob | null>
  exportAsSVG: () => string | null
  exportAsJSON: () => string
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

export const GraphCanvas = forwardRef<GraphCanvasRef, GraphCanvasProps>(({
  entities,
  relationships,
  layout,
  onEntitySelect,
  onNodeDrop,
  onLinkCreate,
  selectedEntityId,
  className,
}, ref) => {
  const svgRef = useRef<SVGSVGElement>(null)
  const [dimensions, setDimensions] = useState({ width: 800, height: 600 })
  const [fps, setFps] = useState(0)
  const [debugMode, setDebugMode] = useState(false)
  const frameCountRef = useRef(0)
  const lastTimeRef = useRef(performance.now())

  // Expose export methods via ref
  useImperativeHandle(ref, () => ({
    exportAsPNG: async () => {
      if (!svgRef.current) return null

      const svg = svgRef.current
      const serializer = new XMLSerializer()
      const svgStr = serializer.serializeToString(svg)

      const canvas = document.createElement('canvas')
      canvas.width = dimensions.width
      canvas.height = dimensions.height
      const ctx = canvas.getContext('2d')
      if (!ctx) return null

      const img = new Image()
      const svgBlob = new Blob([svgStr], { type: 'image/svg+xml;charset=utf-8' })
      const url = URL.createObjectURL(svgBlob)

      return new Promise((resolve) => {
        img.onload = () => {
          ctx.fillStyle = '#ffffff'
          ctx.fillRect(0, 0, canvas.width, canvas.height)
          ctx.drawImage(img, 0, 0)
          URL.revokeObjectURL(url)
          canvas.toBlob((blob) => resolve(blob))
        }
        img.src = url
      })
    },
    exportAsSVG: () => {
      if (!svgRef.current) return null
      const serializer = new XMLSerializer()
      return serializer.serializeToString(svgRef.current)
    },
    exportAsJSON: () => {
      return JSON.stringify({ entities, relationships, layout }, null, 2)
    }
  }))

  // Calculate FPS
  useEffect(() => {
    if (!debugMode) return

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

  useEffect(() => {
    if (!svgRef.current || entities.length === 0) return

    const svg = select(svgRef.current)
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
          .force('charge', d3.forceManyBody().strength(-300))
          .force('center', d3.forceCenter(width / 2, height / 2))
          .force('collision', d3.forceCollide().radius(30))
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

    // Temporary link line for drag interaction
    const dragLine = container.append('line')
      .attr('class', 'drag-line')
      .attr('stroke', '#fbbf24')
      .attr('stroke-width', 2)
      .attr('stroke-dasharray', '5,5')
      .style('opacity', 0)
      .style('pointer-events', 'none')

    // Link creation state
    let isLinking = false
    let linkSource: GraphNode | null = null

    // Add zoom behavior
    const zoomBehavior = zoom<SVGSVGElement, unknown>()
      .scaleExtent([0.1, 4])
      .on('zoom', event => {
        container.attr('transform', event.transform)
      })

    svg.call(zoomBehavior)

    // Keyboard navigation for pan/zoom
    const handleKeyDown = (event: KeyboardEvent) => {
       const transform = d3.zoomTransform(svg.node()!)
       const k = transform.k
       const x = transform.x
       const y = transform.y
       const step = 50

       switch(event.key) {
           case 'ArrowUp':
               zoomBehavior.translateBy(svg, 0, step / k)
               break
           case 'ArrowDown':
               zoomBehavior.translateBy(svg, 0, -step / k)
               break
           case 'ArrowLeft':
               zoomBehavior.translateBy(svg, step / k, 0)
               break
           case 'ArrowRight':
               zoomBehavior.translateBy(svg, -step / k, 0)
               break
           case '+':
           case '=':
               zoomBehavior.scaleBy(svg, 1.2)
               break
           case '-':
               zoomBehavior.scaleBy(svg, 0.8)
               break
       }
    }

    // Attach to the container div to capture keys when focused or mouse over
    // Note: React synthetic events are on the div, but here we are inside useEffect
    // Ideally we should attach to window or the focused element.
    // For now, let's attach to the window only when the user is likely interacting with the graph,
    // but better to rely on the parent component or assume the SVG is focused.

    // Since we can't easily attach to "this" component instance from d3 effect without refs or imperative handles,
    // and we want global shortcuts when the workbench is active, OR specific focus.

    // Let's attach to the SVG element which is focusable?
    // We didn't make SVG focusable, but the parent div is.

    // We will assume the parent handles focus or we attach to window but filter?
    // Let's stick to attaching to the SVG ref if it has focus.

    // Actually, simple approach:
    select(svgRef.current)
       .attr('tabindex', 0) // Make SVG focusable
       .on('keydown', (event) => handleKeyDown(event))


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
      .attr('tabindex', 0)
      .attr('role', 'button')
      .attr('aria-label', d => `${d.entity.name} (${d.entity.type})`)
      .style('cursor', 'pointer')
      .on('keydown', (event, d) => {
        if (event.key === 'Enter' || event.key === ' ') {
          event.preventDefault()
          onEntitySelect?.(d.entity)
        }
      })
      .call(
        drag<SVGGElement, GraphNode>()
          .on('start', (event, d) => {
            if (event.sourceEvent.shiftKey && onLinkCreate) {
              // Start linking mode
              isLinking = true
              linkSource = d
              dragLine
                .attr('x1', d.x!)
                .attr('y1', d.y!)
                .attr('x2', d.x!)
                .attr('y2', d.y!)
                .style('opacity', 1)
            } else {
              // Standard drag
              if (!event.active) simulation.alphaTarget(0.3).restart()
              d.fx = d.x
              d.fy = d.y
            }
          })
          .on('drag', (event, d) => {
            if (isLinking && linkSource) {
              // Update drag line
              // We need to transform mouse coordinates back to SVG space
              const transform = d3.zoomTransform(svg.node()!)
              const [mouseX, mouseY] = d3.pointer(event, svg.node())
              // Invert transform not needed if we use the mouse position relative to container,
              // but drag event gives us coordinates in the subject's coordinate system usually.
              // d3.drag behavior on the node gives us event.x/y which are the node's new position.

              // However, since we are dragging the *node*, event.x/y are where the node would be.
              // If shift is held, we want the mouse position.

              dragLine
                .attr('x2', event.x)
                .attr('y2', event.y)
            } else {
              d.fx = event.x
              d.fy = event.y
            }
          })
          .on('end', (event, d) => {
            if (isLinking && linkSource) {
              isLinking = false
              dragLine.style('opacity', 0)

              // Check if dropped on another node
              // We can use document.elementFromPoint or checking distance
              // But drag end event doesn't give us the target element easily if we are capturing.

              // Let's find the node closest to the cursor
              // Note: event.x, event.y are in local coordinates
              const target = nodes.find(n => {
                if (n === linkSource) return false
                const dx = n.x! - event.x
                const dy = n.y! - event.y
                return Math.sqrt(dx * dx + dy * dy) < 20 // 20px radius
              })

              if (target && onLinkCreate) {
                onLinkCreate(linkSource.id, target.id)
              }

              linkSource = null
            } else {
              if (!event.active) simulation.alphaTarget(0)
              d.fx = null
              d.fy = null
            }
          })
      )

    // Node circles
    node
      .append('circle')
      .attr('r', d => 15 + d.entity.confidence * 10)
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

    // Node icons (using text for simplicity)
    node
      .append('text')
      .attr('text-anchor', 'middle')
      .attr('dy', '.35em')
      .attr('font-size', '12px')
      .text(d => getEntityIcon(d.entity.type))

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
      onEntitySelect?.(d.entity)
    })

    // Hover effects
    node.on('mouseenter', function (event, d) {
      select(this)
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
      select(this)
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
    entities,
    relationships,
    layout,
    dimensions,
    selectedEntityId,
    onEntitySelect,
  ])

  return (
    <div
      className={cn('relative w-full h-full', className)}
      onDragOver={(e) => e.preventDefault()}
      onDrop={(e) => {
        e.preventDefault()
        const type = e.dataTransfer.getData('application/intelgraph-entity')
        if (type && onNodeDrop) {
          const rect = svgRef.current?.getBoundingClientRect()
          if (rect) {
            onNodeDrop(type, e.clientX - rect.left, e.clientY - rect.top)
          }
        }
      }}
    >
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
})

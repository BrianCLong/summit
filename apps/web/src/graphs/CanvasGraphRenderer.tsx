import React, { useRef, useEffect, useState } from 'react'
import { zoom, zoomIdentity } from 'd3-zoom'
import { select } from 'd3-selection'
import { drag } from 'd3-drag'
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
}

// Simple Entity Color Map
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
  DEFAULT: '#6b7280',
}

interface WorkerNode {
  id: string
  x: number
  y: number
}

export function CanvasGraphRenderer({
  entities,
  relationships,
  layout,
  onEntitySelect,
  selectedEntityId,
  className,
}: GraphCanvasProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const workerRef = useRef<Worker | null>(null)
  const [dimensions, setDimensions] = useState({ width: 800, height: 600 })
  const [fps, setFps] = useState(0)
  const [debugMode, setDebugMode] = useState(false)
  const frameCountRef = useRef(0)
  const lastTimeRef = useRef(performance.now())

  // Store latest props in refs to avoid stale closures in render loop
  const propsRef = useRef({ entities, relationships, layout })
  useEffect(() => {
    propsRef.current = { entities, relationships, layout }
  }, [entities, relationships, layout])

  // Store nodes in a ref to update them without triggering re-renders
  const nodesRef = useRef<any[]>([])
  const transformRef = useRef(zoomIdentity)

  // O(1) Lookup Map for nodes by ID (Performance optimization)
  const nodeMapRef = useRef<Map<string, any>>(new Map())

  // Initialize nodes only when entities change significantly
  const entitiesHash = entities.map(e => e.id).join(',')

  useEffect(() => {
    const existingMap = nodeMapRef.current
    nodesRef.current = entities.map(entity => {
      const existing = existingMap.get(entity.id)
      return {
        id: entity.id,
        entity,
        x: existing?.x || Math.random() * dimensions.width,
        y: existing?.y || Math.random() * dimensions.height,
      }
    })
    nodeMapRef.current = new Map(nodesRef.current.map(n => [n.id, n]))
  }, [entitiesHash, dimensions.width, dimensions.height])

  // Worker Initialization
  useEffect(() => {
    if (!workerRef.current) {
      workerRef.current = new Worker(
        new URL('./simulation.worker.ts', import.meta.url),
        {
          type: 'module',
        }
      )

      workerRef.current.onmessage = event => {
        if (event.data.type === 'tick') {
          const updatedNodes = event.data.nodes as WorkerNode[]
          const updateMap = new Map(updatedNodes.map(n => [n.id, n]))

          nodesRef.current.forEach(node => {
            const updated = updateMap.get(node.id)
            if (updated) {
              node.x = updated.x
              node.y = updated.y
            }
          })
          requestAnimationFrame(render)
        }
      }
    }

    const { width, height } = dimensions

    // Send init message
    const workerNodes = nodesRef.current.map(n => ({
      id: n.id,
      x: n.x,
      y: n.y,
    }))
    const workerLinks = relationships.map(r => ({
      id: r.id,
      source: r.sourceId,
      target: r.targetId,
    }))

    workerRef.current.postMessage({
      type: 'init',
      nodes: workerNodes,
      links: workerLinks,
      width,
      height,
      layoutType: layout.type,
    })

    return () => {
      // Fix: Terminate worker to prevent memory leak
      if (workerRef.current) {
        workerRef.current.terminate()
        workerRef.current = null
      }
    }
  }, [
    entitiesHash,
    relationships.length,
    layout.type,
    dimensions.width,
    dimensions.height,
  ])

  // Calculate FPS
  useEffect(() => {
    if (!debugMode) return
    let animationFrameId: number
    const loop = (time: number) => {
      frameCountRef.current++
      if (time - lastTimeRef.current >= 1000) {
        setFps(
          Math.round(
            (frameCountRef.current * 1000) / (time - lastTimeRef.current)
          )
        )
        frameCountRef.current = 0
        lastTimeRef.current = time
      }
      animationFrameId = requestAnimationFrame(loop)
    }
    animationFrameId = requestAnimationFrame(loop)
    return () => cancelAnimationFrame(animationFrameId)
  }, [debugMode])

  // Resize Handler
  useEffect(() => {
    const updateDimensions = () => {
      if (canvasRef.current) {
        const rect = canvasRef.current.getBoundingClientRect()
        setDimensions({ width: rect.width, height: rect.height })
        const dpr = window.devicePixelRatio || 1
        canvasRef.current.width = rect.width * dpr
        canvasRef.current.height = rect.height * dpr
        const ctx = canvasRef.current.getContext('2d')
        if (ctx) ctx.scale(dpr, dpr)
      }
    }
    updateDimensions()
    window.addEventListener('resize', updateDimensions)
    return () => window.removeEventListener('resize', updateDimensions)
  }, [])

  // Render function
  const render = () => {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')
    if (!ctx) return
    const { width, height } = dimensions
    const transform = transformRef.current
    const currentProps = propsRef.current

    ctx.save()
    ctx.clearRect(0, 0, width, height)
    ctx.translate(transform.x, transform.y)
    ctx.scale(transform.k, transform.k)

    // Links
    ctx.lineWidth = 1
    ctx.strokeStyle = '#999'
    ctx.globalAlpha = 0.6

    if (transform.k > 0.5) {
      ctx.beginPath()
      currentProps.relationships.forEach(rel => {
        const source = nodeMapRef.current.get(rel.sourceId)
        const target = nodeMapRef.current.get(rel.targetId)
        if (source && target && source.x && target.x) {
          ctx.moveTo(source.x, source.y)
          ctx.lineTo(target.x, target.y)
        }
      })
      ctx.stroke()
    }
    ctx.globalAlpha = 1.0

    // Nodes
    nodesRef.current.forEach(node => {
      if (!node.x) return

      const screenX = node.x * transform.k + transform.x
      const screenY = node.y * transform.k + transform.y
      if (
        screenX < -50 ||
        screenX > width + 50 ||
        screenY < -50 ||
        screenY > height + 50
      )
        return

      const r = 15 + (node.entity.confidence || 0) * 10
      const isSelected = selectedEntityId === node.id

      ctx.beginPath()
      ctx.arc(node.x, node.y, r, 0, 2 * Math.PI)
      ctx.fillStyle = ENTITY_COLORS[node.entity.type] || ENTITY_COLORS.DEFAULT
      ctx.fill()

      if (isSelected) {
        ctx.strokeStyle = '#fbbf24'
        ctx.lineWidth = 3
        ctx.stroke()
      }

      if (transform.k > 0.8 || nodesRef.current.length < 500 || isSelected) {
        ctx.fillStyle = '#333'
        ctx.font = 'bold 11px sans-serif'
        ctx.textAlign = 'center'
        ctx.textBaseline = 'middle'
        const label =
          node.entity.name.length > 15
            ? `${node.entity.name.slice(0, 15)}...`
            : node.entity.name
        ctx.fillText(label, node.x, node.y + r + 12)
      }
    })

    ctx.restore()
  }

  useEffect(() => {
    requestAnimationFrame(render)
  }, [selectedEntityId])

  // Interaction Setup
  useEffect(() => {
    if (!canvasRef.current) return
    const canvas = canvasRef.current

    // Zoom
    const zoomBehavior = zoom<HTMLCanvasElement, unknown>()
      .scaleExtent([0.1, 4])
      .on('zoom', event => {
        transformRef.current = event.transform
        requestAnimationFrame(render)
      })

    select(canvas).call(zoomBehavior)

    // Click Selection
    const handleClick = (event: MouseEvent) => {
      const rect = canvas.getBoundingClientRect()
      const transform = transformRef.current
      const clickX = (event.clientX - rect.left - transform.x) / transform.k
      const clickY = (event.clientY - rect.top - transform.y) / transform.k

      for (let i = nodesRef.current.length - 1; i >= 0; i--) {
        const node = nodesRef.current[i]
        const r = 15 + (node.entity.confidence || 0) * 10
        const dx = clickX - node.x
        const dy = clickY - node.y
        if (dx * dx + dy * dy < r * r) {
          onEntitySelect?.(node.entity)
          break
        }
      }
    }

    // Drag behavior
    const dragBehavior = drag<HTMLCanvasElement, unknown>()
      .subject(event => {
        const rect = canvas.getBoundingClientRect()
        const transform = transformRef.current
        const x =
          (event.sourceEvent.clientX - rect.left - transform.x) / transform.k
        const y =
          (event.sourceEvent.clientY - rect.top - transform.y) / transform.k

        for (let i = nodesRef.current.length - 1; i >= 0; i--) {
          const node = nodesRef.current[i]
          const r = 15 + (node.entity.confidence || 0) * 10
          const dx = x - node.x
          const dy = y - node.y
          if (dx * dx + dy * dy < r * r) {
            return node
          }
        }
        return null
      })
      .on('start', event => {
        if (event.subject) {
          workerRef.current?.postMessage({
            type: 'drag',
            nodeId: event.subject.id,
            x: event.subject.x,
            y: event.subject.y,
          })
        }
      })
      .on('drag', event => {
        if (event.subject) {
          const transform = transformRef.current

          // Fix: Adjust drag delta by zoom scale to move at correct speed
          event.subject.x += event.dx / transform.k
          event.subject.y += event.dy / transform.k

          requestAnimationFrame(render)

          workerRef.current?.postMessage({
            type: 'drag',
            nodeId: event.subject.id,
            x: event.subject.x,
            y: event.subject.y,
          })
        }
      })
      .on('end', event => {
        if (event.subject) {
          workerRef.current?.postMessage({
            type: 'drag',
            nodeId: event.subject.id,
            x: null,
            y: null,
          })
        }
      })

    select(canvas).call(dragBehavior)
    canvas.addEventListener('click', handleClick)

    return () => {
      canvas.removeEventListener('click', handleClick)
    }
  }, [])

  return (
    <div className={cn('relative w-full h-full', className)}>
      <canvas
        ref={canvasRef}
        className="block w-full h-full bg-gradient-to-br from-slate-50 to-slate-100 dark:from-slate-900 dark:to-slate-800"
        style={{
          background:
            'radial-gradient(circle at 50% 50%, rgba(6, 182, 212, 0.05) 0%, transparent 50%)',
        }}
      />
      {/* Debug overlay */}
      <div className="absolute top-4 right-4 flex flex-col gap-2 pointer-events-none">
        <div className="bg-background/90 backdrop-blur-sm border rounded-lg p-2 shadow-sm pointer-events-auto">
          <div className="flex justify-between items-center mb-1 gap-2">
            <div className="text-xs font-medium text-muted-foreground">
              Canvas + Worker
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
            {debugMode && (
              <>
                <div className="border-t my-1 pt-1 border-muted" />
                <div className="font-mono text-[10px]">FPS: {fps}</div>
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}

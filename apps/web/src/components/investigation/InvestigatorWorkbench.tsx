/* eslint-disable @typescript-eslint/ban-ts-comment */
// @ts-nocheck
import React, { useState, useRef, useCallback, useMemo, useEffect } from 'react'
import { GraphCanvas, GraphCanvasRef } from '@/graphs/GraphCanvas'
import { Button } from '@/components/ui/Button'
import { Slider } from '@/components/ui/slider'
import type { Entity, Relationship, GraphLayout } from '@/types'

// Mock data for initial state
const INITIAL_ENTITIES: Entity[] = [
  {
    id: 'e1',
    name: 'John Doe',
    type: 'PERSON',
    confidence: 0.9,
    properties: {},
    createdAt: '2023-01-01T00:00:00Z',
    updatedAt: '2023-01-01T00:00:00Z',
  },
  {
    id: 'e2',
    name: 'Acme Corp',
    type: 'ORGANIZATION',
    confidence: 0.95,
    properties: {},
    createdAt: '2023-02-01T00:00:00Z',
    updatedAt: '2023-02-01T00:00:00Z',
  },
  {
    id: 'e3',
    name: 'Jane Smith',
    type: 'PERSON',
    confidence: 0.8,
    properties: {},
    createdAt: '2023-03-01T00:00:00Z',
    updatedAt: '2023-03-01T00:00:00Z',
  },
]

const INITIAL_RELATIONSHIPS: Relationship[] = [
  {
    id: 'r1',
    sourceId: 'e1',
    targetId: 'e2',
    type: 'WORKS_FOR',
    confidence: 0.8,
    properties: {},
    createdAt: '2023-02-15T00:00:00Z',
    direction: 'directed',
  },
  {
    id: 'r2',
    sourceId: 'e3',
    targetId: 'e2',
    type: 'WORKS_FOR',
    confidence: 0.9,
    properties: {},
    createdAt: '2023-03-15T00:00:00Z',
    direction: 'directed',
  },
]

const ENTITY_TYPES = [
  { type: 'PERSON', label: 'Person', icon: '👤' },
  { type: 'ORGANIZATION', label: 'Organization', icon: '🏢' },
  { type: 'LOCATION', label: 'Location', icon: '📍' },
  { type: 'IP_ADDRESS', label: 'IP Address', icon: '🌐' },
  { type: 'DOMAIN', label: 'Domain', icon: '🔗' },
  { type: 'EMAIL', label: 'Email', icon: '📧' },
]

export function InvestigatorWorkbench() {
  const [entities, setEntities] = useState<Entity[]>(INITIAL_ENTITIES)
  const [relationships, setRelationships] = useState<Relationship[]>(INITIAL_RELATIONSHIPS)
  const [layout] = useState<GraphLayout>({ type: 'force', settings: {} })
  const [selectedEntityId, setSelectedEntityId] = useState<string | undefined>()
  const [timeRange, setTimeRange] = useState<number[]>([0, 100])

  const graphRef = useRef<GraphCanvasRef>(null)

  // Use a constant for current time to avoid purity issues in useMemo
  // In a real app, this might come from a prop or context
  const [now] = useState(() => Date.now())

  const dateRange = useMemo(() => {
    const dates = [...entities, ...relationships].map(item => new Date(item.createdAt).getTime())
    if (dates.length === 0) return { min: now, max: now }
    return {
      min: Math.min(...dates),
      max: Math.max(...dates)
    }
  }, [entities, relationships, now])

  const filteredData = useMemo(() => {
    const minTime = dateRange.min
    const maxTime = dateRange.max
    const totalDuration = maxTime - minTime || 1

    const startTimestamp = minTime + (timeRange[0] / 100) * totalDuration
    const endTimestamp = minTime + (timeRange[1] / 100) * totalDuration

    const filteredEntities = entities.filter(e => {
      const t = new Date(e.createdAt).getTime()
      return t >= startTimestamp && t <= endTimestamp
    })

    const filteredEntityIds = new Set(filteredEntities.map(e => e.id))

    const filteredRelationships = relationships.filter(r => {
      const t = new Date(r.createdAt).getTime()
      return t >= startTimestamp && t <= endTimestamp &&
             filteredEntityIds.has(r.sourceId) && filteredEntityIds.has(r.targetId)
    })

    return { entities: filteredEntities, relationships: filteredRelationships }
  }, [entities, relationships, timeRange, dateRange])


  const handleEntitySelect = useCallback((entity: Entity) => {
    setSelectedEntityId(entity.id)
  }, [])

  const handleNodeDrop = useCallback((type: string, _x: number, _y: number) => {
    const newEntity: Entity = {
      id: `e-${Date.now()}`,
      name: `New ${type}`,
      type: type as any,
      confidence: 1.0,
      properties: {},
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    }
    setEntities(prev => [...prev, newEntity])
    setTimeRange([0, 100])
  }, [])

  const handleLinkCreate = useCallback((sourceId: string, targetId: string) => {
    const exists = relationships.some(
      r => (r.sourceId === sourceId && r.targetId === targetId) ||
           (r.sourceId === targetId && r.targetId === sourceId)
    )
    if (exists) return

    const newRelationship: Relationship = {
      id: `r-${Date.now()}`,
      sourceId,
      targetId,
      type: 'RELATED_TO',
      confidence: 1.0,
      properties: {},
      createdAt: new Date().toISOString(),
      direction: 'directed'
    }
    setRelationships(prev => [...prev, newRelationship])
    setTimeRange([0, 100])
  }, [relationships])

  const formatDate = (ts: number) => new Date(ts).toLocaleDateString()

  const handleExportPNG = async () => {
    if (!graphRef.current) return
    const blob = await graphRef.current.exportAsPNG()
    if (blob) {
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `investigation-${new Date().toISOString()}.png`
      a.click()
      URL.revokeObjectURL(url)
    }
  }

  const handleExportSVG = () => {
    if (!graphRef.current) return
    const svgString = graphRef.current.exportAsSVG()
    if (svgString) {
      const blob = new Blob([svgString], { type: 'image/svg+xml;charset=utf-8' })
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `investigation-${new Date().toISOString()}.svg`
      a.click()
      URL.revokeObjectURL(url)
    }
  }

  const handleExportJSON = () => {
    if (!graphRef.current) return
    const json = graphRef.current.exportAsJSON()
    const blob = new Blob([json], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `investigation-${new Date().toISOString()}.json`
    a.click()
    URL.revokeObjectURL(url)
  }

  // Keyboard Shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Delete selected entity
      if ((e.key === 'Delete' || e.key === 'Backspace') && selectedEntityId) {
        setEntities(prev => prev.filter(e => e.id !== selectedEntityId))
        setRelationships(prev => prev.filter(r => r.sourceId !== selectedEntityId && r.targetId !== selectedEntityId))
        setSelectedEntityId(undefined)
      }

      // Escape to deselect
      if (e.key === 'Escape') {
        setSelectedEntityId(undefined)
      }
    }

    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [selectedEntityId])

  return (
    <div className="flex h-screen w-full bg-background overflow-hidden" data-testid="investigator-workbench">
      {/* Sidebar: Entity Palette */}
      <div
        className="w-72 border-r border-border bg-card flex flex-col overflow-hidden"
        role="complementary"
        aria-label="Tools and Palette"
      >
        <div className="p-4 border-b border-border bg-background/50">
          <h2 className="text-sm font-bold uppercase tracking-widest text-muted-foreground">Orchestration Palette</h2>
        </div>

        <div className="flex-1 overflow-y-auto p-4 space-y-6">
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="text-xs font-bold uppercase tracking-wider">Entity Primitives</h3>
              <span className="text-[10px] mono-data text-muted-foreground">6 TYPES</span>
            </div>
            <div className="grid grid-cols-2 gap-1" role="list" aria-label="Draggable entities">
              {ENTITY_TYPES.map(et => (
                <div
                  key={et.type}
                  className="group relative p-3 border border-border bg-background text-[10px] font-bold uppercase tracking-tight cursor-move flex flex-col items-center gap-2 hover:border-primary hover:bg-accent transition-all focus:outline-none focus:ring-1 focus:ring-ring"
                  draggable
                  tabIndex={0}
                  role="listitem"
                  aria-label={`Drag ${et.label}`}
                  onDragStart={(e) => {
                    e.dataTransfer.setData('application/intelgraph-entity', et.type)
                  }}
                >
                  <span className="text-xl group-hover:scale-110 transition-transform">{et.icon}</span>
                  <span className="truncate w-full text-center">{et.label}</span>
                </div>
              ))}
            </div>
          </div>

          <div className="space-y-3 pt-4 border-t border-border">
            <h3 className="text-xs font-bold uppercase tracking-wider">Operational Intel</h3>
            <div className="space-y-1">
              <div className="flex justify-between text-[10px] mono-data py-1 border-b border-border/50">
                <span className="text-muted-foreground uppercase">Active Entities</span>
                <span>{entities.length}</span>
              </div>
              <div className="flex justify-between text-[10px] mono-data py-1 border-b border-border/50">
                <span className="text-muted-foreground uppercase">Relational Density</span>
                <span>{(entities.length > 1 ? (2 * relationships.length) / (entities.length * (entities.length - 1)) : 0).toFixed(4)}</span>
              </div>
              <div className="flex justify-between text-[10px] mono-data py-1">
                <span className="text-muted-foreground uppercase">Confidence Baseline</span>
                <span className="text-green-500">88.4%</span>
              </div>
            </div>
          </div>
        </div>

        <div className="p-4 bg-muted/30 border-t border-border mt-auto">
             <h3 className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground mb-2">Command Grammar</h3>
             <ul className="text-[10px] text-muted-foreground space-y-1 font-medium">
                 <li className="flex items-center gap-2"><span className="w-1 h-1 bg-primary"></span> DRAG primitives to canvas</li>
                 <li className="flex items-center gap-2"><span className="w-1 h-1 bg-primary"></span> SHIFT+DRAG to establish link</li>
                 <li className="flex items-center gap-2"><span className="w-1 h-1 bg-primary"></span> DEL to purge selection</li>
             </ul>
        </div>
      </div>

      {/* Main Content: Canvas */}
      <div className="flex-1 flex flex-col relative" role="main">
        <div className="flex-1 relative bg-background" aria-label="Graph Canvas">
           <GraphCanvas
              ref={graphRef}
              entities={filteredData.entities}
              relationships={filteredData.relationships}
              layout={layout}
              onEntitySelect={handleEntitySelect}
              selectedEntityId={selectedEntityId}
              onNodeDrop={handleNodeDrop}
              onLinkCreate={handleLinkCreate}
              className="w-full h-full"
           />
        </div>

        {/* Bottom Control Panel: Timeline */}
        <div
          className="h-24 border-t border-border bg-card flex flex-col overflow-hidden"
          role="region"
          aria-label="Timeline Controls"
        >
           <div className="flex items-center px-4 h-10 border-b border-border bg-background/50">
              <h3 className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground flex-1">Temporal Extraction Slicer</h3>
              <div className="flex gap-1">
                  <Button variant="ghost" size="xs" className="h-6 text-[10px] font-bold border border-border" onClick={handleExportPNG}>PNG</Button>
                  <Button variant="ghost" size="xs" className="h-6 text-[10px] font-bold border border-border" onClick={handleExportSVG}>SVG</Button>
                  <Button variant="ghost" size="xs" className="h-6 text-[10px] font-bold border border-border" onClick={handleExportJSON}>JSON</Button>
              </div>
           </div>
           <div className="px-6 py-2">
             <Slider
               value={timeRange}
               onValueChange={setTimeRange}
               max={100}
               step={1}
               className="w-full"
               aria-label="Time Range Filter"
             />
             <div className="flex justify-between text-[10px] mono-data font-bold uppercase tracking-tighter text-muted-foreground mt-1">
               <span className="bg-background px-1 border border-border/50">
                 {formatDate(dateRange.min + (timeRange[0] / 100) * (dateRange.max - dateRange.min))}
               </span>
               <div className="h-px flex-1 bg-border/30 self-center mx-4" />
               <span className="bg-background px-1 border border-border/50">
                 {formatDate(dateRange.min + (timeRange[1] / 100) * (dateRange.max - dateRange.min))}
               </span>
             </div>
           </div>
        </div>
      </div>
    </div>
  )
}

/* eslint-disable @typescript-eslint/ban-ts-comment */
// @ts-nocheck
import React, { useState, useRef, useCallback, useMemo, useEffect } from 'react'
import { GraphCanvas, GraphCanvasRef } from '@/graphs/GraphCanvas'
import { Button } from '@/components/ui/Button'
import { Slider } from '@/components/ui/Slider'
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
        className="w-64 border-r bg-card p-4 flex flex-col gap-4"
        role="complementary"
        aria-label="Tools and Palette"
      >
        <h2 className="text-lg font-semibold">Workbench</h2>
        <div className="space-y-2">
          <h3 className="text-sm font-medium text-muted-foreground">Entity Palette</h3>
          <p className="text-xs text-muted-foreground mb-2">Drag to canvas to add</p>
          <div className="grid grid-cols-2 gap-2" role="list" aria-label="Draggable entities">
            {ENTITY_TYPES.map(et => (
              <div
                key={et.type}
                className="p-2 border rounded bg-muted text-xs cursor-move flex flex-col items-center gap-1 hover:bg-muted/80 transition-colors focus:outline-none focus:ring-2 focus:ring-ring"
                draggable
                tabIndex={0}
                role="listitem"
                aria-label={`Drag ${et.label}`}
                onDragStart={(e) => {
                  e.dataTransfer.setData('application/intelgraph-entity', et.type)
                }}
                onKeyDown={(e) => {
                   if (e.key === 'Enter' || e.key === ' ') {
                       // Accessibility enhancement: Simulate drop or add to center (would need implementation)
                   }
                }}
              >
                <span className="text-lg">{et.icon}</span>
                <span>{et.label}</span>
              </div>
            ))}
          </div>
        </div>

        <div className="space-y-2 mt-4">
             <h3 className="text-sm font-medium text-muted-foreground">Instructions</h3>
             <ul className="text-xs text-muted-foreground list-disc pl-4 space-y-1">
                 <li>Drag entities from palette to canvas</li>
                 <li>Shift + Drag from a node to link it to another</li>
                 <li>Click node to select</li>
                 <li>Delete/Backspace to remove selected node</li>
             </ul>
        </div>
      </div>

      {/* Main Content: Canvas */}
      <div className="flex-1 flex flex-col relative" role="main">
        <div className="flex-1 relative bg-slate-50 dark:bg-slate-900" aria-label="Graph Canvas">
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
          className="h-28 border-t bg-card p-4 flex flex-col gap-2"
          role="region"
          aria-label="Timeline Controls"
        >
           <div className="flex justify-between items-center">
              <h3 className="text-sm font-medium">Timeline Filter</h3>
              <div className="flex gap-2">
                  <Button variant="outline" size="sm" onClick={handleExportPNG}>Export PNG</Button>
                  <Button variant="outline" size="sm" onClick={handleExportSVG}>Export SVG</Button>
                  <Button variant="outline" size="sm" onClick={handleExportJSON}>Export JSON</Button>
              </div>
           </div>
           <div className="px-2">
             <Slider
               value={timeRange}
               onValueChange={setTimeRange}
               max={100}
               step={1}
               className="w-full"
               aria-label="Time Range Filter"
             />
             <div className="flex justify-between text-xs text-muted-foreground mt-2">
               <span>
                 {formatDate(dateRange.min + (timeRange[0] / 100) * (dateRange.max - dateRange.min))}
               </span>
               <span>
                 {formatDate(dateRange.min + (timeRange[1] / 100) * (dateRange.max - dateRange.min))}
               </span>
             </div>
           </div>
        </div>
      </div>
    </div>
  )
}

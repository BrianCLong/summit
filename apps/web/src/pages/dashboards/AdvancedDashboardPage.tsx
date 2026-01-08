// @ts-nocheck
import React, { useState, useEffect, useCallback } from 'react'
import {
  generateMockEntities,
  generateMockRelationships,
  generateMockTimelineEvents,
  generateMockGeospatialEvents,
} from '@/features/triPane'
import { CustomizableWidget } from '@/features/dashboard/widgets/CustomizableWidget'
import { RelationshipMatrixWidget } from '@/features/dashboard/widgets/RelationshipMatrixWidget'
import { GraphCanvas } from '@/graphs/GraphCanvas'
import { TimelineRail } from '@/components/panels/TimelineRail'
import { MapPane } from '@/panes/MapPane'
import {
  Entity,
  Relationship,
  TimelineEvent,
  GeospatialEvent,
  AlertSeverity,
} from '@/types'
import { Loader2, RefreshCw, Download, FileText } from 'lucide-react'
import { Button } from '@/components/ui/Button'
import { cn } from '@/lib/utils'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card'
import { Badge } from '@/components/ui/Badge'

export default function AdvancedDashboardPage() {
  const [loading, setLoading] = useState(true)
  const [data, setData] = useState<{
    entities: Entity[]
    relationships: Relationship[]
    timelineEvents: TimelineEvent[]
    geospatialEvents: GeospatialEvent[]
  }>({
    entities: [],
    relationships: [],
    timelineEvents: [],
    geospatialEvents: [],
  })

  // Dashboard State
  const [expandedWidget, setExpandedWidget] = useState<string | null>(null)
  const [visibleWidgets, setVisibleWidgets] = useState<Record<string, boolean>>(
    {
      graph: true,
      map: true,
      timeline: true,
      matrix: true,
      details: true,
    }
  )

  // Filtering & Interactivity State
  const [selectedEntityId, setSelectedEntityId] = useState<string | undefined>()
  const [timeWindow, setTimeWindow] = useState<
    { start: Date; end: Date } | undefined
  >()

  // Load Initial Data
  useEffect(() => {
    loadData()
  }, [])

  // Real-time update simulation
  useEffect(() => {
    const interval = setInterval(() => {
      if (data.entities.length > 0) {
        setData(prev => {
          // Simulate a new event and potential entity update
          if (Math.random() > 0.6) {
            const newEvent: TimelineEvent = {
              id: `evt-live-${Date.now()}`,
              timestamp: new Date().toISOString(),
              type: 'LIVE_UPDATE',
              title: 'New Signal Detected',
              description: 'Real-time telemetry update.',
              metadata: {},
            }

            // Occasionally update an entity's confidence or status to show graph reactivity
            const entities = [...prev.entities]
            if (entities.length > 0 && Math.random() > 0.5) {
              const idx = Math.floor(Math.random() * entities.length)
              entities[idx] = {
                ...entities[idx],
                confidence: Math.min(
                  1,
                  entities[idx].confidence +
                    (Math.random() > 0.5 ? 0.05 : -0.05)
                ),
              }
            }

            return {
              ...prev,
              entities,
              timelineEvents: [...prev.timelineEvents, newEvent],
            }
          }
          return prev
        })
      }
    }, 5000)
    return () => clearInterval(interval)
  }, [data.entities.length])

  const loadData = async () => {
    setLoading(true)
    // Simulate API
    await new Promise(resolve => setTimeout(resolve, 800))
    const entities = generateMockEntities(30)
    const relationships = generateMockRelationships(entities, 50)
    const timelineEvents = generateMockTimelineEvents(entities, 40)
    const geospatialEvents = generateMockGeospatialEvents(20)

    setData({ entities, relationships, timelineEvents, geospatialEvents })
    setLoading(false)
  }

  const toggleExpand = (id: string) => {
    setExpandedWidget(prev => (prev === id ? null : id))
  }

  const toggleVisibility = (id: string) => {
    setVisibleWidgets(prev => ({ ...prev, [id]: !prev[id] }))
  }

  const handleExportJson = () => {
    const exportData = {
      ...filteredData,
      exportedAt: new Date().toISOString(),
    }
    const blob = new Blob([JSON.stringify(exportData, null, 2)], {
      type: 'application/json',
    })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `dashboard-export-${Date.now()}.json`
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
    URL.revokeObjectURL(url)
  }

  const handleExportCsv = () => {
    // Simple CSV conversion for entities
    const headers = ['id', 'name', 'type', 'confidence', 'createdAt']
    const csvContent = [
      headers.join(','),
      ...filteredData.entities.map(e =>
        [e.id, `"${e.name}"`, e.type, e.confidence, e.createdAt].join(',')
      ),
    ].join('\n')

    const blob = new Blob([csvContent], { type: 'text/csv' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `dashboard-entities-${Date.now()}.csv`
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
    URL.revokeObjectURL(url)
  }

  // Filter Logic
  const filteredData = React.useMemo(() => {
    let { entities, relationships, timelineEvents, geospatialEvents } = data

    if (timeWindow) {
      const { start, end } = timeWindow

      // Filter events first
      timelineEvents = timelineEvents.filter(e => {
        const t = new Date(e.timestamp)
        return t >= start && t <= end
      })

      geospatialEvents = geospatialEvents.filter(e => {
        const t = new Date(e.timestamp)
        return t >= start && t <= end
      })

      // Identify active entities in this window
      // 1. Entities mentioned in timeline events
      // 2. Entities mentioned in geospatial events
      // 3. Or entities created/updated in this window (if we had that data consistent)
      const activeEntityIds = new Set<string>()
      timelineEvents.forEach(e => {
        if (e.entityId) activeEntityIds.add(e.entityId)
      })

      // Also include entities connected to active entities?
      // For strict filtering, we only show entities involved in the window.
      // But for context, we might want their neighbors. Let's stick to strict + neighbors?
      // Or just strict "Active in window". Let's do Active + their direct relationships.

      // Let's filter entities to only those who have events OR are connected to those who have events?
      // Simple approach: Filter entities that have NO events in this window?
      // Actually, standard drill down is: Time Window selects Events -> Events select Entities.

      if (activeEntityIds.size > 0) {
        entities = entities.filter(e => activeEntityIds.has(e.id))
        const visibleIds = new Set(entities.map(e => e.id))
        relationships = relationships.filter(
          r => visibleIds.has(r.sourceId) && visibleIds.has(r.targetId)
        )
      }
    }

    return { entities, relationships, timelineEvents, geospatialEvents }
  }, [data, timeWindow])

  const selectedEntity = React.useMemo(() => {
    return data.entities.find(e => e.id === selectedEntityId)
  }, [data.entities, selectedEntityId])

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full">
        <Loader2 className="h-8 w-8 animate-spin" />
        <span className="ml-2">Initializing Dashboard...</span>
      </div>
    )
  }

  return (
    <div className="h-full flex flex-col p-4 space-y-4 bg-muted/10 overflow-hidden">
      {/* Header / Toolbar */}
      <div className="flex justify-between items-center bg-background p-3 rounded-lg border shadow-sm shrink-0">
        <div className="flex items-center gap-4">
          <h1 className="text-xl font-bold bg-gradient-to-r from-primary to-blue-600 bg-clip-text text-transparent">
            Summit Advanced Dashboard
          </h1>
          {timeWindow && (
            <Badge variant="outline" className="text-xs">
              Time Filter Active
            </Badge>
          )}
        </div>
        <div className="flex items-center gap-2">
          <div className="flex gap-1">
            <Button
              variant="outline"
              size="sm"
              onClick={handleExportJson}
              title="Export JSON"
            >
              <Download className="h-4 w-4 mr-1" /> JSON
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={handleExportCsv}
              title="Export CSV"
            >
              <FileText className="h-4 w-4 mr-1" /> CSV
            </Button>
          </div>
          <Button variant="outline" size="sm" onClick={() => loadData()}>
            <RefreshCw className="h-4 w-4 mr-1" /> Refresh
          </Button>
          <div className="flex gap-1 ml-4 border-l pl-4">
            {Object.keys(visibleWidgets).map(key => (
              <Button
                key={key}
                variant={visibleWidgets[key] ? 'default' : 'ghost'}
                size="xs"
                onClick={() => toggleVisibility(key)}
                className="capitalize text-xs h-7"
              >
                {key}
              </Button>
            ))}
          </div>
        </div>
      </div>

      {/* Grid Layout */}
      <div
        className={cn(
          'grid gap-4 flex-1 min-h-0 transition-all',
          expandedWidget
            ? 'grid-cols-1 grid-rows-1'
            : 'grid-cols-1 md:grid-cols-2 lg:grid-cols-12 lg:grid-rows-2'
        )}
      >
        {/* Graph Widget */}
        {visibleWidgets.graph && (
          <div
            className={cn(
              expandedWidget === 'graph'
                ? 'fixed inset-4 z-50 shadow-2xl bg-background rounded-lg border'
                : 'lg:col-span-8 lg:row-span-2 md:col-span-1',
              !expandedWidget && !visibleWidgets.graph && 'hidden'
            )}
          >
            <CustomizableWidget
              title="Network Intelligence Graph"
              isExpanded={expandedWidget === 'graph'}
              onToggleExpand={() => toggleExpand('graph')}
              onClose={() => toggleVisibility('graph')}
              className="h-full"
            >
              <GraphCanvas
                entities={filteredData.entities}
                relationships={filteredData.relationships}
                selectedEntityId={selectedEntityId}
                onEntitySelect={e => setSelectedEntityId(e.id)}
                layout={{ type: 'force', settings: {} }}
                className="bg-background/50"
              />
            </CustomizableWidget>
          </div>
        )}

        {/* Map Widget */}
        {visibleWidgets.map && (
          <div
            className={cn(
              expandedWidget === 'map'
                ? 'fixed inset-4 z-50 shadow-2xl bg-background rounded-lg border'
                : 'lg:col-span-4 lg:row-span-1 md:col-span-1',
              !expandedWidget && !visibleWidgets.map && 'hidden'
            )}
          >
            <CustomizableWidget
              title="Geospatial Analysis"
              isExpanded={expandedWidget === 'map'}
              onToggleExpand={() => toggleExpand('map')}
              onClose={() => toggleVisibility('map')}
              className="h-full"
            >
              <MapPane
                locations={filteredData.geospatialEvents}
                center={[0, 0]}
                zoom={1}
              />
            </CustomizableWidget>
          </div>
        )}

        {/* Relationship Matrix Widget */}
        {visibleWidgets.matrix && (
          <div
            className={cn(
              expandedWidget === 'matrix'
                ? 'fixed inset-4 z-50 shadow-2xl bg-background rounded-lg border'
                : 'lg:col-span-4 lg:row-span-1 md:col-span-1',
              !expandedWidget && !visibleWidgets.matrix && 'hidden'
            )}
          >
            <CustomizableWidget
              title="Relationship Matrix"
              isExpanded={expandedWidget === 'matrix'}
              onToggleExpand={() => toggleExpand('matrix')}
              onClose={() => toggleVisibility('matrix')}
              className="h-full"
            >
              <RelationshipMatrixWidget
                entities={filteredData.entities}
                relationships={filteredData.relationships}
                onCellClick={(s, t, rels) => {
                  setSelectedEntityId(s.id) // Select source
                }}
              />
            </CustomizableWidget>
          </div>
        )}
      </div>

      {/* Details & Timeline Row */}
      <div
        className={cn(
          'grid gap-4 shrink-0 h-48',
          expandedWidget ? 'hidden' : 'grid-cols-1 lg:grid-cols-12'
        )}
      >
        {/* Timeline Widget (Bottom Rail) */}
        {visibleWidgets.timeline && (
          <div
            className={cn(
              'h-full',
              visibleWidgets.details ? 'lg:col-span-9' : 'lg:col-span-12'
            )}
          >
            <CustomizableWidget
              title="Temporal Analysis"
              isExpanded={false}
              onClose={() => toggleVisibility('timeline')}
              className="h-full"
            >
              <TimelineRail
                data={filteredData.timelineEvents}
                onTimeRangeChange={range =>
                  setTimeWindow({
                    start: new Date(range.start),
                    end: new Date(range.end),
                  })
                }
                className="border-0"
              />
            </CustomizableWidget>
          </div>
        )}

        {/* Entity Details Widget */}
        {visibleWidgets.details && (
          <div
            className={cn(
              'h-full',
              visibleWidgets.timeline ? 'lg:col-span-3' : 'lg:col-span-12'
            )}
          >
            <CustomizableWidget
              title="Details"
              onClose={() => toggleVisibility('details')}
              className="h-full"
            >
              {selectedEntity ? (
                <div className="p-4 space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-lg">
                      {selectedEntity.name}
                    </span>
                    <Badge>{selectedEntity.type}</Badge>
                  </div>
                  <div className="text-sm text-muted-foreground grid grid-cols-2 gap-2">
                    <div>Confidence:</div>
                    <div>{(selectedEntity.confidence * 100).toFixed(0)}%</div>
                    <div>ID:</div>
                    <div className="truncate" title={selectedEntity.id}>
                      {selectedEntity.id}
                    </div>
                  </div>
                  <div className="pt-2">
                    <Button size="sm" variant="secondary" className="w-full">
                      View Full Profile
                    </Button>
                  </div>
                </div>
              ) : (
                <div className="flex flex-col items-center justify-center h-full text-muted-foreground p-4 text-center">
                  <FileText className="h-8 w-8 mb-2 opacity-50" />
                  <p className="text-sm">Select an entity to view details</p>
                </div>
              )}
            </CustomizableWidget>
          </div>
        )}
      </div>
    </div>
  )
}

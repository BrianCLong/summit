import React, { useState, useEffect } from 'react'
import { EnhancedTriPaneView } from '@/components/tri-pane'
import { Button } from '@/components/ui/Button'
import { Badge } from '@/components/ui/Badge'
import { useEntities } from '@/hooks/useGraphQL'
import { isEnhancedTriPaneEnabled } from '@/lib/flags'
import { ArrowLeft, Info } from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import mockData from '@/mock/data.json'
import type {
  Entity,
  Relationship,
  TimelineEvent,
  GeospatialEvent,
} from '@/types'

/**
 * TriPaneDemoPage - Demonstration page for the Enhanced Tri-Pane View
 *
 * This page showcases the new tri-pane analyst experience with:
 * - Synchronized timeline, graph, and map views
 * - "Explain This View" sidebar
 * - XAI overlays and provenance tracking
 * - Full keyboard navigation
 * - Accessibility features
 */
export default function TriPaneDemoPage() {
  const navigate = useNavigate()
  const { data: entitiesData, loading: entitiesLoading } = useEntities()

  const [entities, setEntities] = useState<Entity[]>([])
  const [relationships, setRelationships] = useState<Relationship[]>([])
  const [timelineEvents, setTimelineEvents] = useState<TimelineEvent[]>([])
  const [geospatialEvents, setGeospatialEvents] = useState<GeospatialEvent[]>([])
  const [loading, setLoading] = useState(true)

  // Load demo data
  useEffect(() => {
    const loadData = async () => {
      try {
        setLoading(true)

        // Use GraphQL data if available, otherwise use mock data
        if (entitiesData?.entities) {
          setEntities(entitiesData.entities)
          // Derive relationships and events from real data
          // For demo, we'll still use mock data for relationships and events
          setRelationships(mockData.relationships as Relationship[])
          setTimelineEvents(mockData.timelineEvents as TimelineEvent[])
          setGeospatialEvents(generateGeospatialEvents(entitiesData.entities))
        } else {
          // Load mock data for demonstration
          await new Promise(resolve => setTimeout(resolve, 500))
          setEntities(mockData.entities as Entity[])
          setRelationships(mockData.relationships as Relationship[])
          setTimelineEvents(mockData.timelineEvents as TimelineEvent[])
          setGeospatialEvents(generateGeospatialEvents(mockData.entities))
        }
      } finally {
        setLoading(false)
      }
    }

    loadData()
  }, [entitiesData])

  // Generate sample geospatial events from location entities
  const generateGeospatialEvents = (entities: any[]): GeospatialEvent[] => {
    return entities
      .filter(e => e.type === 'LOCATION')
      .map((entity, index) => ({
        id: `geo-${entity.id}`,
        entityId: entity.id,
        latitude: 40 + (Math.random() - 0.5) * 20, // Random lat around 40°N
        longitude: -100 + (Math.random() - 0.5) * 40, // Random lng around 100°W
        timestamp: new Date(
          Date.now() - Math.random() * 7 * 24 * 60 * 60 * 1000
        ).toISOString(),
        type: 'location_event',
        properties: {
          name: entity.name,
          entityType: entity.type,
        },
      }))
  }

  const handleEntitySelect = (entity: Entity) => {
    console.log('Entity selected:', entity)
  }

  const handleTimeRangeChange = (range: { start: Date; end: Date }) => {
    console.log('Time range changed:', range)
  }

  const handleExport = () => {
    console.log('Exporting view...')
    // Implement export logic
    const data = {
      entities,
      relationships,
      timelineEvents,
      geospatialEvents,
      timestamp: new Date().toISOString(),
    }
    const blob = new Blob([JSON.stringify(data, null, 2)], {
      type: 'application/json',
    })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `tri-pane-export-${Date.now()}.json`
    a.click()
    URL.revokeObjectURL(url)
  }

  // Check if feature is enabled
  if (!isEnhancedTriPaneEnabled()) {
    return (
      <div className="flex items-center justify-center h-screen bg-background">
        <div className="text-center space-y-4 max-w-md p-6">
          <div className="text-6xl">🔒</div>
          <h1 className="text-2xl font-bold">Feature Not Enabled</h1>
          <p className="text-muted-foreground">
            The Enhanced Tri-Pane View is currently disabled. Enable it by
            setting the feature flag:
          </p>
          <code className="block bg-muted p-3 rounded text-sm">
            VITE_ENHANCED_TRI_PANE_ENABLED=true
          </code>
          <Button onClick={() => navigate('/explore')}>
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Explore
          </Button>
        </div>
      </div>
    )
  }

  if (loading || entitiesLoading) {
    return (
      <div className="flex items-center justify-center h-screen bg-background">
        <div className="text-center space-y-4">
          <div className="animate-spin h-8 w-8 border-4 border-primary border-t-transparent rounded-full mx-auto" />
          <p className="text-muted-foreground">Loading tri-pane view...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="h-screen flex flex-col bg-background">
      {/* Header */}
      <div className="border-b bg-background p-4 flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => navigate('/explore')}
          >
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back
          </Button>
          <div>
            <h1 className="text-xl font-bold">
              Enhanced Tri-Pane Analysis Demo
            </h1>
            <p className="text-sm text-muted-foreground">
              Synchronized timeline, graph, and map views with XAI explanations
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Badge variant="secondary" className="flex items-center gap-1">
            <Info className="h-3 w-3" />
            Demo Mode
          </Badge>
        </div>
      </div>

      {/* Tri-Pane View */}
      <div className="flex-1 p-4 overflow-hidden">
        <EnhancedTriPaneView
          entities={entities}
          relationships={relationships}
          timelineEvents={timelineEvents}
          geospatialEvents={geospatialEvents}
          onEntitySelect={handleEntitySelect}
          onTimeRangeChange={handleTimeRangeChange}
          onExport={handleExport}
          className="h-full"
        />
      </div>

      {/* Footer Help */}
      <div className="border-t bg-muted/30 p-2 text-xs text-muted-foreground text-center">
        <span className="font-medium">Keyboard Shortcuts:</span> ⌘1 (Timeline) |
        ⌘2 (Graph) | ⌘3 (Map) | P (Provenance) | X (XAI) | Esc (Clear Focus)
      </div>
    </div>
  )
}

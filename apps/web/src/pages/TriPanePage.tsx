/**
 * Tri-Pane Analysis Page
 *
 * This page component provides the route-level integration for the
 * tri-pane analysis shell. It handles data loading and provides
 * the shell with mock data (or real data from a provider).
 */

import React, { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { TriPaneShell } from '@/features/triPane'
import {
  generateMockEntities,
  generateMockRelationships,
  generateMockTimelineEvents,
  generateMockGeospatialEvents,
} from '@/features/triPane'
import type {
  Entity,
  Relationship,
  TimelineEvent,
  GeospatialEvent,
} from '@/types'
import type { TriPaneSyncState } from '@/features/triPane'
import { Loader2 } from 'lucide-react'

/**
 * TriPanePage component
 *
 * This page loads mock data and renders the TriPaneShell.
 * Future teams can replace the mock data loading with real API calls.
 */
export default function TriPanePage() {
  const navigate = useNavigate()
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<Error | null>(null)

  // Data state
  const [entities, setEntities] = useState<Entity[]>([])
  const [relationships, setRelationships] = useState<Relationship[]>([])
  const [timelineEvents, setTimelineEvents] = useState<TimelineEvent[]>([])
  const [geospatialEvents, setGeospatialEvents] = useState<GeospatialEvent[]>(
    []
  )

  // Load mock data on mount
  useEffect(() => {
    const loadData = async () => {
      try {
        setLoading(true)

        // Simulate API delay
        await new Promise(resolve => setTimeout(resolve, 500))

        // Generate mock data
        const mockEntities = generateMockEntities(25)
        const mockRelationships = generateMockRelationships(mockEntities, 40)
        const mockTimelineEvents = generateMockTimelineEvents(mockEntities, 60)
        const mockGeospatialEvents = generateMockGeospatialEvents(30)

        setEntities(mockEntities)
        setRelationships(mockRelationships)
        setTimelineEvents(mockTimelineEvents)
        setGeospatialEvents(mockGeospatialEvents)
      } catch (err) {
        setError(
          err instanceof Error ? err : new Error('Failed to load data')
        )
      } finally {
        setLoading(false)
      }
    }

    loadData()
  }, [])

  // Handle entity selection
  const handleEntitySelect = (entity: Entity) => {
    console.log('Entity selected:', entity)
    // Future: Navigate to entity detail page or show drawer
  }

  // Handle timeline event selection
  const handleEventSelect = (event: TimelineEvent) => {
    console.log('Event selected:', event)
    // Future: Show event details or navigate to related page
  }

  // Handle location selection
  const handleLocationSelect = (locationId: string) => {
    console.log('Location selected:', locationId)
    // Future: Show location details or filter by location
  }

  // Handle sync state changes (for debugging or persistence)
  const handleSyncStateChange = (state: TriPaneSyncState) => {
    console.log('Sync state changed:', state)
    // Future: Persist state to URL or localStorage
  }

  // Handle export
  const handleExport = () => {
    console.log('Exporting data...')

    // Create export data
    const exportData = {
      entities,
      relationships,
      timelineEvents,
      geospatialEvents,
      exportedAt: new Date().toISOString(),
    }

    // Download as JSON
    const blob = new Blob([JSON.stringify(exportData, null, 2)], {
      type: 'application/json',
    })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `tri-pane-export-${Date.now()}.json`
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
    URL.revokeObjectURL(url)
  }

  // Loading state
  if (loading) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="text-center space-y-4">
          <Loader2 className="h-12 w-12 animate-spin mx-auto text-primary" />
          <p className="text-lg font-medium">Loading tri-pane analysis...</p>
          <p className="text-sm text-muted-foreground">
            Preparing graph, timeline, and map data
          </p>
        </div>
      </div>
    )
  }

  // Error state
  if (error) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="text-center space-y-4 max-w-md">
          <div className="text-6xl">⚠️</div>
          <h1 className="text-2xl font-bold text-destructive">
            Failed to Load Data
          </h1>
          <p className="text-muted-foreground">{error.message}</p>
          <button
            onClick={() => window.location.reload()}
            className="px-4 py-2 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90"
          >
            Retry
          </button>
        </div>
      </div>
    )
  }

  // Main render
  return (
    <div className="h-full p-6">
      <TriPaneShell
        entities={entities}
        relationships={relationships}
        timelineEvents={timelineEvents}
        geospatialEvents={geospatialEvents}
        onEntitySelect={handleEntitySelect}
        onEventSelect={handleEventSelect}
        onLocationSelect={handleLocationSelect}
        onSyncStateChange={handleSyncStateChange}
        onExport={handleExport}
        showProvenanceOverlay={true}
        className="h-full"
      />
    </div>
  )
}

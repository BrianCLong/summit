/**
 * Tri-Pane Analysis Page
 *
 * This page component provides the route-level integration for the
 * tri-pane analysis shell. It handles data loading and provides
 * the shell with mock data (or real data from a provider).
 */

import React, { useState, useEffect, useCallback, useMemo } from 'react'
import {
  TriPaneShell,
  TriPaneErrorBoundary,
  TriPaneSkeleton,
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
import { AlertTriangle, RefreshCw } from 'lucide-react'
import { Button } from '@/components/ui/Button'

interface DataState {
  entities: Entity[]
  relationships: Relationship[]
  timelineEvents: TimelineEvent[]
  geospatialEvents: GeospatialEvent[]
}

/**
 * TriPanePage component
 *
 * This page loads mock data and renders the TriPaneShell.
 * Future teams can replace the mock data loading with real API calls.
 */
export default function TriPanePage() {
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<Error | null>(null)
  const [data, setData] = useState<DataState | null>(null)

  // Load data function - memoized to prevent unnecessary recreations
  const loadData = useCallback(async () => {
    try {
      setLoading(true)
      setError(null)

      // Simulate API delay for realistic loading experience
      await new Promise(resolve => setTimeout(resolve, 300))

      // Generate mock data with optimized counts
      const mockEntities = generateMockEntities(25)
      const mockRelationships = generateMockRelationships(mockEntities, 40)
      const mockTimelineEvents = generateMockTimelineEvents(mockEntities, 60)
      const mockGeospatialEvents = generateMockGeospatialEvents(30)

      setData({
        entities: mockEntities,
        relationships: mockRelationships,
        timelineEvents: mockTimelineEvents,
        geospatialEvents: mockGeospatialEvents,
      })
    } catch (err) {
      setError(err instanceof Error ? err : new Error('Failed to load data'))
    } finally {
      setLoading(false)
    }
  }, [])

  // Load data on mount
  useEffect(() => {
    loadData()
  }, [loadData])

  // Memoized callbacks to prevent unnecessary re-renders
  const handleEntitySelect = useCallback((entity: Entity) => {
    // Future: Navigate to entity detail page or show drawer
    console.debug('[TriPane] Entity selected:', entity.id, entity.name)
  }, [])

  const handleEventSelect = useCallback((event: TimelineEvent) => {
    // Future: Show event details or navigate to related page
    console.debug('[TriPane] Event selected:', event.id, event.title)
  }, [])

  const handleLocationSelect = useCallback((locationId: string) => {
    // Future: Show location details or filter by location
    console.debug('[TriPane] Location selected:', locationId)
  }, [])

  const handleSyncStateChange = useCallback((state: TriPaneSyncState) => {
    // Future: Persist state to URL or localStorage for deep linking
    console.debug('[TriPane] Sync state updated')
  }, [])

  // Memoized export handler
  const handleExport = useCallback(() => {
    if (!data) return

    const exportData = {
      ...data,
      exportedAt: new Date().toISOString(),
      version: '1.0.0',
    }

    const blob = new Blob([JSON.stringify(exportData, null, 2)], {
      type: 'application/json',
    })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `tri-pane-export-${new Date().toISOString().split('T')[0]}.json`
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
    URL.revokeObjectURL(url)
  }, [data])

  // Memoized error handler for boundary
  const handleBoundaryError = useCallback(
    (error: Error, errorInfo: React.ErrorInfo) => {
      console.error('[TriPane] Component error:', error, errorInfo)
      // Future: Send to error monitoring service
    },
    []
  )

  // Loading state with skeleton
  if (loading) {
    return (
      <div className="h-full p-6">
        <TriPaneSkeleton className="h-full" />
      </div>
    )
  }

  // Error state
  if (error) {
    return (
      <div className="flex items-center justify-center h-full p-6">
        <div
          className="text-center space-y-4 max-w-md"
          role="alert"
          aria-live="assertive"
        >
          <AlertTriangle className="h-16 w-16 mx-auto text-destructive" />
          <h1 className="text-2xl font-bold text-destructive">
            Failed to Load Data
          </h1>
          <p className="text-muted-foreground">{error.message}</p>
          <Button onClick={loadData} variant="default" className="gap-2">
            <RefreshCw className="h-4 w-4" />
            Retry
          </Button>
        </div>
      </div>
    )
  }

  // No data state (shouldn't happen, but handle defensively)
  if (!data) {
    return (
      <div className="flex items-center justify-center h-full p-6">
        <div className="text-center space-y-4">
          <p className="text-lg text-muted-foreground">No data available</p>
          <Button onClick={loadData} variant="outline">
            Load Data
          </Button>
        </div>
      </div>
    )
  }

  // Main render with error boundary
  return (
    <div className="h-full p-6">
      <TriPaneErrorBoundary onError={handleBoundaryError}>
        <TriPaneShell
          entities={data.entities}
          relationships={data.relationships}
          timelineEvents={data.timelineEvents}
          geospatialEvents={data.geospatialEvents}
          onEntitySelect={handleEntitySelect}
          onEventSelect={handleEventSelect}
          onLocationSelect={handleLocationSelect}
          onSyncStateChange={handleSyncStateChange}
          onExport={handleExport}
          showProvenanceOverlay={false}
          className="h-full"
        />
      </TriPaneErrorBoundary>
    </div>
  )
}

import React, { useCallback, useEffect, useMemo, useState } from 'react'
import {
  Search,
  Filter,
  Settings,
  Download,
  RefreshCw,
  Shield,
  History,
} from 'lucide-react'
import { useSearchParams } from 'react-router-dom'
import { Button } from '@/components/ui/Button'
import { SearchBar } from '@/components/ui/SearchBar'
import { EntityDrawer } from '@/components/panels/EntityDrawer'
import { FilterPanel } from '@/components/panels/FilterPanel'
import { TimelineRail } from '@/components/panels/TimelineRail'
import { EmptyState } from '@/components/ui/EmptyState'
import { GraphCanvas } from '@/graphs/GraphCanvas'
import { useEntities, useEntityUpdates } from '@/hooks/useGraphQL'
import { ConnectionStatus } from '@/components/ConnectionStatus'
import { SnapshotManager } from '@/components/features/investigation/SnapshotManager'
import { SearchSessionTabs, useSearchSessions } from '@/features/search-sessions'
import { isFeatureEnabled } from '@/config'
import { trackGoldenPathStep } from '@/telemetry/metrics'
import mockData from '@/mock/data.json'
import type {
  Entity,
  Relationship,
  FilterState,
  TimelineEvent,
  GraphLayout,
} from '@/types'

export default function ExplorePage() {
  // GraphQL hooks
  const {
    data: entitiesData,
    loading: entitiesLoading,
    error: entitiesError,
    refetch,
  } = useEntities()
  const { data: entityUpdates } = useEntityUpdates()
  const [searchParams] = useSearchParams()
  const investigationId = searchParams.get('investigation')

  const createDefaultFilters = useCallback(
    (): FilterState => ({
      entityTypes: [],
      relationshipTypes: [],
      dateRange: { start: '', end: '' },
      confidenceRange: { min: 0, max: 1 },
      tags: [],
      sources: [],
    }),
    []
  )

  const searchSessionsEnabled = isFeatureEnabled('ui.searchSessions')
  const {
    sessions,
    activeSession,
    activeSessionId,
    addSession,
    closeSession,
    selectSession,
    duplicateSession,
    resetSession,
    updateActiveSession,
    importSession,
    exportSession,
    markSessionRefreshed,
  } = useSearchSessions(searchSessionsEnabled, createDefaultFilters)

  const [entities, setEntities] = useState<Entity[]>([])
  const [relationships, setRelationships] = useState<Relationship[]>([])
  const [timelineEvents, setTimelineEvents] = useState<TimelineEvent[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<Error | null>(null)

  // UI State
  const [drawerOpen, setDrawerOpen] = useState(false)
  const [filterPanelOpen, setFilterPanelOpen] = useState(true)
  const [timelineOpen, setTimelineOpen] = useState(true)
  const [snapshotsOpen, setSnapshotsOpen] = useState(false)
  const [policyOverlay, setPolicyOverlay] = useState<'none' | 'purpose' | 'retention' | 'residency'>('none')

  // Graph state
  const [graphLayout] = useState<GraphLayout>({
    type: 'force',
    settings: {},
  })

  const activeFilters = activeSession?.filters ?? createDefaultFilters()
  const searchQuery = activeSession?.query ?? ''
  const selectedEntityId = activeSession?.selectedEntityId
  const timeWindow = activeSession?.timeWindow ?? activeFilters.dateRange

  useEffect(() => {
    setDrawerOpen(Boolean(selectedEntityId))
  }, [selectedEntityId])

  // Load data - prefer GraphQL over mock data
  useEffect(() => {
    trackGoldenPathStep('entities_viewed')

    if (entitiesData?.entities) {
      // Use real GraphQL data when available
      setEntities(entitiesData.entities)
      setLoading(entitiesLoading)
      setError(entitiesError)
    } else {
      // Fallback to mock data for development
      const loadMockData = async () => {
        try {
          setLoading(true)
          await new Promise(resolve => setTimeout(resolve, 1000))

          setEntities(mockData.entities as Entity[])
          setRelationships(mockData.relationships as Relationship[])
          setTimelineEvents(mockData.timelineEvents as TimelineEvent[])
        } catch (err) {
          setError(err as Error)
        } finally {
          setLoading(false)
        }
      }

      loadMockData()
    }
  }, [entitiesData, entitiesLoading, entitiesError])

  // Handle real-time entity updates
  useEffect(() => {
    if (entityUpdates?.entityUpdated) {
      setEntities(prev => {
        const updatedEntity = entityUpdates.entityUpdated
        const index = prev.findIndex(e => e.id === updatedEntity.id)
        if (index >= 0) {
          const newEntities = [...prev]
          newEntities[index] = { ...newEntities[index], ...updatedEntity }
          return newEntities
        }
        return [...prev, updatedEntity]
      })
    }
  }, [entityUpdates])

  // Filter data based on current filters
  const isWithinTimeWindow = useCallback(
    (timestamp: string) => {
      if (!timeWindow.start && !timeWindow.end) {
        return true
      }

      const eventTime = new Date(timestamp)
      if (timeWindow.start && eventTime < new Date(timeWindow.start)) {
        return false
      }
      if (timeWindow.end && eventTime > new Date(timeWindow.end)) {
        return false
      }
      return true
    },
    [timeWindow.end, timeWindow.start]
  )

  const filteredEntities = entities.filter(entity => {
    if (
      activeFilters.entityTypes.length > 0 &&
      !activeFilters.entityTypes.includes(entity.type)
    )
      {return false}
    if (
      activeFilters.confidenceRange.min > entity.confidence ||
      activeFilters.confidenceRange.max < entity.confidence
    )
      {return false}
    if (
      activeFilters.tags.length > 0 &&
      !entity.tags?.some(tag => activeFilters.tags.includes(tag))
    )
      {return false}
    if (
      activeFilters.sources.length > 0 &&
      entity.source &&
      !activeFilters.sources.includes(entity.source)
    )
      {return false}
    if (
      searchQuery &&
      !entity.name.toLowerCase().includes(searchQuery.toLowerCase())
    )
      {return false}
    return true
  })

  const filteredRelationships = relationships.filter(rel => {
    if (
      activeFilters.relationshipTypes.length > 0 &&
      !activeFilters.relationshipTypes.includes(rel.type)
    )
      {return false}
    // Only include relationships where both entities are in filtered set
    return (
      filteredEntities.some(e => e.id === rel.sourceId) &&
      filteredEntities.some(e => e.id === rel.targetId)
    )
  })

  const filteredTimelineEvents = useMemo(
    () => timelineEvents.filter(event => isWithinTimeWindow(event.timestamp)),
    [isWithinTimeWindow, timelineEvents]
  )

  // Get available filter options
  const availableEntityTypes = Array.from(new Set(entities.map(e => e.type)))
  const availableRelationshipTypes = Array.from(
    new Set(relationships.map(r => r.type))
  )
  const availableTags = Array.from(new Set(entities.flatMap(e => e.tags || [])))
  const availableSources = Array.from(
    new Set(entities.map(e => e.source).filter(Boolean))
  ) as string[]

  const handleFiltersChange = (updatedFilters: FilterState) => {
    updateActiveSession({
      filters: updatedFilters,
      timeWindow: updatedFilters.dateRange,
    })
  }

  const handleSearchChange = (value: string) => {
    updateActiveSession({ query: value })
  }

  const clearSessionState = () => {
    const defaults = createDefaultFilters()
    updateActiveSession({
      filters: defaults,
      timeWindow: defaults.dateRange,
      query: '',
      selectedEntityId: undefined,
    })
  }

  const handleEntitySelect = (entity: Entity) => {
    updateActiveSession({
      selectedEntityId: entity.id,
    })
    setDrawerOpen(true)
  }

  const handleRefresh = async () => {
    if (entitiesData) {
      // Refetch from GraphQL
      await refetch()
    } else {
      // Simulate refresh for mock data
      setLoading(true)
      await new Promise(resolve => setTimeout(resolve, 1000))
      setLoading(false)
    }
    markSessionRefreshed(activeSessionId)
  }

  const handleDataExport = async (format: 'json' | 'csv' | 'png') => {
    trackGoldenPathStep('results_viewed')

    // 1. Prepare Manifest
    const timestamp = new Date().toISOString()
    const manifestPayload = {
      tenant: 'CURRENT_TENANT', // Should come from context
      filters: activeFilters,
      timestamp,
    }

    // 2. Sign Manifest (Simulated call to new endpoint)
    let signature = 'mock-signature'
    try {
      const res = await fetch('/api/exports/sign-manifest', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(manifestPayload),
      })
      if (res.ok) {
        const json = await res.json()
        signature = json.signature
      }
    } catch (e) {
      console.warn('Failed to sign export manifest', e)
    }

    if (format === 'json') {
      const data = {
        manifest: { ...manifestPayload, signature },
        data: {
          entities: filteredEntities,
          relationships: filteredRelationships,
        }
      }

      const blob = new Blob([JSON.stringify(data, null, 2)], {
        type: 'application/json',
      })
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `intelgraph-export-${Date.now()}.json`
      a.click()
      URL.revokeObjectURL(url)
    } else if (format === 'csv') {
      // Simple CSV generation
      const headers = ['id', 'type', 'name', 'confidence', 'source'].join(',');
      const rows = filteredEntities.map(e =>
        [e.id, e.type, `"${e.name}"`, e.confidence, e.source].join(',')
      );
      const csvContent = [headers, ...rows].join('\n');

      // Append manifest as comment
      const manifestComment = `# MANIFEST: ${JSON.stringify(manifestPayload)}\n# SIGNATURE: ${signature}\n`;

      const blob = new Blob([manifestComment + csvContent], { type: 'text/csv' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `intelgraph-export-${Date.now()}.csv`;
      a.click();
      URL.revokeObjectURL(url);
    } else if (format === 'png') {
      // Placeholder for PNG export logic
      // In a real implementation, this would use html2canvas or similar
      alert('PNG export requires canvas integration not available in this environment.');
    }
  }

  const handleDrawerOpenChange = (open: boolean) => {
    setDrawerOpen(open)
    if (!open) {
      updateActiveSession({ selectedEntityId: undefined })
    }
  }

  if (error) {
    return (
      <div className="h-full flex items-center justify-center">
        <EmptyState
          icon="alert"
          title="Failed to load graph data"
          description={error.message}
          action={{
            label: 'Retry',
            onClick: () => window.location.reload(),
          }}
        />
      </div>
    )
  }

  return (
    <div className="h-full flex flex-col">
      {searchSessionsEnabled && (
        <div className="border-b bg-background px-6 py-3">
          <SearchSessionTabs
            sessions={sessions}
            activeSessionId={activeSessionId}
            onAddSession={addSession}
            onSelectSession={selectSession}
            onCloseSession={closeSession}
            onDuplicateSession={duplicateSession}
            onResetSession={resetSession}
            onExportSession={exportSession}
            onImportSession={importSession}
          />
        </div>
      )}
      {/* Header */}
      <div className="flex items-center justify-between p-6 border-b">
        <div className="flex items-center gap-4">
          <h1 className="text-2xl font-semibold">Graph Explorer</h1>
          <ConnectionStatus />
          <SearchBar
            placeholder="Search entities..."
            value={searchQuery}
            onChange={handleSearchChange}
            className="w-80"
          />
        </div>

        <div className="flex items-center gap-2">
          {/* Policy Overlays */}
          <div className="flex items-center gap-2 border-r pr-4 mr-2">
              <span className="text-xs text-muted-foreground font-medium">Overlays:</span>
              <Button
                variant={policyOverlay === 'purpose' ? 'default' : 'ghost'}
                size="sm"
                onClick={() => setPolicyOverlay(policyOverlay === 'purpose' ? 'none' : 'purpose')}
              >
                  <Shield className="h-3 w-3 mr-1" /> Purpose
              </Button>
              <Button
                variant={policyOverlay === 'residency' ? 'default' : 'ghost'}
                size="sm"
                onClick={() => setPolicyOverlay(policyOverlay === 'residency' ? 'none' : 'residency')}
              >
                  <Shield className="h-3 w-3 mr-1" /> Residency
              </Button>
          </div>

          <Button
            variant="outline"
            size="sm"
            onClick={() => setFilterPanelOpen(!filterPanelOpen)}
          >
            <Filter className="h-4 w-4 mr-2" />
            Filters
          </Button>

          <Button
            variant="outline"
            size="sm"
            onClick={() => setTimelineOpen(!timelineOpen)}
          >
            <Search className="h-4 w-4 mr-2" />
            Timeline
          </Button>

          <Button
            variant="outline"
            size="sm"
            onClick={() => setSnapshotsOpen(!snapshotsOpen)}
          >
            <History className="h-4 w-4 mr-2" />
            Snapshots
          </Button>

          <Button
            variant="outline"
            size="sm"
            onClick={handleRefresh}
            disabled={loading}
          >
            <RefreshCw
              className={`h-4 w-4 mr-2 ${loading ? 'animate-spin' : ''}`}
            />
            Refresh
          </Button>

          <div className="flex gap-1">
            <Button variant="outline" size="sm" onClick={() => handleDataExport('json')}>
              <Download className="h-4 w-4 mr-2" />
              JSON
            </Button>
            <Button variant="outline" size="sm" onClick={() => handleDataExport('csv')}>
              <Download className="h-4 w-4 mr-2" />
              CSV
            </Button>
          </div>

          <Button variant="outline" size="sm">
            <Settings className="h-4 w-4 mr-2" />
            Layout
          </Button>
        </div>
      </div>

      {/* Main Content Grid */}
      <div className="flex-1 flex">
        {/* Left Sidebar - Filters */}
        {filterPanelOpen && (
          <div className="w-80 border-r overflow-y-auto">
            <FilterPanel
              data={activeFilters}
              onFilterChange={handleFiltersChange}
              availableEntityTypes={availableEntityTypes}
              availableRelationshipTypes={availableRelationshipTypes}
              availableTags={availableTags}
              availableSources={availableSources}
              loading={loading}
              className="m-4"
            />
          </div>
        )}

        {/* Center - Graph Canvas */}
        <div className="flex-1 relative">
          {loading ? (
            <div className="absolute inset-0 flex items-center justify-center">
              <div className="text-center space-y-4">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto"></div>
                <p className="text-muted-foreground">Loading graph data...</p>
              </div>
            </div>
          ) : filteredEntities.length === 0 ? (
            <div className="absolute inset-0 flex items-center justify-center">
              <EmptyState
                icon="search"
                title="No entities found"
                description="Try adjusting your filters or search query"
                action={{
                  label: 'Clear filters',
                  onClick: clearSessionState,
                }}
              />
            </div>
          ) : (
            <GraphCanvas
              entities={filteredEntities}
              relationships={filteredRelationships}
              layout={graphLayout}
              onEntitySelect={handleEntitySelect}
              selectedEntityId={selectedEntityId}
              className="h-full w-full"
              // Pass overlay state to canvas if supported
              // overlay={policyOverlay}
            />
          )}
          {/* Legend for Policy Overlay */}
          {policyOverlay !== 'none' && (
              <div className="absolute bottom-4 right-4 bg-background/90 p-4 rounded shadow border z-10">
                  <h4 className="font-semibold mb-2 capitalize">{policyOverlay} Policy</h4>
                  <div className="space-y-1 text-sm">
                      <div className="flex items-center"><span className="w-3 h-3 rounded-full bg-green-500 mr-2"></span> Compliant</div>
                      <div className="flex items-center"><span className="w-3 h-3 rounded-full bg-yellow-500 mr-2"></span> Review</div>
                      <div className="flex items-center"><span className="w-3 h-3 rounded-full bg-red-500 mr-2"></span> Violation</div>
                  </div>
              </div>
          )}
        </div>

        {/* Right Sidebar - Timeline */}
        {timelineOpen && (
          <div className="w-80 border-l overflow-y-auto">
            <TimelineRail
              data={filteredTimelineEvents}
              loading={loading}
              onEventSelect={event => {
                if (event.entityId) {
                  updateActiveSession({ selectedEntityId: event.entityId })
                  setDrawerOpen(true)
                }
              }}
              className="m-4"
            />
          </div>
        )}

        {/* Far Right Sidebar - Snapshots (Overlay or separate panel) */}
        {snapshotsOpen && (
          <div className="w-96 border-l overflow-y-auto bg-background z-10">
            <SnapshotManager
              investigationId={investigationId || 'inv-1'}
              onClose={() => setSnapshotsOpen(false)}
            />
          </div>
        )}
      </div>

      {/* Entity Details Drawer */}
      <EntityDrawer
        data={entities}
        relationships={relationships}
        open={drawerOpen}
        onOpenChange={handleDrawerOpenChange}
        selectedEntityId={selectedEntityId}
        onSelect={handleEntitySelect}
        onAction={(action, payload) => {
          console.log('Entity action:', action, payload)
          // Handle entity actions (edit, delete, export, etc.)
        }}
      />
    </div>
  )
}

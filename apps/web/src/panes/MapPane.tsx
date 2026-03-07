import React, { useCallback, useEffect, useMemo, useState } from 'react'
import {
  MapContainer,
  TileLayer,
  CircleMarker,
  Popup,
  useMap,
  useMapEvents,
} from 'react-leaflet'
import 'leaflet/dist/leaflet.css'
import { useWorkspaceStore } from '../store/workspaceStore'
import { isFeatureEnabled } from '../config'

type MarkerEntity = ReturnType<
  typeof useWorkspaceStore.getState
>['entities'][number]

interface ClusteredMarker {
  id: string
  lat: number
  lng: number
  count: number
  memberIds: string[]
  label: string
  isCluster: true
}

type RenderableMarker = MarkerEntity | ClusteredMarker

const isPositiveInteger = (value?: string | number) => {
  const parsed = typeof value === 'number' ? value : Number(value)
  return Number.isFinite(parsed) && parsed > 0 ? Math.floor(parsed) : undefined
}

const CLUSTERING_FEATURE_ENABLED = isFeatureEnabled('ui.mapClustering')

const MAP_PAGE_SIZE =
  isPositiveInteger(
    typeof import.meta !== 'undefined'
      ? (import.meta as { env?: { VITE_MAP_MARKER_PAGE_SIZE?: string } }).env
          ?.VITE_MAP_MARKER_PAGE_SIZE
      : undefined
  ) ||
  isPositiveInteger(
    typeof process !== 'undefined'
      ? process.env?.VITE_MAP_MARKER_PAGE_SIZE
      : undefined
  ) ||
  50

const getZoomPrecision = (zoom: number) => {
  if (zoom >= 13) return 3
  if (zoom >= 10) return 2
  if (zoom >= 6) return 1
  return 0
}

const NO_CLUSTERING_ZOOM = 13

const clusterMarkers = (
  entities: MarkerEntity[],
  zoom: number
): RenderableMarker[] => {
  if (zoom >= NO_CLUSTERING_ZOOM) {
    return [...entities]
  }

  const precision = getZoomPrecision(zoom)
  const clusterMap = new Map<
    string,
    {
      latSum: number
      lngSum: number
      count: number
      members: MarkerEntity[]
    }
  >()

  for (const entity of entities) {
    if (entity.lat === undefined || entity.lng === undefined) continue
    const key = `${entity.lat.toFixed(precision)}:${entity.lng.toFixed(precision)}`
    const existing = clusterMap.get(key)

    if (!existing) {
      clusterMap.set(key, {
        latSum: entity.lat,
        lngSum: entity.lng,
        count: 1,
        members: [entity],
      })
    } else {
      existing.latSum += entity.lat
      existing.lngSum += entity.lng
      existing.count += 1
      existing.members.push(entity)
    }
  }

  const clusters: RenderableMarker[] = []

  for (const [key, aggregate] of clusterMap.entries()) {
    if (aggregate.count === 1) {
      clusters.push({ ...aggregate.members[0] })
      continue
    }

    clusters.push({
      id: `cluster-${key}`,
      lat: aggregate.latSum / aggregate.count,
      lng: aggregate.lngSum / aggregate.count,
      count: aggregate.count,
      memberIds: aggregate.members.map(member => member.id),
      label: `${aggregate.count} entities`,
      isCluster: true,
    })
  }

  return clusters.sort((a, b) => {
    const countA = 'isCluster' in a && a.isCluster ? a.count : 1
    const countB = 'isCluster' in b && b.isCluster ? b.count : 1

    if (countA !== countB) {
      return countB - countA
    }

    return a.id.localeCompare(b.id)
  })
}

// Component to handle map centering based on selection
const MapUpdater = ({
  selectedIds,
  entities,
}: {
  selectedIds: string[]
  entities: MarkerEntity[]
}) => {
  const map = useMap()

  useEffect(() => {
    if (selectedIds.length > 0) {
      const selectedEntities = entities.filter(
        e => selectedIds.includes(e.id) && e.lat && e.lng
      )
      if (selectedEntities.length > 0) {
        const bounds = selectedEntities.map(
          e => [e.lat, e.lng] as [number, number]
        )
        map.fitBounds(bounds, { padding: [50, 50], maxZoom: 13 })
      }
    }
  }, [selectedIds, entities, map])

  return null
}

const ZoomWatcher = ({
  onZoomChange,
}: {
  onZoomChange: (nextZoom: number) => void
}) => {
  const map = useMapEvents({
    zoomend: () => onZoomChange(map.getZoom()),
  })

  useEffect(() => {
    onZoomChange(map.getZoom())
  }, [map, onZoomChange])

  return null
}

const MarkerLayer = ({
  markers,
  selectedIds,
  onSelect,
}: {
  markers: RenderableMarker[]
  selectedIds: string[]
  onSelect: (id: string) => void
}) => {
  const map = useMap()

  return (
    <>
      {markers.map(marker => {
        const isCluster = 'isCluster' in marker && marker.isCluster
        const isSelected = selectedIds.includes(marker.id)
        const radius = isCluster
          ? Math.min(
              18,
              6 + Math.log2((marker as ClusteredMarker).count + 1) * 3
            )
          : isSelected
            ? 8
            : 5

        const center: [number, number] = [marker.lat!, marker.lng!]

        return (
          <CircleMarker
            key={marker.id}
            center={center}
            radius={radius}
            pathOptions={{
              color: isCluster ? '#f59e0b' : isSelected ? '#22d3ee' : '#94a3b8',
              fillColor: isCluster
                ? '#facc15'
                : isSelected
                  ? '#06b6d4'
                  : '#475569',
              fillOpacity: 0.8,
              weight: isCluster ? 2 : isSelected ? 2 : 1,
            }}
            data-cluster={isCluster ? 'true' : 'false'}
            eventHandlers={{
              click: () => {
                if (isCluster) {
                  const nextZoom = Math.min(map.getZoom() + 2, 16)
                  map.setView(center, nextZoom)
                } else {
                  onSelect(marker.id)
                }
              },
            }}
          >
            <Popup className="map-popup">
              <div className="text-slate-900">
                {isCluster ? (
                  <>
                    <strong className="block border-b border-slate-200 pb-1 mb-1">
                      {(marker as ClusteredMarker).label}
                    </strong>
                    <span className="text-xs">
                      Includes {(marker as ClusteredMarker).memberIds.length}{' '}
                      nearby points. Zoom in to expand.
                    </span>
                  </>
                ) : (
                  <>
                    <strong className="block border-b border-slate-200 pb-1 mb-1">
                      {marker.label}
                    </strong>
                    <span className="text-xs">
                      {(marker as MarkerEntity).type}
                    </span>
                    <p className="text-xs mt-1 text-slate-600">
                      {(marker as MarkerEntity).description}
                    </p>
                  </>
                )}
              </div>
            </Popup>
          </CircleMarker>
        )
      })}
    </>
  )
}

export const MapPane = () => {
  const {
    entities,
    selectedEntityIds,
    selectEntity,
    isSyncing,
    syncError,
    retrySync,
  } = useWorkspaceStore()

  const [clusteringEnabled, setClusteringEnabled] = useState(
    CLUSTERING_FEATURE_ENABLED
  )
  const [zoomLevel, setZoomLevel] = useState(2)
  const [page, setPage] = useState(1)
  const pageSize = MAP_PAGE_SIZE

  // Syncing indicator logic
  const [showSyncing, setShowSyncing] = useState(false)
  useEffect(() => {
    let timer: NodeJS.Timeout
    if (isSyncing) {
      timer = setTimeout(() => setShowSyncing(true), 250)
    } else {
      setShowSyncing(false)
    }
    return () => clearTimeout(timer)
  }, [isSyncing])

  const markers = useMemo(() => {
    return entities.filter(e => e.lat && e.lng)
  }, [entities])

  const renderableMarkers = useMemo(() => {
    if (!CLUSTERING_FEATURE_ENABLED || !clusteringEnabled) {
      return markers
    }

    return clusterMarkers(markers, zoomLevel)
  }, [clusteringEnabled, markers, zoomLevel])

  const totalPages = useMemo(() => {
    if (!CLUSTERING_FEATURE_ENABLED) {
      return 1
    }

    return Math.max(1, Math.ceil(renderableMarkers.length / pageSize))
  }, [pageSize, renderableMarkers.length])

  useEffect(() => {
    setPage(1)
  }, [renderableMarkers])

  const pagedMarkers = useMemo(() => {
    if (!CLUSTERING_FEATURE_ENABLED) {
      return renderableMarkers
    }

    const start = (page - 1) * pageSize
    return renderableMarkers.slice(start, start + pageSize)
  }, [page, pageSize, renderableMarkers])

  const handleToggleClustering = useCallback(() => {
    setClusteringEnabled(prev => !prev)
  }, [])

  const handleZoomChange = useCallback((nextZoom: number) => {
    setZoomLevel(Math.max(0, nextZoom))
  }, [])

  return (
    <div className="w-full h-full relative bg-slate-900 border border-slate-800 rounded-lg overflow-hidden flex flex-col">
      <div className="absolute top-2 left-2 z-[1000] bg-slate-900/80 backdrop-blur px-3 py-1 rounded text-xs font-mono text-cyan-400 border border-cyan-900/50">
        GEOSPATIAL INTELLIGENCE
      </div>

      {/* Syncing Indicator */}
      {showSyncing && (
        <div className="absolute top-2 left-1/2 transform -translate-x-1/2 z-[2000] bg-yellow-500/80 text-black px-2 py-1 rounded text-xs font-bold animate-pulse">
          Syncing...
        </div>
      )}

      {/* Error Banner */}
      {syncError && (
        <div className="absolute top-12 left-1/2 transform -translate-x-1/2 z-[3000] bg-red-900/90 border border-red-500 text-white px-4 py-3 rounded shadow-lg flex flex-col items-center gap-2">
          <div className="font-bold text-sm">Couldn’t refresh results</div>
          <div className="text-xs">Your selected time range is unchanged.</div>
          <button
            onClick={retrySync}
            className="bg-red-700 hover:bg-red-600 px-3 py-1 rounded text-xs font-semibold transition-colors"
          >
            Retry
          </button>
        </div>
      )}

      <MapContainer
        center={[20, 0]}
        zoom={2}
        style={{ height: '100%', width: '100%', background: '#0f172a' }}
        className="z-0"
      >
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors &copy; <a href="https://carto.com/attributions">CARTO</a>'
          url="https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png"
        />
        <MarkerLayer
          markers={pagedMarkers}
          selectedIds={selectedEntityIds}
          onSelect={selectEntity}
        />
        <ZoomWatcher onZoomChange={handleZoomChange} />
        <MapUpdater selectedIds={selectedEntityIds} entities={entities} />
      </MapContainer>

      {CLUSTERING_FEATURE_ENABLED && (
        <div className="absolute top-2 right-2 z-[1000] bg-slate-900/80 backdrop-blur px-3 py-2 rounded text-xs text-slate-100 border border-slate-700 space-y-2">
          <div className="flex items-center justify-between gap-2">
            <div className="font-semibold">Clustering</div>
            <label
              className="inline-flex items-center gap-2 cursor-pointer"
              aria-label="Clustering toggle"
            >
              <span className="text-[11px] text-slate-300">Off</span>
              <input
                type="checkbox"
                checked={clusteringEnabled}
                onChange={handleToggleClustering}
                data-testid="clustering-toggle"
              />
              <span className="text-[11px] text-slate-300">On</span>
            </label>
          </div>

          <div className="flex items-center justify-between gap-3">
            <div className="text-[11px] text-slate-300">
              Showing {pagedMarkers.length} of {renderableMarkers.length}{' '}
              markers
            </div>
            <div className="flex items-center gap-1">
              <button
                className="px-2 py-1 rounded bg-slate-800 border border-slate-700 text-[11px] disabled:opacity-50"
                onClick={() => setPage(prev => Math.max(1, prev - 1))}
                disabled={page === 1}
                data-testid="page-previous"
              >
                Prev
              </button>
              <div className="px-2 text-[11px]" data-testid="page-indicator">
                Page {page} / {totalPages}
              </div>
              <button
                className="px-2 py-1 rounded bg-slate-800 border border-slate-700 text-[11px] disabled:opacity-50"
                onClick={() => setPage(prev => Math.min(totalPages, prev + 1))}
                disabled={page === totalPages}
                data-testid="page-next"
              >
                Next
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

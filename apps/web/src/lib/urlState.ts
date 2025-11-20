import { useEffect, useCallback } from 'react'
import { useSearchParams } from 'react-router-dom'
import { useAppDispatch, useAppSelector } from '@/store/hooks'
import {
  selectViewSync,
  selectEntities,
  setTimeRange,
  setGeoRegion,
  setEntityTypeFilter,
  setConfidenceThreshold,
} from '@/features/viewSync/viewSyncSlice'
import type { TimeRange, GeoRegion } from '@/features/viewSync/viewSyncSlice'

/**
 * URL State Management
 *
 * Serializes and deserializes view state to/from URL query parameters
 * for deep linking and shareable views.
 */

export interface URLState {
  // Selection
  entities?: string[] // Entity IDs
  relationships?: string[] // Relationship IDs
  events?: string[] // Event IDs

  // Time range
  timeStart?: string // ISO timestamp
  timeEnd?: string // ISO timestamp

  // Geographic region
  geoNorth?: number
  geoSouth?: number
  geoEast?: number
  geoWest?: number
  geoZoom?: number
  geoCenterLng?: number
  geoCenterLat?: number

  // Filters
  entityTypes?: string[] // Entity type filters
  confidence?: number // Confidence threshold

  // View state
  activePane?: 'graph' | 'timeline' | 'map'
  layout?: 'default' | 'graph-focus' | 'timeline-focus' | 'map-focus'
  explainOpen?: boolean
}

/**
 * Hook to sync Redux state with URL parameters
 */
export function useURLStateSync() {
  const [searchParams, setSearchParams] = useSearchParams()
  const dispatch = useAppDispatch()
  const viewSync = useAppSelector(selectViewSync)

  // Load state from URL on mount
  useEffect(() => {
    const urlState = deserializeURLState(searchParams)

    // Apply time range
    if (urlState.timeStart && urlState.timeEnd) {
      dispatch(
        setTimeRange({
          start: urlState.timeStart,
          end: urlState.timeEnd,
        })
      )
    }

    // Apply geo region
    if (
      urlState.geoNorth !== undefined &&
      urlState.geoSouth !== undefined &&
      urlState.geoEast !== undefined &&
      urlState.geoWest !== undefined
    ) {
      dispatch(
        setGeoRegion({
          bounds: {
            north: urlState.geoNorth,
            south: urlState.geoSouth,
            east: urlState.geoEast,
            west: urlState.geoWest,
          },
          zoom: urlState.geoZoom,
          center:
            urlState.geoCenterLng !== undefined && urlState.geoCenterLat !== undefined
              ? [urlState.geoCenterLng, urlState.geoCenterLat]
              : undefined,
        })
      )
    }

    // Apply filters
    if (urlState.entityTypes) {
      dispatch(setEntityTypeFilter(urlState.entityTypes))
    }

    if (urlState.confidence !== undefined) {
      dispatch(setConfidenceThreshold(urlState.confidence))
    }
  }, []) // Run once on mount

  // Sync Redux state to URL (debounced)
  useEffect(() => {
    const timeoutId = setTimeout(() => {
      const urlState: URLState = {}

      // Serialize selected entities
      if (viewSync.selectedEntityIds.length > 0) {
        urlState.entities = viewSync.selectedEntityIds
      }

      // Serialize time range
      if (viewSync.timeRange) {
        urlState.timeStart = viewSync.timeRange.start
        urlState.timeEnd = viewSync.timeRange.end
      }

      // Serialize geo region
      if (viewSync.geoRegion) {
        const { bounds, zoom, center } = viewSync.geoRegion
        urlState.geoNorth = bounds.north
        urlState.geoSouth = bounds.south
        urlState.geoEast = bounds.east
        urlState.geoWest = bounds.west
        if (zoom) urlState.geoZoom = zoom
        if (center) {
          urlState.geoCenterLng = center[0]
          urlState.geoCenterLat = center[1]
        }
      }

      // Serialize filters
      if (viewSync.entityTypeFilter.length > 0) {
        urlState.entityTypes = viewSync.entityTypeFilter
      }

      if (viewSync.confidenceThreshold > 0) {
        urlState.confidence = viewSync.confidenceThreshold
      }

      // Serialize active pane
      if (viewSync.activePaneId) {
        urlState.activePane = viewSync.activePaneId
      }

      // Update URL
      const newSearchParams = serializeURLState(urlState)
      setSearchParams(newSearchParams, { replace: true })
    }, 500) // Debounce by 500ms

    return () => clearTimeout(timeoutId)
  }, [viewSync, setSearchParams])

  return {
    shareableURL: window.location.href,
    copyToClipboard: useCallback(() => {
      navigator.clipboard.writeText(window.location.href)
    }, []),
  }
}

/**
 * Serialize state object to URLSearchParams
 */
function serializeURLState(state: URLState): URLSearchParams {
  const params = new URLSearchParams()

  // Arrays: encode as comma-separated values
  if (state.entities?.length) {
    params.set('entities', state.entities.join(','))
  }
  if (state.relationships?.length) {
    params.set('relationships', state.relationships.join(','))
  }
  if (state.events?.length) {
    params.set('events', state.events.join(','))
  }
  if (state.entityTypes?.length) {
    params.set('entityTypes', state.entityTypes.join(','))
  }

  // Simple values
  if (state.timeStart) params.set('timeStart', state.timeStart)
  if (state.timeEnd) params.set('timeEnd', state.timeEnd)
  if (state.geoNorth !== undefined) params.set('geoN', state.geoNorth.toFixed(6))
  if (state.geoSouth !== undefined) params.set('geoS', state.geoSouth.toFixed(6))
  if (state.geoEast !== undefined) params.set('geoE', state.geoEast.toFixed(6))
  if (state.geoWest !== undefined) params.set('geoW', state.geoWest.toFixed(6))
  if (state.geoZoom !== undefined) params.set('geoZ', state.geoZoom.toFixed(2))
  if (state.geoCenterLng !== undefined) params.set('geoCLng', state.geoCenterLng.toFixed(6))
  if (state.geoCenterLat !== undefined) params.set('geoCLat', state.geoCenterLat.toFixed(6))
  if (state.confidence !== undefined) params.set('conf', state.confidence.toFixed(2))
  if (state.activePane) params.set('pane', state.activePane)
  if (state.layout) params.set('layout', state.layout)
  if (state.explainOpen !== undefined) params.set('explain', state.explainOpen ? '1' : '0')

  return params
}

/**
 * Deserialize URLSearchParams to state object
 */
function deserializeURLState(params: URLSearchParams): URLState {
  const state: URLState = {}

  // Arrays: decode from comma-separated values
  const entitiesParam = params.get('entities')
  if (entitiesParam) {
    state.entities = entitiesParam.split(',').filter(Boolean)
  }

  const relationshipsParam = params.get('relationships')
  if (relationshipsParam) {
    state.relationships = relationshipsParam.split(',').filter(Boolean)
  }

  const eventsParam = params.get('events')
  if (eventsParam) {
    state.events = eventsParam.split(',').filter(Boolean)
  }

  const entityTypesParam = params.get('entityTypes')
  if (entityTypesParam) {
    state.entityTypes = entityTypesParam.split(',').filter(Boolean)
  }

  // Simple values
  const timeStart = params.get('timeStart')
  if (timeStart) state.timeStart = timeStart

  const timeEnd = params.get('timeEnd')
  if (timeEnd) state.timeEnd = timeEnd

  const geoN = params.get('geoN')
  if (geoN) state.geoNorth = parseFloat(geoN)

  const geoS = params.get('geoS')
  if (geoS) state.geoSouth = parseFloat(geoS)

  const geoE = params.get('geoE')
  if (geoE) state.geoEast = parseFloat(geoE)

  const geoW = params.get('geoW')
  if (geoW) state.geoWest = parseFloat(geoW)

  const geoZ = params.get('geoZ')
  if (geoZ) state.geoZoom = parseFloat(geoZ)

  const geoCLng = params.get('geoCLng')
  if (geoCLng) state.geoCenterLng = parseFloat(geoCLng)

  const geoCLat = params.get('geoCLat')
  if (geoCLat) state.geoCenterLat = parseFloat(geoCLat)

  const conf = params.get('conf')
  if (conf) state.confidence = parseFloat(conf)

  const pane = params.get('pane')
  if (pane && ['graph', 'timeline', 'map'].includes(pane)) {
    state.activePane = pane as 'graph' | 'timeline' | 'map'
  }

  const layout = params.get('layout')
  if (
    layout &&
    ['default', 'graph-focus', 'timeline-focus', 'map-focus'].includes(layout)
  ) {
    state.layout = layout as URLState['layout']
  }

  const explain = params.get('explain')
  if (explain) state.explainOpen = explain === '1'

  return state
}

/**
 * Generate a shareable URL for the current view
 */
export function generateShareableURL(state: URLState, baseURL: string = window.location.origin): string {
  const params = serializeURLState(state)
  const queryString = params.toString()
  return queryString ? `${baseURL}${window.location.pathname}?${queryString}` : baseURL
}

/**
 * Copy current view URL to clipboard
 */
export async function copyCurrentViewURL(): Promise<boolean> {
  try {
    await navigator.clipboard.writeText(window.location.href)
    return true
  } catch (error) {
    console.error('Failed to copy URL:', error)
    return false
  }
}

import React, { useRef, useEffect, useState, useCallback } from 'react'
import mapboxgl from 'mapbox-gl'
import 'mapbox-gl/dist/mapbox-gl.css'
import { Layers, ZoomIn, ZoomOut, Maximize2, Navigation } from 'lucide-react'
import { Button } from '@/components/ui/Button'
import { Skeleton } from '@/components/ui/Skeleton'
import { cn } from '@/lib/utils'
import { useAppDispatch, useAppSelector } from '@/store/hooks'
import {
  setGeoRegion,
  selectSelectedEntityIds,
  selectGeoRegion,
  setHoveredEntity,
} from '@/features/viewSync/viewSyncSlice'
import type { Entity, GeoLocation, PanelProps } from '@/types'

// Set Mapbox access token
mapboxgl.accessToken = process.env.REACT_APP_MAPBOX_TOKEN || 'pk.your-token-here'

interface MapPaneProps extends PanelProps<Entity[]> {
  onEntitySelect?: (entity: Entity) => void
  className?: string
}

export function MapPane({
  data: entities,
  loading = false,
  error,
  onEntitySelect,
  className,
}: MapPaneProps) {
  const dispatch = useAppDispatch()
  const selectedEntityIds = useAppSelector(selectSelectedEntityIds)
  const geoRegion = useAppSelector(selectGeoRegion)

  const mapContainer = useRef<HTMLDivElement>(null)
  const map = useRef<mapboxgl.Map | null>(null)
  const markers = useRef<Map<string, mapboxgl.Marker>>(new Map())

  const [mapReady, setMapReady] = useState(false)
  const [style, setStyle] = useState<'streets' | 'satellite' | 'dark'>('streets')

  // Initialize map
  useEffect(() => {
    if (!mapContainer.current || map.current) return

    map.current = new mapboxgl.Map({
      container: mapContainer.current,
      style: getMapStyle(style),
      center: [-98.5795, 39.8283], // Center of USA
      zoom: 4,
      attributionControl: false,
    })

    // Add navigation controls
    map.current.addControl(new mapboxgl.NavigationControl(), 'top-right')

    // Add scale control
    map.current.addControl(new mapboxgl.ScaleControl(), 'bottom-left')

    // Map ready
    map.current.on('load', () => {
      setMapReady(true)
    })

    // Sync map bounds to Redux state
    map.current.on('moveend', () => {
      if (!map.current) return
      const bounds = map.current.getBounds()
      const center = map.current.getCenter()
      const zoom = map.current.getZoom()

      dispatch(
        setGeoRegion({
          bounds: {
            north: bounds.getNorth(),
            south: bounds.getSouth(),
            east: bounds.getEast(),
            west: bounds.getWest(),
          },
          zoom,
          center: [center.lng, center.lat],
        })
      )
    })

    return () => {
      map.current?.remove()
      map.current = null
    }
  }, [])

  // Update map style
  useEffect(() => {
    if (map.current && mapReady) {
      map.current.setStyle(getMapStyle(style))
    }
  }, [style, mapReady])

  // Sync geo region from Redux to map
  useEffect(() => {
    if (!map.current || !mapReady || !geoRegion) return

    const currentBounds = map.current.getBounds()
    const targetBounds = geoRegion.bounds

    // Only update if bounds have changed significantly
    if (
      Math.abs(currentBounds.getNorth() - targetBounds.north) > 0.1 ||
      Math.abs(currentBounds.getSouth() - targetBounds.south) > 0.1
    ) {
      map.current.fitBounds([
        [targetBounds.west, targetBounds.south],
        [targetBounds.east, targetBounds.north],
      ])
    }
  }, [geoRegion, mapReady])

  // Render markers for entities with geo locations
  useEffect(() => {
    if (!map.current || !mapReady || !entities) return

    // Remove existing markers
    markers.current.forEach(marker => marker.remove())
    markers.current.clear()

    // Add markers for entities with geo locations
    entities.forEach(entity => {
      if (!entity.location) return

      const isSelected = selectedEntityIds.includes(entity.id)

      // Create marker element
      const el = document.createElement('div')
      el.className = cn(
        'marker',
        'w-8 h-8 rounded-full flex items-center justify-center cursor-pointer transition-all',
        'hover:scale-110',
        isSelected
          ? 'bg-primary text-primary-foreground ring-4 ring-primary/30 scale-125'
          : 'bg-background border-2 border-primary text-primary shadow-md'
      )
      el.innerHTML = getEntityIcon(entity.type)
      el.title = entity.name

      // Click handler
      el.addEventListener('click', () => {
        onEntitySelect?.(entity)
      })

      // Hover handlers
      el.addEventListener('mouseenter', () => {
        dispatch(setHoveredEntity(entity.id))
      })
      el.addEventListener('mouseleave', () => {
        dispatch(setHoveredEntity(null))
      })

      // Create marker
      const marker = new mapboxgl.Marker(el)
        .setLngLat([entity.location.longitude, entity.location.latitude])
        .setPopup(
          new mapboxgl.Popup({ offset: 25 }).setHTML(
            `<div class="p-2">
              <div class="font-bold">${entity.name}</div>
              <div class="text-sm text-muted-foreground">${entity.type.replace('_', ' ')}</div>
              ${
                entity.location.address
                  ? `<div class="text-xs mt-1">${entity.location.address}</div>`
                  : ''
              }
            </div>`
          )
        )
        .addTo(map.current!)

      markers.current.set(entity.id, marker)
    })

    // Fit bounds to show all markers
    if (entities.length > 0 && entities.some(e => e.location)) {
      const bounds = new mapboxgl.LngLatBounds()
      entities.forEach(entity => {
        if (entity.location) {
          bounds.extend([entity.location.longitude, entity.location.latitude])
        }
      })
      map.current.fitBounds(bounds, { padding: 50, maxZoom: 12 })
    }
  }, [entities, selectedEntityIds, mapReady, dispatch, onEntitySelect])

  // Map controls
  const handleZoomIn = useCallback(() => {
    map.current?.zoomIn()
  }, [])

  const handleZoomOut = useCallback(() => {
    map.current?.zoomOut()
  }, [])

  const handleResetView = useCallback(() => {
    map.current?.flyTo({ center: [-98.5795, 39.8283], zoom: 4 })
  }, [])

  const handleFitMarkers = useCallback(() => {
    if (!map.current || !entities || entities.length === 0) return

    const bounds = new mapboxgl.LngLatBounds()
    let hasLocation = false

    entities.forEach(entity => {
      if (entity.location) {
        bounds.extend([entity.location.longitude, entity.location.latitude])
        hasLocation = true
      }
    })

    if (hasLocation) {
      map.current.fitBounds(bounds, { padding: 50, maxZoom: 12 })
    }
  }, [entities])

  if (loading) {
    return (
      <div className={cn('h-full w-full p-4', className)}>
        <Skeleton className="h-full w-full" />
      </div>
    )
  }

  if (error) {
    return (
      <div className={cn('h-full w-full flex items-center justify-center', className)}>
        <div className="text-center text-muted-foreground">
          <p className="text-sm font-medium">Map Error</p>
          <p className="text-xs mt-1">{error.message}</p>
        </div>
      </div>
    )
  }

  return (
    <div className={cn('relative h-full w-full', className)}>
      {/* Map container */}
      <div ref={mapContainer} className="absolute inset-0" />

      {/* Map controls overlay */}
      <div className="absolute top-4 left-4 flex flex-col gap-2 z-10">
        {/* Style selector */}
        <div className="bg-background/90 backdrop-blur-sm border rounded-lg p-2 shadow-sm">
          <div className="flex gap-1">
            <Button
              variant={style === 'streets' ? 'default' : 'ghost'}
              size="sm"
              onClick={() => setStyle('streets')}
              className="h-8"
              aria-label="Streets view"
            >
              Streets
            </Button>
            <Button
              variant={style === 'satellite' ? 'default' : 'ghost'}
              size="sm"
              onClick={() => setStyle('satellite')}
              className="h-8"
              aria-label="Satellite view"
            >
              Satellite
            </Button>
            <Button
              variant={style === 'dark' ? 'default' : 'ghost'}
              size="sm"
              onClick={() => setStyle('dark')}
              className="h-8"
              aria-label="Dark view"
            >
              Dark
            </Button>
          </div>
        </div>

        {/* Map actions */}
        <div className="bg-background/90 backdrop-blur-sm border rounded-lg p-2 shadow-sm flex flex-col gap-1">
          <Button
            variant="ghost"
            size="icon"
            onClick={handleZoomIn}
            className="h-8 w-8"
            aria-label="Zoom in"
          >
            <ZoomIn className="h-4 w-4" />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            onClick={handleZoomOut}
            className="h-8 w-8"
            aria-label="Zoom out"
          >
            <ZoomOut className="h-4 w-4" />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            onClick={handleFitMarkers}
            className="h-8 w-8"
            aria-label="Fit all markers"
          >
            <Maximize2 className="h-4 w-4" />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            onClick={handleResetView}
            className="h-8 w-8"
            aria-label="Reset view"
          >
            <Navigation className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {/* Entity count badge */}
      {entities && (
        <div className="absolute bottom-4 right-4 bg-background/90 backdrop-blur-sm border rounded-lg px-3 py-2 shadow-sm z-10">
          <div className="text-xs font-medium">
            {entities.filter(e => e.location).length} locations
          </div>
        </div>
      )}
    </div>
  )
}

// Helper functions
function getMapStyle(style: 'streets' | 'satellite' | 'dark'): string {
  const styles = {
    streets: 'mapbox://styles/mapbox/streets-v12',
    satellite: 'mapbox://styles/mapbox/satellite-streets-v12',
    dark: 'mapbox://styles/mapbox/dark-v11',
  }
  return styles[style]
}

function getEntityIcon(type: string): string {
  const icons: Record<string, string> = {
    PERSON: '👤',
    ORGANIZATION: '🏢',
    LOCATION: '📍',
    IP_ADDRESS: '🌐',
    DOMAIN: '🔗',
    EMAIL: '📧',
    FILE: '📄',
    PROJECT: '📊',
    SYSTEM: '⚙️',
  }
  return icons[type] || '📊'
}

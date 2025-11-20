/**
 * Map Pane Component for Tri-Pane Analysis Shell
 *
 * This component provides a geographic visualization of geospatial events.
 * Currently implemented as a visual placeholder that shows event markers.
 * Future teams can integrate real map libraries (Leaflet, Mapbox, etc.)
 * without changing the component interface.
 */

import React, { useState, useMemo } from 'react'
import { MapPin, Crosshair, ZoomIn, ZoomOut, Maximize2 } from 'lucide-react'
import { cn } from '@/lib/utils'
import { Badge } from '@/components/ui/Badge'
import { Button } from '@/components/ui/Button'
import type { GeospatialEvent } from '@/types'
import type { MapPaneProps } from './types'

/**
 * MapPane component with synchronized selection and filtering
 */
export function MapPane({
  locations,
  center = [0, 0],
  zoom = 2,
  selectedLocationId,
  onLocationSelect,
  onMapMove,
  className,
}: MapPaneProps) {
  const [currentCenter, setCurrentCenter] = useState<[number, number]>(center)
  const [currentZoom, setCurrentZoom] = useState(zoom)
  const [hoveredLocationId, setHoveredLocationId] = useState<string | null>(
    null
  )

  // Group locations by coordinates to handle overlapping markers
  const groupedLocations = useMemo(() => {
    const groups: Record<string, GeospatialEvent[]> = {}

    locations.forEach(event => {
      const key = `${event.location.coordinates[0]},${event.location.coordinates[1]}`
      if (!groups[key]) {
        groups[key] = []
      }
      groups[key].push(event)
    })

    return groups
  }, [locations])

  // Calculate position on the viewport
  const getMarkerPosition = (coords: [number, number]) => {
    // Simple projection: scale longitude and latitude to viewport
    // In a real implementation, this would use proper map projection
    const [lng, lat] = coords

    // Normalize to 0-100% range for positioning
    const x = ((lng + 180) / 360) * 100
    const y = ((90 - lat) / 180) * 100

    return { x, y }
  }

  // Get severity color
  const getSeverityColor = (severity?: string) => {
    switch (severity) {
      case 'critical':
        return 'bg-red-500 border-red-600'
      case 'high':
        return 'bg-orange-500 border-orange-600'
      case 'medium':
        return 'bg-yellow-500 border-yellow-600'
      case 'low':
        return 'bg-blue-500 border-blue-600'
      default:
        return 'bg-slate-500 border-slate-600'
    }
  }

  // Handle zoom controls
  const handleZoomIn = () => {
    const newZoom = Math.min(currentZoom + 1, 10)
    setCurrentZoom(newZoom)
    onMapMove?.(currentCenter, newZoom)
  }

  const handleZoomOut = () => {
    const newZoom = Math.max(currentZoom - 1, 1)
    setCurrentZoom(newZoom)
    onMapMove?.(currentCenter, newZoom)
  }

  const handleRecenter = () => {
    setCurrentCenter([0, 0])
    setCurrentZoom(2)
    onMapMove?.([0, 0], 2)
  }

  return (
    <div
      className={cn('relative w-full h-full overflow-hidden', className)}
      role="region"
      aria-label="Geographic map view"
    >
      {/* Map background with grid */}
      <div className="absolute inset-0 bg-gradient-to-br from-blue-50 to-slate-100 dark:from-slate-900 dark:to-slate-800">
        {/* Grid overlay for visual reference */}
        <svg className="w-full h-full opacity-20">
          <defs>
            <pattern
              id="grid"
              width="40"
              height="40"
              patternUnits="userSpaceOnUse"
            >
              <path
                d="M 40 0 L 0 0 0 40"
                fill="none"
                stroke="currentColor"
                strokeWidth="0.5"
              />
            </pattern>
          </defs>
          <rect width="100%" height="100%" fill="url(#grid)" />
        </svg>

        {/* Latitude/Longitude lines for visual reference */}
        <div className="absolute inset-0">
          {/* Equator */}
          <div className="absolute top-1/2 left-0 right-0 h-px bg-slate-400/30" />
          {/* Prime Meridian */}
          <div className="absolute left-1/2 top-0 bottom-0 w-px bg-slate-400/30" />
        </div>
      </div>

      {/* Location markers */}
      <div className="absolute inset-0" style={{ transform: `scale(${currentZoom / 2})`, transformOrigin: 'center' }}>
        {Object.entries(groupedLocations).map(([coordKey, events]) => {
          const firstEvent = events[0]
          const position = getMarkerPosition(firstEvent.location.coordinates)
          const isSelected = events.some(
            e => e.location.id === selectedLocationId
          )
          const isHovered = events.some(e => e.location.id === hoveredLocationId)
          const maxSeverity = events.reduce((max, event) => {
            const severities = ['info', 'low', 'medium', 'high', 'critical']
            const currentIndex = severities.indexOf(event.severity || 'info')
            const maxIndex = severities.indexOf(max)
            return currentIndex > maxIndex ? event.severity || 'info' : max
          }, 'info')

          return (
            <div
              key={coordKey}
              className="absolute transform -translate-x-1/2 -translate-y-full cursor-pointer transition-all duration-200"
              style={{
                left: `${position.x}%`,
                top: `${position.y}%`,
                zIndex: isSelected || isHovered ? 50 : 10,
              }}
              onClick={() => onLocationSelect?.(firstEvent.location.id)}
              onMouseEnter={() => setHoveredLocationId(firstEvent.location.id)}
              onMouseLeave={() => setHoveredLocationId(null)}
              role="button"
              tabIndex={0}
              aria-label={`Location marker: ${firstEvent.location.name}, ${events.length} events`}
              onKeyDown={e => {
                if (e.key === 'Enter' || e.key === ' ') {
                  e.preventDefault()
                  onLocationSelect?.(firstEvent.location.id)
                }
              }}
            >
              {/* Marker icon */}
              <div className="relative">
                <MapPin
                  className={cn(
                    'w-8 h-8 drop-shadow-lg transition-all',
                    getSeverityColor(maxSeverity),
                    isSelected && 'ring-4 ring-yellow-400 ring-offset-2',
                    isHovered && 'scale-125'
                  )}
                  fill="currentColor"
                />
                {events.length > 1 && (
                  <Badge
                    variant="secondary"
                    className="absolute -top-2 -right-2 h-5 w-5 p-0 flex items-center justify-center text-xs"
                  >
                    {events.length}
                  </Badge>
                )}
              </div>

              {/* Tooltip on hover */}
              {(isHovered || isSelected) && (
                <div className="absolute bottom-full left-1/2 transform -translate-x-1/2 mb-2 bg-background border rounded-lg shadow-lg p-3 min-w-48 z-50">
                  <div className="text-sm font-semibold mb-1">
                    {firstEvent.location.name}
                  </div>
                  <div className="text-xs text-muted-foreground mb-2">
                    {events.length} event{events.length !== 1 ? 's' : ''}
                  </div>
                  <div className="flex flex-wrap gap-1">
                    <Badge variant="outline" className="text-xs">
                      {firstEvent.location.type}
                    </Badge>
                    <Badge
                      variant={maxSeverity === 'critical' ? 'destructive' : 'secondary'}
                      className="text-xs"
                    >
                      {maxSeverity}
                    </Badge>
                  </div>
                  {events.length > 0 && (
                    <div className="mt-2 pt-2 border-t text-xs">
                      <div className="font-medium mb-1">Recent Events:</div>
                      {events.slice(0, 3).map(event => (
                        <div
                          key={event.id}
                          className="text-muted-foreground truncate"
                        >
                          • {event.type.replace('_', ' ')}
                        </div>
                      ))}
                      {events.length > 3 && (
                        <div className="text-muted-foreground">
                          +{events.length - 3} more
                        </div>
                      )}
                    </div>
                  )}
                </div>
              )}
            </div>
          )
        })}
      </div>

      {/* Map controls */}
      <div className="absolute top-4 right-4 flex flex-col gap-2">
        <Button
          variant="secondary"
          size="icon"
          onClick={handleZoomIn}
          aria-label="Zoom in"
          className="h-8 w-8 shadow-md"
        >
          <ZoomIn className="h-4 w-4" />
        </Button>
        <Button
          variant="secondary"
          size="icon"
          onClick={handleZoomOut}
          aria-label="Zoom out"
          className="h-8 w-8 shadow-md"
        >
          <ZoomOut className="h-4 w-4" />
        </Button>
        <Button
          variant="secondary"
          size="icon"
          onClick={handleRecenter}
          aria-label="Reset view"
          className="h-8 w-8 shadow-md"
        >
          <Crosshair className="h-4 w-4" />
        </Button>
      </div>

      {/* Legend */}
      <div className="absolute bottom-4 left-4 bg-background/90 backdrop-blur-sm border rounded-lg shadow-lg p-3">
        <div className="text-xs font-semibold mb-2">Severity Levels</div>
        <div className="space-y-1">
          {[
            { level: 'Critical', color: 'bg-red-500' },
            { level: 'High', color: 'bg-orange-500' },
            { level: 'Medium', color: 'bg-yellow-500' },
            { level: 'Low', color: 'bg-blue-500' },
            { level: 'Info', color: 'bg-slate-500' },
          ].map(({ level, color }) => (
            <div key={level} className="flex items-center gap-2 text-xs">
              <div className={cn('w-3 h-3 rounded-full', color)} />
              <span>{level}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Info panel */}
      <div className="absolute top-4 left-4 bg-background/90 backdrop-blur-sm border rounded-lg shadow-lg p-3">
        <div className="text-xs font-semibold mb-1">Map View</div>
        <div className="text-xs text-muted-foreground space-y-1">
          <div>Locations: {Object.keys(groupedLocations).length}</div>
          <div>Events: {locations.length}</div>
          <div>Zoom: {currentZoom}x</div>
        </div>
      </div>

      {/* Empty state */}
      {locations.length === 0 && (
        <div className="absolute inset-0 flex items-center justify-center">
          <div className="text-center space-y-2">
            <MapPin className="h-12 w-12 mx-auto text-muted-foreground opacity-50" />
            <p className="text-sm text-muted-foreground">
              No geographic events to display
            </p>
            <p className="text-xs text-muted-foreground">
              Events will appear here when available
            </p>
          </div>
        </div>
      )}
    </div>
  )
}

import React, { useEffect, useRef, useMemo } from 'react';
import { MapContainer, TileLayer, Marker, Popup, CircleMarker, useMap, useMapEvents } from 'react-leaflet';
import type { LatLngExpression } from 'leaflet';
import 'leaflet/dist/leaflet.css';
import type { GeoPoint, MapConfig, MapEventHandlers } from '../types';

// Tile layer URLs for different base layers
const TILE_LAYERS = {
  streets: 'https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png',
  satellite: 'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}',
  terrain: 'https://{s}.tile.opentopomap.org/{z}/{x}/{y}.png',
  dark: 'https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png',
  light: 'https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png',
};

export interface GeoMapProps {
  points?: GeoPoint[];
  config?: Partial<MapConfig>;
  events?: MapEventHandlers;
  width?: number | string;
  height?: number | string;
  className?: string;
}

// Map event handler component
const MapEvents: React.FC<{
  events?: MapEventHandlers;
}> = ({ events }) => {
  const map = useMapEvents({
    click: (e) => {
      if (events?.onMapClick) {
        events.onMapClick({ lat: e.latlng.lat, lng: e.latlng.lng }, e);
      }
    },
    moveend: () => {
      if (events?.onViewportChange) {
        events.onViewportChange(map.getBounds(), map.getZoom());
      }
    },
    zoomend: () => {
      if (events?.onViewportChange) {
        events.onViewportChange(map.getBounds(), map.getZoom());
      }
    },
  });

  return null;
};

// Point marker component
const PointMarker: React.FC<{
  point: GeoPoint;
  onClick?: (point: GeoPoint, event: any) => void;
}> = ({ point, onClick }) => {
  const position: LatLngExpression = [point.lat, point.lng];

  return (
    <CircleMarker
      center={position}
      radius={point.value ? Math.max(5, Math.min(20, point.value / 10)) : 8}
      fillColor="#1976d2"
      fillOpacity={0.7}
      stroke={true}
      weight={2}
      color="#ffffff"
      eventHandlers={{
        click: (e) => {
          if (onClick) {
            onClick(point, e);
          }
        },
      }}
    >
      {point.label && (
        <Popup>
          <div>
            <strong>{point.label}</strong>
            {point.value !== undefined && <div>Value: {point.value}</div>}
            {point.metadata && (
              <div>
                {Object.entries(point.metadata).map(([key, value]) => (
                  <div key={key}>
                    {key}: {String(value)}
                  </div>
                ))}
              </div>
            )}
          </div>
        </Popup>
      )}
    </CircleMarker>
  );
};

export const GeoMap: React.FC<GeoMapProps> = ({
  points = [],
  config = {},
  events = {},
  width = '100%',
  height = 400,
  className,
}) => {
  const mapConfig: MapConfig = {
    center: config.center || [0, 0],
    zoom: config.zoom || 2,
    minZoom: config.minZoom || 1,
    maxZoom: config.maxZoom || 18,
    baseLayer: config.baseLayer || 'streets',
    showControls: config.showControls ?? true,
    showScale: config.showScale ?? true,
    showAttribution: config.showAttribution ?? true,
  };

  const tileUrl = TILE_LAYERS[mapConfig.baseLayer];

  // Auto-fit bounds to points if no center specified
  const center = useMemo<LatLngExpression>(() => {
    if (config.center) return config.center;
    if (points.length === 0) return [0, 0];
    if (points.length === 1) return [points[0].lat, points[0].lng];

    // Calculate center of all points
    const avgLat = points.reduce((sum, p) => sum + p.lat, 0) / points.length;
    const avgLng = points.reduce((sum, p) => sum + p.lng, 0) / points.length;
    return [avgLat, avgLng];
  }, [config.center, points]);

  return (
    <div style={{ width, height }} className={className}>
      <MapContainer
        center={center}
        zoom={mapConfig.zoom}
        minZoom={mapConfig.minZoom}
        maxZoom={mapConfig.maxZoom}
        style={{ width: '100%', height: '100%' }}
        zoomControl={mapConfig.showControls}
        attributionControl={mapConfig.showAttribution}
      >
        <TileLayer
          url={tileUrl}
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
        />

        <MapEvents events={events} />

        {points.map((point, index) => (
          <PointMarker
            key={point.metadata?.id as string || `point-${index}`}
            point={point}
            onClick={events.onMarkerClick}
          />
        ))}
      </MapContainer>
    </div>
  );
};

export default GeoMap;

/**
 * Main Map Container Component with Leaflet integration
 */

import React, { useEffect, useRef, useState } from 'react';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { Box } from '@mui/material';
import type { GeoPoint } from '@intelgraph/geospatial';

export interface MapContainerProps {
  center?: GeoPoint;
  zoom?: number;
  height?: string | number;
  width?: string | number;
  minZoom?: number;
  maxZoom?: number;
  onMapReady?: (map: L.Map) => void;
  onClick?: (event: L.LeafletMouseEvent) => void;
  children?: React.ReactNode;
}

/**
 * Base map container component
 */
export const MapContainer: React.FC<MapContainerProps> = ({
  center = { latitude: 38.9072, longitude: -77.0369 }, // Washington DC default
  zoom = 10,
  height = '600px',
  width = '100%',
  minZoom = 2,
  maxZoom = 18,
  onMapReady,
  onClick,
  children,
}) => {
  const mapRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<L.Map | null>(null);
  const [isReady, setIsReady] = useState(false);

  useEffect(() => {
    if (!mapRef.current || mapInstanceRef.current) {
      return;
    }

    // Initialize map
    const map = L.map(mapRef.current, {
      center: [center.latitude, center.longitude],
      zoom,
      minZoom,
      maxZoom,
      zoomControl: true,
      attributionControl: true,
    });

    // Add base layer (OpenStreetMap)
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      attribution: '© OpenStreetMap contributors',
      maxZoom: 19,
    }).addTo(map);

    // Click handler
    if (onClick) {
      map.on('click', onClick);
    }

    mapInstanceRef.current = map;
    setIsReady(true);

    if (onMapReady) {
      onMapReady(map);
    }

    // Cleanup
    return () => {
      if (mapInstanceRef.current) {
        mapInstanceRef.current.remove();
        mapInstanceRef.current = null;
      }
    };
  }, []);

  // Update center when prop changes
  useEffect(() => {
    if (mapInstanceRef.current && isReady) {
      mapInstanceRef.current.setView([center.latitude, center.longitude], zoom);
    }
  }, [center.latitude, center.longitude, zoom, isReady]);

  return (
    <Box sx={{ position: 'relative', width, height }}>
      <div
        ref={mapRef}
        style={{
          width: '100%',
          height: '100%',
          position: 'relative',
          zIndex: 0,
        }}
      />
      {isReady && children && (
        <MapContext.Provider value={mapInstanceRef.current}>
          {children}
        </MapContext.Provider>
      )}
    </Box>
  );
};

/**
 * Context for accessing map instance in child components
 */
export const MapContext = React.createContext<L.Map | null>(null);

/**
 * Hook to access map instance
 */
export const useMap = () => {
  const map = React.useContext(MapContext);
  if (!map) {
    throw new Error('useMap must be used within a MapContainer');
  }
  return map;
};

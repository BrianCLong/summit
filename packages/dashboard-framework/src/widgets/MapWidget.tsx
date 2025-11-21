import React from 'react';
import { MapWidgetConfig } from '../types';

export interface MapWidgetProps {
  config: MapWidgetConfig;
  data?: any[];
  onRegionClick?: (region: any) => void;
  onPointClick?: (point: any) => void;
}

export function MapWidget({
  config,
  data = [],
  onRegionClick,
  onPointClick,
}: MapWidgetProps) {
  const { mapType = 'points', center = [0, 20], zoom = 2 } = config;

  // Placeholder implementation - actual implementation would use Mapbox/Leaflet/Deck.gl
  return (
    <div className="map-widget" style={containerStyle}>
      <div style={mapPlaceholderStyle}>
        <div style={{ textAlign: 'center' }}>
          <div style={{ fontSize: '48px', marginBottom: '16px' }}>🗺️</div>
          <div style={{ fontSize: '16px', fontWeight: 600, marginBottom: '8px' }}>
            {mapType.charAt(0).toUpperCase() + mapType.slice(1)} Map
          </div>
          <div style={{ fontSize: '14px', color: '#6b7280' }}>
            Center: [{center[0].toFixed(2)}, {center[1].toFixed(2)}]
          </div>
          <div style={{ fontSize: '14px', color: '#6b7280' }}>
            Zoom: {zoom} | Points: {data.length}
          </div>
          <div style={infoStyle}>
            Requires Mapbox/Leaflet integration
          </div>
        </div>
      </div>
    </div>
  );
}

const containerStyle: React.CSSProperties = {
  width: '100%',
  height: '100%',
  position: 'relative',
};

const mapPlaceholderStyle: React.CSSProperties = {
  width: '100%',
  height: '100%',
  backgroundColor: '#f0f4f8',
  backgroundImage: `
    linear-gradient(rgba(59, 130, 246, 0.1) 1px, transparent 1px),
    linear-gradient(90deg, rgba(59, 130, 246, 0.1) 1px, transparent 1px)
  `,
  backgroundSize: '40px 40px',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  borderRadius: '8px',
};

const infoStyle: React.CSSProperties = {
  marginTop: '16px',
  padding: '8px 16px',
  backgroundColor: '#fef3c7',
  color: '#92400e',
  borderRadius: '4px',
  fontSize: '12px',
};

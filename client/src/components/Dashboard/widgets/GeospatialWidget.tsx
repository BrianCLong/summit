/**
 * Geospatial Intelligence Widget
 * Geographic visualization of entities, events, and intelligence data
 */

import React, { useState, useEffect } from 'react';

interface GeoEntity {
  id: string;
  name: string;
  type: 'person' | 'organization' | 'location' | 'event';
  coordinates: [number, number]; // [lat, lng]
  properties: {
    country?: string;
    region?: string;
    city?: string;
    significance?: 'low' | 'medium' | 'high' | 'critical';
    lastActivity?: Date;
  };
}

interface GeospatialWidgetProps {
  config?: {
    mapType?: 'terrain' | 'satellite' | 'hybrid';
    showHeatmap?: boolean;
    showClusters?: boolean;
    centerCoordinates?: [number, number];
    zoom?: number;
  };
}

const GeospatialWidget: React.FC<GeospatialWidgetProps> = ({ config }) => {
  const [entities, setEntities] = useState<GeoEntity[]>([]);
  const [selectedEntity, setSelectedEntity] = useState<GeoEntity | null>(null);
  const [mapView, setMapView] = useState<'map' | 'list' | 'heatmap'>(config?.showHeatmap ? 'heatmap' : 'map');
  const [filter, setFilter] = useState<'all' | 'high-priority'>('all');

  useEffect(() => {
    // Load mock geospatial data
    loadMockGeoData();
  }, []);

  const loadMockGeoData = () => {
    const mockEntities: GeoEntity[] = [
      {
        id: 'geo-001',
        name: 'Tehran Operations Center',
        type: 'organization',
        coordinates: [35.6892, 51.3890],
        properties: {
          country: 'Iran',
          city: 'Tehran',
          significance: 'critical',
          lastActivity: new Date(Date.now() - 3600000),
        },
      },
      {
        id: 'geo-002',
        name: 'Moscow Hub',
        type: 'location',
        coordinates: [55.7558, 37.6173],
        properties: {
          country: 'Russia',
          city: 'Moscow',
          significance: 'high',
          lastActivity: new Date(Date.now() - 7200000),
        },
      },
      {
        id: 'geo-003',
        name: 'Beijing Intelligence Node',
        type: 'organization',
        coordinates: [39.9042, 116.4074],
        properties: {
          country: 'China',
          city: 'Beijing',
          significance: 'high',
          lastActivity: new Date(Date.now() - 1800000),
        },
      },
      {
        id: 'geo-004',
        name: 'Pyongyang Command',
        type: 'organization',
        coordinates: [39.0392, 125.7625],
        properties: {
          country: 'North Korea',
          city: 'Pyongyang',
          significance: 'critical',
          lastActivity: new Date(Date.now() - 900000),
        },
      },
      {
        id: 'geo-005',
        name: 'St. Petersburg Facility',
        type: 'location',
        coordinates: [59.9311, 30.3609],
        properties: {
          country: 'Russia',
          city: 'St. Petersburg',
          significance: 'medium',
          lastActivity: new Date(Date.now() - 14400000),
        },
      },
    ];

    setEntities(mockEntities);
  };

  const filteredEntities = entities.filter((entity) => {
    if (filter === 'all') return true;
    if (filter === 'high-priority') {
      return entity.properties.significance === 'high' || entity.properties.significance === 'critical';
    }
    return true;
  });

  const getSignificanceColor = (significance: string) => {
    switch (significance) {
      case 'critical':
        return '#dc2626';
      case 'high':
        return '#ea580c';
      case 'medium':
        return '#f59e0b';
      case 'low':
        return '#84cc16';
      default:
        return '#6b7280';
    }
  };

  const getEntityIcon = (type: string) => {
    switch (type) {
      case 'person':
        return '👤';
      case 'organization':
        return '🏢';
      case 'location':
        return '📍';
      case 'event':
        return '⚡';
      default:
        return '📌';
    }
  };

  return (
    <div className="geospatial-widget" style={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
      {/* Controls */}
      <div style={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: '16px',
        padding: '12px',
        background: '#1e293b',
        borderRadius: '6px',
      }}>
        <div style={{ display: 'flex', gap: '8px' }}>
          {['all', 'high-priority'].map((f) => (
            <button
              key={f}
              onClick={() => setFilter(f as any)}
              style={{
                padding: '6px 12px',
                background: filter === f ? '#3b82f6' : 'transparent',
                border: '1px solid #475569',
                borderRadius: '4px',
                color: '#f1f5f9',
                cursor: 'pointer',
                fontSize: '13px',
              }}
            >
              {f === 'all' ? 'All Entities' : 'High Priority'}
            </button>
          ))}
        </div>

        <div style={{ display: 'flex', gap: '8px' }}>
          {['map', 'list', 'heatmap'].map((v) => (
            <button
              key={v}
              onClick={() => setMapView(v as any)}
              style={{
                padding: '6px 12px',
                background: mapView === v ? '#3b82f6' : 'transparent',
                border: '1px solid #475569',
                borderRadius: '4px',
                color: '#f1f5f9',
                cursor: 'pointer',
                fontSize: '13px',
              }}
            >
              {v === 'map' && '🗺️'}
              {v === 'list' && '📋'}
              {v === 'heatmap' && '🔥'}
            </button>
          ))}
        </div>
      </div>

      {/* Statistics */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(4, 1fr)',
        gap: '12px',
        marginBottom: '16px',
      }}>
        {[
          { label: 'Total Entities', value: entities.length, icon: '📍' },
          { label: 'Critical', value: entities.filter(e => e.properties.significance === 'critical').length, icon: '🔴' },
          { label: 'Countries', value: new Set(entities.map(e => e.properties.country)).size, icon: '🌍' },
          { label: 'Active (24h)', value: entities.filter(e => e.properties.lastActivity && (Date.now() - e.properties.lastActivity.getTime()) < 86400000).length, icon: '⚡' },
        ].map((stat, idx) => (
          <div
            key={idx}
            style={{
              padding: '12px',
              background: '#1e293b',
              borderRadius: '6px',
            }}
          >
            <div style={{ fontSize: '10px', color: '#94a3b8', marginBottom: '4px' }}>
              {stat.icon} {stat.label}
            </div>
            <div style={{ fontSize: '20px', fontWeight: '700', color: '#f1f5f9' }}>
              {stat.value}
            </div>
          </div>
        ))}
      </div>

      {/* Content Area */}
      <div style={{ flex: 1, overflow: 'auto', background: '#1e293b', borderRadius: '6px', padding: '12px' }}>
        {mapView === 'map' && (
          <div style={{
            height: '100%',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            background: '#0f172a',
            borderRadius: '6px',
            position: 'relative',
          }}>
            <div style={{ textAlign: 'center', color: '#94a3b8' }}>
              <div style={{ fontSize: '48px', marginBottom: '16px' }}>🗺️</div>
              <div style={{ fontSize: '14px' }}>Interactive Map View</div>
              <div style={{ fontSize: '12px', marginTop: '8px' }}>
                Leaflet/Mapbox integration for geographic visualization
              </div>

              {/* Mock map markers */}
              <div style={{ marginTop: '24px', display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '8px', maxWidth: '400px', margin: '24px auto 0' }}>
                {filteredEntities.map((entity) => (
                  <div
                    key={entity.id}
                    style={{
                      padding: '8px',
                      background: '#1e293b',
                      border: `2px solid ${getSignificanceColor(entity.properties.significance || 'low')}`,
                      borderRadius: '6px',
                      cursor: 'pointer',
                      textAlign: 'left',
                    }}
                    onClick={() => setSelectedEntity(entity)}
                  >
                    <div style={{ fontSize: '12px', fontWeight: '600', color: '#f1f5f9' }}>
                      {getEntityIcon(entity.type)} {entity.name}
                    </div>
                    <div style={{ fontSize: '10px', color: '#94a3b8', marginTop: '4px' }}>
                      {entity.properties.city}, {entity.properties.country}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {mapView === 'list' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            {filteredEntities.map((entity) => (
              <div
                key={entity.id}
                onClick={() => setSelectedEntity(entity)}
                style={{
                  padding: '12px',
                  background: selectedEntity?.id === entity.id ? '#334155' : '#0f172a',
                  border: `1px solid ${selectedEntity?.id === entity.id ? '#3b82f6' : '#334155'}`,
                  borderRadius: '6px',
                  cursor: 'pointer',
                }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'start' }}>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontWeight: '600', color: '#f1f5f9', marginBottom: '4px' }}>
                      {getEntityIcon(entity.type)} {entity.name}
                    </div>
                    <div style={{ fontSize: '12px', color: '#cbd5e1' }}>
                      {entity.properties.city}, {entity.properties.country}
                    </div>
                    <div style={{ fontSize: '11px', color: '#94a3b8', marginTop: '4px' }}>
                      Coordinates: {entity.coordinates[0].toFixed(4)}, {entity.coordinates[1].toFixed(4)}
                    </div>
                  </div>
                  <span
                    style={{
                      padding: '2px 8px',
                      background: getSignificanceColor(entity.properties.significance || 'low'),
                      color: 'white',
                      borderRadius: '12px',
                      fontSize: '11px',
                      fontWeight: '600',
                      textTransform: 'uppercase',
                    }}
                  >
                    {entity.properties.significance}
                  </span>
                </div>
                {entity.properties.lastActivity && (
                  <div style={{ fontSize: '11px', color: '#94a3b8', marginTop: '8px' }}>
                    Last Activity: {new Date(entity.properties.lastActivity).toLocaleString()}
                  </div>
                )}
              </div>
            ))}
          </div>
        )}

        {mapView === 'heatmap' && (
          <div style={{ height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <div style={{ textAlign: 'center', color: '#94a3b8' }}>
              <div style={{ fontSize: '48px', marginBottom: '16px' }}>🔥</div>
              <div style={{ fontSize: '14px' }}>Activity Heatmap</div>
              <div style={{ fontSize: '12px', marginTop: '8px' }}>
                Density visualization of entity activities
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Selected Entity Details */}
      {selectedEntity && (
        <div style={{
          marginTop: '12px',
          padding: '12px',
          background: '#1e293b',
          borderRadius: '6px',
          borderLeft: `4px solid ${getSignificanceColor(selectedEntity.properties.significance || 'low')}`,
        }}>
          <div style={{ fontWeight: '600', color: '#f1f5f9', marginBottom: '8px' }}>
            Selected Entity Details
          </div>
          <div style={{ fontSize: '12px', color: '#cbd5e1' }}>
            <div><strong>Name:</strong> {selectedEntity.name}</div>
            <div><strong>Type:</strong> {selectedEntity.type}</div>
            <div><strong>Location:</strong> {selectedEntity.properties.city}, {selectedEntity.properties.country}</div>
            <div><strong>Coordinates:</strong> {selectedEntity.coordinates.join(', ')}</div>
            {selectedEntity.properties.lastActivity && (
              <div><strong>Last Activity:</strong> {new Date(selectedEntity.properties.lastActivity).toLocaleString()}</div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default GeospatialWidget;

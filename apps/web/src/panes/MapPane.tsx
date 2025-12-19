import React, { useEffect, useMemo } from 'react';
import { MapContainer, TileLayer, CircleMarker, Popup, useMap } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import { useWorkspaceStore } from '../store/workspaceStore';

// Component to handle map centering based on selection
const MapUpdater = ({ selectedIds, entities }: { selectedIds: string[], entities: any[] }) => {
  const map = useMap();

  useEffect(() => {
    if (selectedIds.length > 0) {
      const selectedEntities = entities.filter(e => selectedIds.includes(e.id) && e.lat && e.lng);
      if (selectedEntities.length > 0) {
        const bounds = selectedEntities.map(e => [e.lat, e.lng]);
        // @ts-ignore
        map.fitBounds(bounds, { padding: [50, 50], maxZoom: 13 });
      }
    }
  }, [selectedIds, entities, map]);

  return null;
};

export const MapPane = () => {
  const { entities, selectedEntityIds, selectEntity } = useWorkspaceStore();

  const markers = useMemo(() => {
    return entities.filter(e => e.lat && e.lng);
  }, [entities]);

  return (
    <div className="w-full h-full relative bg-slate-900 border border-slate-800 rounded-lg overflow-hidden flex flex-col">
      <div className="absolute top-2 left-2 z-[1000] bg-slate-900/80 backdrop-blur px-3 py-1 rounded text-xs font-mono text-cyan-400 border border-cyan-900/50">
        GEOSPATIAL INTELLIGENCE
      </div>
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

        {markers.map((entity) => {
          const isSelected = selectedEntityIds.includes(entity.id);
          return (
            <CircleMarker
              key={entity.id}
              center={[entity.lat!, entity.lng!]}
              radius={isSelected ? 8 : 5}
              pathOptions={{
                color: isSelected ? '#22d3ee' : '#94a3b8',
                fillColor: isSelected ? '#06b6d4' : '#475569',
                fillOpacity: 0.7,
                weight: isSelected ? 2 : 1
              }}
              eventHandlers={{
                click: () => selectEntity(entity.id),
              }}
            >
              <Popup className="map-popup">
                <div className="text-slate-900">
                  <strong className="block border-b border-slate-200 pb-1 mb-1">{entity.label}</strong>
                  <span className="text-xs">{entity.type}</span>
                  <p className="text-xs mt-1 text-slate-600">{entity.description}</p>
                </div>
              </Popup>
            </CircleMarker>
          );
        })}
        <MapUpdater selectedIds={selectedEntityIds} entities={entities} />
      </MapContainer>
    </div>
  );
};

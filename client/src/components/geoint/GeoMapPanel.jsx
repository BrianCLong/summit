import React, { useMemo } from 'react';
import { MapContainer, TileLayer, Marker, Popup, CircleMarker } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';

function GeoMapPanel({ nodes = [], showHeat = false, clusters = [] }) {
  const locs = useMemo(() => (nodes || []).map(n => n.data || n).filter(n => n.type === 'LOCATION' && (n.properties?.latitude && n.properties?.longitude)), [nodes]);
  const center = locs.length ? [locs[0].properties.latitude, locs[0].properties.longitude] : [20, 0];
  const zoom = locs.length ? 5 : 2;
  return (
    <div style={{ width: '100%', height: '100%' }}>
      <MapContainer center={center} zoom={zoom} style={{ width: '100%', height: '100%' }}>
        <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" attribution="&copy; OpenStreetMap contributors" />
        {locs.map((n) => (
          <Marker key={n.id} position={[n.properties.latitude, n.properties.longitude]}>
            <Popup>
              <b>{n.label}</b>
            </Popup>
          </Marker>
        ))}
        {showHeat && locs.map((n, i) => (
          <CircleMarker key={`heat-${i}`} center={[n.properties.latitude, n.properties.longitude]} radius={8} pathOptions={{ color: 'rgba(255,99,71,0.5)', fillColor: 'rgba(255,99,71,0.35)', fillOpacity: 0.35 }} />
        ))}
        {(clusters || []).map((c, idx) => (
          <CircleMarker key={`cluster-${idx}`} center={[c.centroid.latitude, c.centroid.longitude]} radius={Math.min(30, 6 + (c.size || 1))} pathOptions={{ color: '#1976d2', fillColor: '#64b5f6', fillOpacity: 0.35 }}>
            <Popup>
              Cluster size: {c.size}
            </Popup>
          </CircleMarker>
        ))}
      </MapContainer>
    </div>
  );
}

export default GeoMapPanel;

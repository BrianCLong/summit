import React, { useMemo } from 'react';
import { MapContainer, TileLayer, Marker, Popup } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';

function GeoMapPanel({ nodes = [] }) {
  const locs = useMemo(() => (nodes || []).map(n => n.data || n).filter(n => n.type === 'LOCATION' && (n.properties?.latitude && n.properties?.longitude)), [nodes]);
  const center = locs.length ? [locs[0].properties.latitude, locs[0].properties.longitude] : [20, 0];
  const zoom = locs.length ? 5 : 2;
  return (
    <div style={{ width: 360, height: 240 }}>
      <MapContainer center={center} zoom={zoom} style={{ width: '100%', height: '100%' }}>
        <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" attribution="&copy; OpenStreetMap contributors" />
        {locs.map((n) => (
          <Marker key={n.id} position={[n.properties.latitude, n.properties.longitude]}>
            <Popup>
              <b>{n.label}</b>
            </Popup>
          </Marker>
        ))}
      </MapContainer>
    </div>
  );
}

export default GeoMapPanel;


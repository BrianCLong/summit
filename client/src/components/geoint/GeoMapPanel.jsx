import React, { useMemo } from 'react';
import { MapContainer, TileLayer, Marker, Popup, CircleMarker, Polygon, Circle, useMap } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';

function HeatLayer({ points = [] }) {
  const map = useMap();
  React.useEffect(() => {
    let layer;
    try {
      const heat = (L && L.heatLayer) || (typeof window !== 'undefined' && window.L && window.L.heatLayer);
      if (heat) {
        const latlngs = points.map(p => [p.properties.latitude, p.properties.longitude, 0.6]);
        layer = heat(latlngs, { radius: 20, blur: 15 });
        layer.addTo(map);
      }
    } catch {}
    return () => { if (layer) map.removeLayer(layer); };
  }, [map, points]);
  return null;
}

function GeoMapPanel({ nodes = [], showHeat = false, clusters = [], clusterPolygons = [], contours = [] }) {
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
        {showHeat ? <HeatLayer points={locs} /> : locs.map((n, i) => (
          <CircleMarker key={`heat-${i}`} center={[n.properties.latitude, n.properties.longitude]} radius={6} pathOptions={{ color: 'rgba(255,99,71,0.4)', fillColor: 'rgba(255,99,71,0.25)', fillOpacity: 0.25 }} />
        ))}
        {(clusters || []).map((c, idx) => (
          <CircleMarker key={`cluster-${idx}`} center={[c.centroid.latitude, c.centroid.longitude]} radius={Math.min(30, 6 + (c.size || 1))} pathOptions={{ color: '#1976d2', fillColor: '#64b5f6', fillOpacity: 0.35 }}>
            <Popup>
              Cluster size: {c.size}
            </Popup>
          </CircleMarker>
        ))}
        {(clusterPolygons || []).map((poly, i) => (
          <>
            <Polygon key={`poly-${i}-a`} positions={poly} pathOptions={{ color: '#1976d2', weight: 1, fillOpacity: 0.18, fillColor: '#64b5f6' }} />
            <Polygon key={`poly-${i}-b`} positions={poly} pathOptions={{ color: '#1976d2', weight: 0, fillOpacity: 0.08, fillColor: '#90caf9' }} />
          </>
        ))}
        {(contours || []).map((rings, idx) => (
          <>
            {rings.map((ring, j) => (
              <Circle key={`contour-${idx}-${j}`} center={[ring.lat, ring.lon]} radius={ring.radiusM} pathOptions={{ color: '#ff8f00', weight: 1, fillOpacity: 0.04 * (3 - j), fillColor: '#ffa000' }} />
            ))}
          </>
        ))}
      </MapContainer>
    </div>
  );
}

export default GeoMapPanel;

import React from "react";
import { MapContainer, TileLayer, CircleMarker } from "react-leaflet";
import "leaflet/dist/leaflet.css";

export default function RiskHeatmap({ points }) {
  return (
    <MapContainer
      style={{ height: "100%", width: "100%" }}
      center={[0, 0]}
      zoom={2}
    >
      <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />
      {points.map((p, idx) => (
        <CircleMarker
          key={idx}
          center={[p.lat, p.lon]}
          radius={10}
          pathOptions={{
            color: p.risk > 0.6 ? "red" : p.risk > 0.3 ? "orange" : "green",
            fillOpacity: 0.5,
          }}
        />
      ))}
    </MapContainer>
  );
}

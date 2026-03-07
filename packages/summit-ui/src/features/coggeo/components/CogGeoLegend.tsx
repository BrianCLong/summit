import React from "react";
import type { LayerKind } from "./LayerToggles.js";

export function CogGeoLegend(props: { layer: LayerKind }) {
  const labels: Record<LayerKind, { title: string; low: string; high: string }> = {
    storm: { title: "Storm score", low: "Low", high: "High" },
    pressure: { title: "Pressure", low: "Low", high: "High" },
    temperature: { title: "Temperature", low: "Cool", high: "Hot" },
    turbulence: { title: "Turbulence", low: "Stable", high: "Chaotic" },
    wind: { title: "Wind", low: "Weak", high: "Strong" },
  };

  return (
    <div
      style={{
        minWidth: 180,
        background: "rgba(255,255,255,0.92)",
        border: "1px solid #e5e7eb",
        borderRadius: 10,
        padding: 10,
        boxShadow: "0 6px 16px rgba(0,0,0,0.08)",
      }}
    >
      <div style={{ fontWeight: 600, marginBottom: 8 }}>{labels[props.layer].title}</div>
      <div
        style={{
          height: 12,
          borderRadius: 999,
          background: "linear-gradient(to right, #f8fafc, #fecaca, #dc2626, #7f1d1d)",
          marginBottom: 6,
        }}
      />
      <div style={{ display: "flex", justifyContent: "space-between", fontSize: 12, color: "#4b5563" }}>
        <span>{labels[props.layer].low}</span>
        <span>{labels[props.layer].high}</span>
      </div>
    </div>
  );
}

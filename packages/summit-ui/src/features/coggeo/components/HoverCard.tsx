import React from "react";
import type { HoverFeatureSummary } from "./MapboxTerrainLayer.js";

export function HoverCard(props: { feature: HoverFeatureSummary | null }) {
  if (!props.feature) return null;

  return (
    <div
      style={{
        minWidth: 240,
        background: "rgba(255,255,255,0.95)",
        border: "1px solid #e5e7eb",
        borderRadius: 10,
        padding: 12,
        boxShadow: "0 8px 20px rgba(0,0,0,0.08)",
      }}
    >
      <div style={{ fontWeight: 600, marginBottom: 6 }}>Terrain cell</div>
      <div style={{ fontSize: 12, color: "#6b7280", marginBottom: 8 }}>{props.feature.id}</div>

      <div style={{ display: "grid", gridTemplateColumns: "auto 1fr", gap: "4px 8px", fontSize: 13 }}>
        <div style={{ color: "#6b7280" }}>H3</div>
        <div>{props.feature.h3 ?? "—"}</div>

        <div style={{ color: "#6b7280" }}>Narrative</div>
        <div>{props.feature.narrativeId ?? "—"}</div>

        <div style={{ color: "#6b7280" }}>Value</div>
        <div>{props.feature.value ?? "—"}</div>

        <div style={{ color: "#6b7280" }}>Pressure</div>
        <div>{props.feature.pressure ?? "—"}</div>

        <div style={{ color: "#6b7280" }}>Temp</div>
        <div>{props.feature.temperature ?? "—"}</div>

        <div style={{ color: "#6b7280" }}>Storm</div>
        <div>{props.feature.stormScore ?? "—"}</div>

        <div style={{ color: "#6b7280" }}>Turbulence</div>
        <div>{props.feature.turbulence ?? "—"}</div>
      </div>
    </div>
  );
}

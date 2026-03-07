import React from "react";

export type LayerKind = "pressure" | "temperature" | "storm" | "wind" | "turbulence";

export function LayerToggles(props: {
  enabled: Record<LayerKind, boolean>;
  onToggle: (k: LayerKind) => void;
}) {
  const items: LayerKind[] = ["pressure", "temperature", "storm", "wind", "turbulence"];
  return (
    <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
      {items.map((k) => (
        <label key={k} style={{ display: "flex", gap: 6, alignItems: "center" }}>
          <input
            type="checkbox"
            checked={props.enabled[k]}
            onChange={() => props.onToggle(k)}
          />
          <span>{k}</span>
        </label>
      ))}
    </div>
  );
}

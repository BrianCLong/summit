import React from "react";

export type Layer = "reality" | "narrative" | "belief";

export function LayerToggle(props: {
  enabled: Record<Layer, boolean>;
  onChange: (next: Record<Layer, boolean>) => void;
}) {
  const { enabled, onChange } = props;

  const toggle = (k: Layer) => {
    onChange({ ...enabled, [k]: !enabled[k] });
  };

  return (
    <div className="flex gap-2 items-center">
      {(["reality", "narrative", "belief"] as Layer[]).map((k) => (
        <button
          key={k}
          className={`px-3 py-1 rounded-2xl border text-sm ${
            enabled[k] ? "bg-black text-white" : "bg-white"
          }`}
          onClick={() => toggle(k)}
        >
          {k}
        </button>
      ))}
    </div>
  );
}

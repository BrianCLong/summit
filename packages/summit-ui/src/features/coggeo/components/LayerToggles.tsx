import type { FC } from "react";

type Props = {
  layers: Record<string, boolean>;
  onToggle: (layer: string) => void;
};

export const LayerToggles: FC<Props> = ({ layers, onToggle }) => (
  <div>
    {Object.entries(layers).map(([layer, enabled]) => (
      <label key={layer} style={{ display: "block" }}>
        <input type="checkbox" checked={enabled} onChange={() => onToggle(layer)} />
        {layer}
      </label>
    ))}
  </div>
);

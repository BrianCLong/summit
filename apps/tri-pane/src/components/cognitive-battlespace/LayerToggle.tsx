import React from 'react';

export type Layer = 'reality' | 'narrative' | 'belief';

export function LayerToggle(props: {
  enabled: Record<Layer, boolean>;
  onChange: (next: Record<Layer, boolean>) => void;
}) {
  const toggle = (layer: Layer) => {
    props.onChange({ ...props.enabled, [layer]: !props.enabled[layer] });
  };

  return (
    <div className="flex items-center gap-2">
      {(['reality', 'narrative', 'belief'] as Layer[]).map((layer) => (
        <button
          key={layer}
          className={`rounded-full border px-3 py-1 text-xs ${
            props.enabled[layer] ? 'bg-sand text-midnight' : 'text-sand'
          }`}
          onClick={() => toggle(layer)}
        >
          {layer}
        </button>
      ))}
    </div>
  );
}

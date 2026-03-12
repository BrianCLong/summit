import React from 'react';

export function EffectPropagationView() {
  return (
    <div className="space-y-3">
      <span className="text-xs text-zinc-500">First and second-order effect visualization</span>
      <div className="rounded border border-zinc-800 p-3 min-h-[120px]">
        <p className="text-xs text-zinc-500">Cascading effect tree showing how interventions propagate through connected systems. Visualizes direct impacts and ripple effects across world-model dimensions.</p>
      </div>
    </div>
  );
}

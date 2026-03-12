import React from 'react';

export function InterventionImpactMap() {
  return (
    <div className="space-y-3">
      <span className="text-xs text-zinc-500">Intervention effect propagation across world dimensions</span>
      <div className="rounded border border-zinc-800 p-3 min-h-[120px]">
        <p className="text-xs text-zinc-500">Shows which intervention changes the outcome most. Visualizes first and second-order effects across dimensions with cascading dependency paths.</p>
      </div>
    </div>
  );
}

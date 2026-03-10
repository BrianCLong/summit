import React from 'react';
import type { WorldDimension, DimensionType } from '../types';

const STATE_INDICATORS: Record<string, { color: string; label: string }> = {
  stable: { color: 'bg-emerald-500', label: 'Stable' },
  shifting: { color: 'bg-amber-500', label: 'Shifting' },
  volatile: { color: 'bg-orange-500', label: 'Volatile' },
  critical: { color: 'bg-red-500', label: 'Critical' },
};

export function SystemDynamicsView() {
  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <span className="text-xs text-zinc-500">Rolling world-state across linked dimensions</span>
        <div className="flex gap-2">
          {Object.entries(STATE_INDICATORS).map(([key, { color, label }]) => (
            <div key={key} className="flex items-center gap-1">
              <div className={`h-2 w-2 rounded-full ${color}`} />
              <span className="text-[10px] text-zinc-500">{label}</span>
            </div>
          ))}
        </div>
      </div>
      <div className="rounded border border-zinc-800 p-3 min-h-[150px]">
        <p className="text-xs text-zinc-500">System dynamics visualization will display linked geopolitical, technical, narrative, economic, social, environmental, and military factors. Shows cascading dependencies and second-order effects.</p>
      </div>
    </div>
  );
}

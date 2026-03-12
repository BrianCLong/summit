import React, { useState } from 'react';
import type { Forecast, ForecastStatus } from '../types';

const STATUS_STYLES: Record<ForecastStatus, string> = {
  draft: 'bg-zinc-700 text-zinc-300',
  active: 'bg-cyan-900 text-cyan-300',
  expired: 'bg-zinc-800 text-zinc-500',
  invalidated: 'bg-red-900 text-red-300',
  confirmed: 'bg-emerald-900 text-emerald-300',
};

export function ForecastOverview() {
  const [filter, setFilter] = useState<ForecastStatus | 'all'>('all');

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2">
        <span className="text-xs text-zinc-500">Filter:</span>
        {(['all', 'active', 'draft', 'confirmed', 'expired', 'invalidated'] as const).map((s) => (
          <button
            key={s}
            onClick={() => setFilter(s)}
            className={`rounded px-2 py-0.5 text-xs transition-colors ${
              filter === s ? 'bg-cyan-600 text-white' : 'bg-zinc-800 text-zinc-400 hover:bg-zinc-700'
            }`}
          >
            {s.toUpperCase()}
          </button>
        ))}
      </div>
      <div className="space-y-2">
        <div className="rounded border border-zinc-800 p-3">
          <p className="text-xs text-zinc-500">Connect forecast data sources (CWMI, VTII, Evolution Intelligence) to populate forecast trajectories, confidence bands, and leading indicators.</p>
        </div>
      </div>
    </div>
  );
}

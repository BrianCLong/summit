import React, { useState } from 'react';
import type { NarrativeCluster, NarrativeStance } from '../types';

const STANCE_COLORS: Record<NarrativeStance, string> = {
  adversarial: 'border-red-500 bg-red-950',
  defensive: 'border-blue-500 bg-blue-950',
  neutral: 'border-zinc-500 bg-zinc-900',
  allied: 'border-emerald-500 bg-emerald-950',
  unknown: 'border-zinc-700 bg-zinc-900',
};

const STANCE_TEXT: Record<NarrativeStance, string> = {
  adversarial: 'text-red-400',
  defensive: 'text-blue-400',
  neutral: 'text-zinc-400',
  allied: 'text-emerald-400',
  unknown: 'text-zinc-500',
};

export function NarrativeClusterView() {
  const [stanceFilter, setStanceFilter] = useState<NarrativeStance | 'all'>('all');

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2">
        <span className="text-xs text-zinc-500">Stance:</span>
        {(['all', 'adversarial', 'defensive', 'neutral', 'allied', 'unknown'] as const).map((s) => (
          <button
            key={s}
            onClick={() => setStanceFilter(s)}
            className={`rounded px-2 py-0.5 text-xs transition-colors ${
              stanceFilter === s ? 'bg-rose-600 text-white' : 'bg-zinc-800 text-zinc-400 hover:bg-zinc-700'
            }`}
          >
            {s.toUpperCase()}
          </button>
        ))}
      </div>
      <div className="rounded border border-zinc-800 p-3 min-h-[150px]">
        <p className="text-xs text-zinc-500">Narrative cluster visualization: maps competing narratives, detects coordinated influence patterns, and correlates narratives to actors, channels, and outcomes. Data from Narrative Intelligence engine and IntelGraph.</p>
      </div>
    </div>
  );
}

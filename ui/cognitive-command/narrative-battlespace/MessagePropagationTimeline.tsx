import React from 'react';
import type { PropagationEvent } from '../types';

export function MessagePropagationTimeline() {
  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <span className="text-xs text-zinc-500">Message propagation over time</span>
        <select className="rounded bg-zinc-800 px-2 py-1 text-xs text-zinc-300 border border-zinc-700">
          <option value="1h">Last 1h</option>
          <option value="6h">Last 6h</option>
          <option value="24h">Last 24h</option>
          <option value="7d">Last 7d</option>
        </select>
      </div>
      <div className="rounded border border-zinc-800 p-3 min-h-[120px]">
        <p className="text-xs text-zinc-500">Timeline visualization showing message propagation events with amplification factors, reach deltas, and coordinated activity detection. Data from timeline fusion engine.</p>
      </div>
    </div>
  );
}

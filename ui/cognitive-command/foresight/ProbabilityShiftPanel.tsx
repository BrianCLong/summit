import React from 'react';
import type { ProbabilityShift } from '../types';

export function ProbabilityShiftPanel() {
  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <span className="text-xs text-zinc-500">Recent probability movements</span>
        <select className="rounded bg-zinc-800 px-2 py-1 text-xs text-zinc-300 border border-zinc-700">
          <option value="24h">Last 24h</option>
          <option value="7d">Last 7d</option>
          <option value="30d">Last 30d</option>
        </select>
      </div>
      <div className="rounded border border-zinc-800 p-3">
        <p className="text-xs text-zinc-500">Probability shift timeline will display here. Shows forecast probability changes over time with driver annotations.</p>
      </div>
    </div>
  );
}

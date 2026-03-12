import React from 'react';

export function ScenarioBranchComparator() {
  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <h3 className="text-xs font-semibold text-zinc-300">Scenario Branch Comparator</h3>
        <button className="rounded bg-zinc-800 px-2 py-1 text-xs text-zinc-400 hover:bg-zinc-700">Add Branch</button>
      </div>
      <div className="rounded border border-zinc-800 p-3 min-h-[150px]">
        <p className="text-xs text-zinc-500">Side-by-side comparison of simulated branches across metrics, timeframes, and confidence levels.</p>
      </div>
    </div>
  );
}

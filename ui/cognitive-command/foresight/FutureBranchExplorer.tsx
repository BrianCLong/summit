import React, { useState } from 'react';
import type { ForecastBranch } from '../types';

export function FutureBranchExplorer() {
  const [selectedBranchId, setSelectedBranchId] = useState<string | null>(null);

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <h3 className="text-xs font-semibold text-zinc-300">Future Branch Explorer</h3>
        <div className="flex items-center gap-2">
          <button className="rounded bg-zinc-800 px-2 py-1 text-xs text-zinc-400 hover:bg-zinc-700">Baseline</button>
          <button className="rounded bg-zinc-800 px-2 py-1 text-xs text-zinc-400 hover:bg-zinc-700">Intervention</button>
        </div>
      </div>
      <div className="rounded border border-zinc-800 p-3 min-h-[200px]">
        <p className="text-xs text-zinc-500">Branch tree visualization will render here. Compares baseline vs intervention scenarios with confidence bands and uncertainty visualization.</p>
      </div>
    </div>
  );
}

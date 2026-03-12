import React from 'react';

export function GovernanceRiskRadar() {
  return (
    <div className="space-y-3">
      <span className="text-xs text-zinc-500">Risk radar across governance domains</span>
      <div className="rounded border border-zinc-800 p-3 min-h-[120px]">
        <p className="text-xs text-zinc-500">Radar chart connecting policy engine, risk forecaster, entropy monitor, and agent sandbox controls. Shows risk levels across dimensions with trend indicators.</p>
      </div>
    </div>
  );
}

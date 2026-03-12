import React from 'react';

interface MissionIntelSummaryProps {
  missionId: string | null;
}

export function MissionIntelSummary({ missionId }: MissionIntelSummaryProps) {
  return (
    <div className="space-y-3">
      <span className="text-xs text-zinc-500">
        {missionId ? `Intelligence summary for mission ${missionId}` : 'Select a mission for intel summary'}
      </span>
      <div className="rounded border border-zinc-800 p-3 min-h-[120px]">
        <p className="text-xs text-zinc-500">Aggregated intelligence summary: threats, opportunities, recommendations, active simulations, and intelligence gaps with fill status.</p>
      </div>
    </div>
  );
}

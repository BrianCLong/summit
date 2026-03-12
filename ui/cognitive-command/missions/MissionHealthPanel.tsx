import React from 'react';

interface MissionHealthPanelProps {
  missionId: string | null;
}

export function MissionHealthPanel({ missionId }: MissionHealthPanelProps) {
  return (
    <div className="space-y-3">
      <span className="text-xs text-zinc-500">
        {missionId ? `Health metrics for mission ${missionId}` : 'Select a mission to view health'}
      </span>
      <div className="rounded border border-zinc-800 p-3 min-h-[120px]">
        <p className="text-xs text-zinc-500">Mission health dashboard: progress bars, intelligence gap count, active analyst and agent count, blocker status, and time-to-target tracking.</p>
      </div>
    </div>
  );
}

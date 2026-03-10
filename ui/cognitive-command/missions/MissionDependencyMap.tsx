import React from 'react';

interface MissionDependencyMapProps {
  missionId: string | null;
}

export function MissionDependencyMap({ missionId }: MissionDependencyMapProps) {
  return (
    <div className="space-y-3">
      <span className="text-xs text-zinc-500">
        {missionId ? `Dependencies for mission ${missionId}` : 'Select a mission to view dependencies'}
      </span>
      <div className="rounded border border-zinc-800 p-3 min-h-[120px]">
        <p className="text-xs text-zinc-500">Dependency graph showing blocks, informs, requires, and supports relationships between missions. Highlights blocked or pending dependencies.</p>
      </div>
    </div>
  );
}

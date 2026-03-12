import React from 'react';

export function MissionEscalationBoard() {
  return (
    <div className="space-y-3">
      <span className="text-xs text-zinc-500">Missions requiring escalation</span>
      <div className="rounded border border-zinc-800 p-3 min-h-[120px]">
        <p className="text-xs text-zinc-500">Board of missions in critical or decision_required state. Shows escalation reasons, time in state, and recommended actions for leadership attention.</p>
      </div>
    </div>
  );
}

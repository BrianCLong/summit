import React from 'react';

export function TaskEscalationPanel() {
  return (
    <div className="space-y-3">
      <span className="text-xs text-zinc-500">Tasks requiring human attention</span>
      <div className="rounded border border-zinc-800 p-3 min-h-[120px]">
        <p className="text-xs text-zinc-500">Escalated tasks with reasons, confidence levels, and recommended actions. Supports reassignment, approval, or dismissal workflows.</p>
      </div>
    </div>
  );
}

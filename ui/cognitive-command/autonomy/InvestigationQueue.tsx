import React from 'react';

export function InvestigationQueue() {
  return (
    <div className="space-y-3">
      <span className="text-xs text-zinc-500">Queued and active investigations</span>
      <div className="rounded border border-zinc-800 p-3 min-h-[120px]">
        <p className="text-xs text-zinc-500">Priority-ordered queue of investigations assigned to autonomous agents. Shows task priorities, estimated completion, and resource allocation.</p>
      </div>
    </div>
  );
}

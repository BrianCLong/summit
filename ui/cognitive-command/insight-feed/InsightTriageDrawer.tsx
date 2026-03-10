import React from 'react';

interface InsightTriageDrawerProps {
  onClose: () => void;
}

export function InsightTriageDrawer({ onClose }: InsightTriageDrawerProps) {
  return (
    <div className="fixed inset-y-0 right-0 z-50 flex w-96 flex-col border-l border-zinc-800 bg-zinc-950 shadow-2xl">
      <div className="flex h-10 items-center justify-between border-b border-zinc-800 px-4">
        <h3 className="text-xs font-semibold uppercase text-zinc-300">Triage Insight</h3>
        <button onClick={onClose} className="text-zinc-500 hover:text-zinc-300 text-sm">&times;</button>
      </div>
      <div className="flex-1 overflow-auto p-4">
        <p className="text-xs text-zinc-500">Triage workflow: assign category, set urgency, link to mission or investigation, add analyst notes, and route to appropriate team or agent.</p>
      </div>
      <div className="flex gap-2 border-t border-zinc-800 p-4">
        <button className="flex-1 rounded bg-cyan-700 px-3 py-1.5 text-xs font-medium text-white hover:bg-cyan-600 transition-colors">Investigate</button>
        <button className="flex-1 rounded bg-zinc-700 px-3 py-1.5 text-xs font-medium text-zinc-300 hover:bg-zinc-600 transition-colors">Dismiss</button>
      </div>
    </div>
  );
}

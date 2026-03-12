import React from 'react';

export function HumanApprovalGate() {
  return (
    <div className="space-y-3">
      <span className="text-xs text-zinc-500">High-impact actions pending approval</span>
      <div className="rounded border border-zinc-800 p-3 min-h-[120px]">
        <div className="flex flex-col gap-2">
          <p className="text-xs text-zinc-500">Approval queue for actions exceeding agent safety boundaries. Shows action description, risk assessment, and tool usage context. Monitors safety boundary status.</p>
          <div className="flex gap-2">
            <button className="rounded bg-emerald-700 px-2 py-1 text-xs text-white hover:bg-emerald-600 transition-colors" disabled>Approve</button>
            <button className="rounded bg-red-800 px-2 py-1 text-xs text-white hover:bg-red-700 transition-colors" disabled>Reject</button>
          </div>
        </div>
      </div>
    </div>
  );
}

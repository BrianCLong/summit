import React from 'react';
import type { AuditEntry } from '../types';

export function DecisionAuditTrail() {
  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <span className="text-xs text-zinc-500">Complete decision rationale and evidence chain</span>
        <button className="rounded bg-zinc-800 px-2 py-1 text-xs text-zinc-400 hover:bg-zinc-700">Export</button>
      </div>
      <div className="rounded border border-zinc-800 p-3 min-h-[120px]">
        <p className="text-xs text-zinc-500">Chronological audit trail: captures assumptions, constraints, selected options, rationale, evidence basis, and outcome reviews. Full provenance and auditability.</p>
      </div>
    </div>
  );
}

import React from 'react';

export function DecisionCompliancePanel() {
  return (
    <div className="space-y-3">
      <span className="text-xs text-zinc-500">Decision compliance tracking</span>
      <div className="rounded border border-zinc-800 p-3 min-h-[120px]">
        <p className="text-xs text-zinc-500">Tracks compliance of executed decisions against governance policies. Maintains audit trails and links to decision audit logs.</p>
      </div>
    </div>
  );
}

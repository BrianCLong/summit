import React from 'react';
import type { InterventionOption } from '../types';

export function OptionComparator() {
  return (
    <div className="space-y-3">
      <span className="text-xs text-zinc-500">Compare expected outcomes across options</span>
      <div className="rounded border border-zinc-800 p-3 min-h-[120px]">
        <p className="text-xs text-zinc-500">Side-by-side comparison matrix of intervention options. Shows costs, risks, confidence levels, and forecast effects for each option with branching by time horizon.</p>
      </div>
    </div>
  );
}

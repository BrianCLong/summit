import React from 'react';
import type { InterventionOption, InterventionStatus } from '../types';

const STATUS_COLORS: Record<InterventionStatus, string> = {
  draft: 'bg-zinc-700 text-zinc-300',
  proposed: 'bg-cyan-900 text-cyan-300',
  approved: 'bg-emerald-900 text-emerald-300',
  executing: 'bg-amber-900 text-amber-300',
  completed: 'bg-green-900 text-green-300',
  rejected: 'bg-red-900 text-red-300',
  withdrawn: 'bg-zinc-800 text-zinc-500',
};

export function InterventionPlanner() {
  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <span className="text-xs text-zinc-500">Define and manage candidate interventions</span>
        <button className="rounded bg-emerald-700 px-3 py-1 text-xs font-medium text-white hover:bg-emerald-600 transition-colors">
          + New Intervention
        </button>
      </div>
      <div className="rounded border border-zinc-800 p-3">
        <p className="text-xs text-zinc-500">Each intervention includes: objective, target, mechanism, constraints, forecast effect, downside risk, confidence level, evidence basis, relevant simulations, linked narratives, linked entities and missions.</p>
      </div>
    </div>
  );
}

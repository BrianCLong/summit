import React from 'react';
import type { GovernanceGate, GateStatus } from '../types';

const GATE_STATUS_COLORS: Record<GateStatus, string> = {
  open: 'bg-emerald-900 text-emerald-300',
  pending_approval: 'bg-amber-900 text-amber-300',
  approved: 'bg-cyan-900 text-cyan-300',
  rejected: 'bg-red-900 text-red-300',
  override: 'bg-violet-900 text-violet-300',
};

export function PolicyForecastGate() {
  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <span className="text-xs text-zinc-500">Active policy and forecast gates</span>
        <div className="flex gap-2">
          {Object.entries(GATE_STATUS_COLORS).map(([status, cls]) => (
            <span key={status} className={`rounded px-1.5 py-0.5 text-[10px] ${cls}`}>
              {status.replace('_', ' ')}
            </span>
          ))}
        </div>
      </div>
      <div className="rounded border border-zinc-800 p-3 min-h-[150px]">
        <p className="text-xs text-zinc-500">Connects RepoOS policy and risk signals to strategic operations. Requires approval for sensitive interventions. Shows policy constraints, forecasted risk, and audit trails.</p>
      </div>
    </div>
  );
}

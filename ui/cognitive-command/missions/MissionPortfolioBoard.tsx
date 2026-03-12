import React from 'react';
import type { MissionCommandState, MissionState } from '../types';

const STATE_COLORS: Record<MissionState, { bg: string; text: string; border: string }> = {
  green: { bg: 'bg-emerald-950', text: 'text-emerald-400', border: 'border-emerald-700' },
  watch: { bg: 'bg-amber-950', text: 'text-amber-400', border: 'border-amber-700' },
  degraded: { bg: 'bg-orange-950', text: 'text-orange-400', border: 'border-orange-700' },
  critical: { bg: 'bg-red-950', text: 'text-red-400', border: 'border-red-700' },
  decision_required: { bg: 'bg-violet-950', text: 'text-violet-400', border: 'border-violet-700' },
};

interface MissionPortfolioBoardProps {
  onSelect?: (missionId: string) => void;
}

export function MissionPortfolioBoard({ onSelect }: MissionPortfolioBoardProps) {
  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <span className="text-xs text-zinc-500">All active missions</span>
        <div className="flex gap-2">
          {Object.entries(STATE_COLORS).map(([state, colors]) => (
            <span key={state} className="flex items-center gap-1 text-[10px]">
              <span className={`h-2 w-2 rounded-full ${colors.bg} border ${colors.border}`} />
              <span className={colors.text}>{state.replace('_', ' ')}</span>
            </span>
          ))}
        </div>
      </div>
      <div className="rounded border border-zinc-800 p-3 min-h-[150px]">
        <p className="text-xs text-zinc-500">Mission portfolio board showing health, progress, and state for all simultaneous missions. Highlights missions requiring leadership attention. Click a mission to see details in adjacent panels.</p>
      </div>
    </div>
  );
}

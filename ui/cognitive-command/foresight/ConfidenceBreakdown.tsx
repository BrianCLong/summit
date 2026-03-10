import React from 'react';
import type { ConfidenceLevel } from '../types';

const CONFIDENCE_COLORS: Record<ConfidenceLevel, string> = {
  very_low: 'bg-red-600',
  low: 'bg-orange-500',
  medium: 'bg-amber-500',
  high: 'bg-emerald-500',
  very_high: 'bg-cyan-500',
};

export function ConfidenceBreakdown() {
  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <span className="text-xs text-zinc-500">Confidence distribution across active forecasts</span>
      </div>
      <div className="flex gap-1 h-6">
        {Object.entries(CONFIDENCE_COLORS).map(([level, color]) => (
          <div key={level} className={`${color} flex-1 rounded-sm opacity-70`} title={level.replace('_', ' ')} />
        ))}
      </div>
      <div className="flex justify-between text-[10px] text-zinc-600">
        <span>Very Low</span>
        <span>Low</span>
        <span>Medium</span>
        <span>High</span>
        <span>Very High</span>
      </div>
    </div>
  );
}

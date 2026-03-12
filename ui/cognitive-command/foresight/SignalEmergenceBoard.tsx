import React from 'react';
import type { LeadingIndicator } from '../types';

const DIRECTION_ICONS: Record<string, string> = {
  rising: '↑',
  falling: '↓',
  stable: '→',
  volatile: '↕',
};

const SIGNIFICANCE_COLORS: Record<string, string> = {
  low: 'text-zinc-400',
  medium: 'text-amber-400',
  high: 'text-orange-400',
  critical: 'text-red-400',
};

export function SignalEmergenceBoard() {
  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <span className="text-xs text-zinc-500">Emerging high-impact patterns</span>
      </div>
      <div className="rounded border border-zinc-800 p-3">
        <p className="text-xs text-zinc-500">Signal emergence board will display leading indicators, their direction, significance, and threshold proximity. Data sourced from threat intelligence and agent-generated assessments.</p>
      </div>
    </div>
  );
}

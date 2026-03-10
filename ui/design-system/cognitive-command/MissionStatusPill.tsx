import React from 'react';

type MissionState = 'green' | 'watch' | 'degraded' | 'critical' | 'decision_required';

interface MissionStatusPillProps {
  state: MissionState;
  className?: string;
}

const STATE_STYLES: Record<MissionState, { bg: string; text: string; label: string }> = {
  green: { bg: 'bg-emerald-900', text: 'text-emerald-300', label: 'Green' },
  watch: { bg: 'bg-amber-900', text: 'text-amber-300', label: 'Watch' },
  degraded: { bg: 'bg-orange-900', text: 'text-orange-300', label: 'Degraded' },
  critical: { bg: 'bg-red-900', text: 'text-red-300', label: 'Critical' },
  decision_required: { bg: 'bg-violet-900', text: 'text-violet-300', label: 'Decision Required' },
};

export function MissionStatusPill({ state, className = '' }: MissionStatusPillProps) {
  const style = STATE_STYLES[state];
  return (
    <span className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-xs font-medium ${style.bg} ${style.text} ${className}`}>
      <span className={`h-1.5 w-1.5 rounded-full ${state === 'critical' ? 'animate-pulse bg-red-400' : style.text.replace('text-', 'bg-')}`} />
      {style.label}
    </span>
  );
}

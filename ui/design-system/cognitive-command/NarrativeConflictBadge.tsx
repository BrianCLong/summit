import React from 'react';

type NarrativeStance = 'adversarial' | 'defensive' | 'neutral' | 'allied' | 'unknown';

interface NarrativeConflictBadgeProps {
  stance: NarrativeStance;
  label?: string;
  className?: string;
}

const STANCE_STYLES: Record<NarrativeStance, { bg: string; text: string; icon: string }> = {
  adversarial: { bg: 'bg-red-900', text: 'text-red-300', icon: '⚔' },
  defensive: { bg: 'bg-blue-900', text: 'text-blue-300', icon: '🛡' },
  neutral: { bg: 'bg-zinc-800', text: 'text-zinc-400', icon: '◯' },
  allied: { bg: 'bg-emerald-900', text: 'text-emerald-300', icon: '✦' },
  unknown: { bg: 'bg-zinc-800', text: 'text-zinc-500', icon: '?' },
};

export function NarrativeConflictBadge({ stance, label, className = '' }: NarrativeConflictBadgeProps) {
  const style = STANCE_STYLES[stance];
  return (
    <span className={`inline-flex items-center gap-1 rounded px-2 py-0.5 text-xs ${style.bg} ${style.text} ${className}`}>
      <span>{style.icon}</span>
      <span>{label || stance}</span>
    </span>
  );
}

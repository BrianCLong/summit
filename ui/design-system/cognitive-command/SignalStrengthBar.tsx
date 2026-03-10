import React from 'react';

interface SignalStrengthBarProps {
  value: number; // 0-1
  threshold?: number;
  label?: string;
  className?: string;
}

export function SignalStrengthBar({ value, threshold, label, className = '' }: SignalStrengthBarProps) {
  const pct = Math.round(value * 100);
  const color = value >= 0.8 ? 'bg-red-500' : value >= 0.6 ? 'bg-orange-500' : value >= 0.4 ? 'bg-amber-500' : 'bg-cyan-500';

  return (
    <div className={`space-y-1 ${className}`}>
      {label && <div className="flex items-center justify-between"><span className="text-xs text-zinc-500">{label}</span><span className="text-xs font-mono text-zinc-400">{pct}%</span></div>}
      <div className="relative h-2 w-full rounded-full bg-zinc-800">
        <div className={`h-full rounded-full transition-all ${color}`} style={{ width: `${pct}%` }} />
        {threshold !== undefined && (
          <div className="absolute top-0 h-full w-0.5 bg-zinc-400" style={{ left: `${Math.round(threshold * 100)}%` }} title={`Threshold: ${Math.round(threshold * 100)}%`} />
        )}
      </div>
    </div>
  );
}

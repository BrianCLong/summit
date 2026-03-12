import React from 'react';

interface ForecastBandProps {
  probability: number;
  confidenceLow: number;
  confidenceHigh: number;
  label?: string;
  className?: string;
}

export function ForecastBand({ probability, confidenceLow, confidenceHigh, label, className = '' }: ForecastBandProps) {
  const pct = Math.round(probability * 100);
  const lowPct = Math.round(confidenceLow * 100);
  const highPct = Math.round(confidenceHigh * 100);

  return (
    <div className={`space-y-1 ${className}`}>
      {label && <span className="text-xs text-zinc-500">{label}</span>}
      <div className="relative h-6 w-full rounded bg-zinc-800">
        <div
          className="absolute inset-y-0 rounded bg-cyan-900/50"
          style={{ left: `${lowPct}%`, width: `${highPct - lowPct}%` }}
          title={`Confidence band: ${lowPct}%-${highPct}%`}
        />
        <div
          className="absolute top-0 h-full w-0.5 bg-cyan-400"
          style={{ left: `${pct}%` }}
          title={`Probability: ${pct}%`}
        />
      </div>
      <div className="flex justify-between text-[10px] text-zinc-600">
        <span>0%</span>
        <span className="text-cyan-400 font-medium">{pct}%</span>
        <span>100%</span>
      </div>
    </div>
  );
}

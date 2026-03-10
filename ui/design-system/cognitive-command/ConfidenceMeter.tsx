import React from 'react';

type ConfidenceLevel = 'very_low' | 'low' | 'medium' | 'high' | 'very_high';

interface ConfidenceMeterProps {
  level: ConfidenceLevel;
  showLabel?: boolean;
  className?: string;
}

const LEVEL_CONFIG: Record<ConfidenceLevel, { bars: number; color: string; label: string }> = {
  very_low: { bars: 1, color: 'bg-red-500', label: 'Very Low' },
  low: { bars: 2, color: 'bg-orange-500', label: 'Low' },
  medium: { bars: 3, color: 'bg-amber-500', label: 'Medium' },
  high: { bars: 4, color: 'bg-emerald-500', label: 'High' },
  very_high: { bars: 5, color: 'bg-cyan-500', label: 'Very High' },
};

export function ConfidenceMeter({ level, showLabel = true, className = '' }: ConfidenceMeterProps) {
  const config = LEVEL_CONFIG[level];

  return (
    <div className={`flex items-center gap-1.5 ${className}`}>
      <div className="flex items-end gap-0.5" role="meter" aria-valuenow={config.bars} aria-valuemin={0} aria-valuemax={5} aria-label={`Confidence: ${config.label}`}>
        {[1, 2, 3, 4, 5].map((i) => (
          <div
            key={i}
            className={`w-1 rounded-sm ${i <= config.bars ? config.color : 'bg-zinc-800'}`}
            style={{ height: `${8 + i * 2}px` }}
          />
        ))}
      </div>
      {showLabel && <span className="text-[10px] text-zinc-500">{config.label}</span>}
    </div>
  );
}

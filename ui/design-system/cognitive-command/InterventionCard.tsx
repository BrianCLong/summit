import React from 'react';

type InterventionStatus = 'draft' | 'proposed' | 'approved' | 'executing' | 'completed' | 'rejected' | 'withdrawn';
type ConfidenceLevel = 'very_low' | 'low' | 'medium' | 'high' | 'very_high';

interface InterventionCardProps {
  title: string;
  objective: string;
  target: string;
  mechanism: string;
  status: InterventionStatus;
  confidence: ConfidenceLevel;
  downsideRisks: string[];
  onClick?: () => void;
  className?: string;
}

const STATUS_COLORS: Record<InterventionStatus, string> = {
  draft: 'border-zinc-600 bg-zinc-900',
  proposed: 'border-cyan-700 bg-cyan-950',
  approved: 'border-emerald-700 bg-emerald-950',
  executing: 'border-amber-700 bg-amber-950',
  completed: 'border-green-700 bg-green-950',
  rejected: 'border-red-700 bg-red-950',
  withdrawn: 'border-zinc-700 bg-zinc-900',
};

export function InterventionCard({ title, objective, target, mechanism, status, confidence, downsideRisks, onClick, className = '' }: InterventionCardProps) {
  return (
    <div
      className={`rounded-lg border p-3 transition-colors hover:brightness-110 ${STATUS_COLORS[status]} ${onClick ? 'cursor-pointer' : ''} ${className}`}
      onClick={onClick}
      role={onClick ? 'button' : undefined}
      tabIndex={onClick ? 0 : undefined}
    >
      <div className="flex items-start justify-between">
        <h4 className="text-sm font-medium text-zinc-200">{title}</h4>
        <span className="rounded-full bg-zinc-800 px-2 py-0.5 text-[10px] text-zinc-400">{status}</span>
      </div>
      <p className="mt-1 text-xs text-zinc-400">{objective}</p>
      <div className="mt-2 grid grid-cols-2 gap-x-4 gap-y-1 text-[10px]">
        <div><span className="text-zinc-600">Target:</span> <span className="text-zinc-400">{target}</span></div>
        <div><span className="text-zinc-600">Mechanism:</span> <span className="text-zinc-400">{mechanism}</span></div>
        <div><span className="text-zinc-600">Confidence:</span> <span className="text-zinc-400">{confidence.replace('_', ' ')}</span></div>
        <div><span className="text-zinc-600">Risks:</span> <span className="text-zinc-400">{downsideRisks.length}</span></div>
      </div>
    </div>
  );
}

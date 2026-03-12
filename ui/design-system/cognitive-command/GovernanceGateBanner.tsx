import React from 'react';

type GateStatus = 'open' | 'pending_approval' | 'approved' | 'rejected' | 'override';

interface GovernanceGateBannerProps {
  name: string;
  status: GateStatus;
  riskLevel: 'low' | 'medium' | 'high' | 'critical';
  deadline?: string;
  onApprove?: () => void;
  onReject?: () => void;
  className?: string;
}

const STATUS_STYLES: Record<GateStatus, { bg: string; border: string; text: string }> = {
  open: { bg: 'bg-emerald-950', border: 'border-emerald-700', text: 'text-emerald-300' },
  pending_approval: { bg: 'bg-amber-950', border: 'border-amber-700', text: 'text-amber-300' },
  approved: { bg: 'bg-cyan-950', border: 'border-cyan-700', text: 'text-cyan-300' },
  rejected: { bg: 'bg-red-950', border: 'border-red-700', text: 'text-red-300' },
  override: { bg: 'bg-violet-950', border: 'border-violet-700', text: 'text-violet-300' },
};

const RISK_COLORS: Record<string, string> = {
  low: 'text-emerald-400',
  medium: 'text-amber-400',
  high: 'text-orange-400',
  critical: 'text-red-400',
};

export function GovernanceGateBanner({ name, status, riskLevel, deadline, onApprove, onReject, className = '' }: GovernanceGateBannerProps) {
  const style = STATUS_STYLES[status];

  return (
    <div className={`rounded-lg border ${style.border} ${style.bg} p-3 ${className}`} role="alert">
      <div className="flex items-center justify-between">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <span className={`text-sm font-medium ${style.text}`}>{name}</span>
            <span className={`rounded-full bg-zinc-900 px-2 py-0.5 text-[10px] ${style.text}`}>{status.replace('_', ' ')}</span>
          </div>
          <div className="flex items-center gap-3 text-[10px]">
            <span className="text-zinc-500">Risk: <span className={RISK_COLORS[riskLevel]}>{riskLevel}</span></span>
            {deadline && <span className="text-zinc-500">Deadline: <span className="text-zinc-400">{deadline}</span></span>}
          </div>
        </div>
        {status === 'pending_approval' && (
          <div className="flex gap-1.5">
            {onApprove && <button onClick={onApprove} className="rounded bg-emerald-700 px-2.5 py-1 text-xs text-white hover:bg-emerald-600 transition-colors">Approve</button>}
            {onReject && <button onClick={onReject} className="rounded bg-red-800 px-2.5 py-1 text-xs text-white hover:bg-red-700 transition-colors">Reject</button>}
          </div>
        )}
      </div>
    </div>
  );
}

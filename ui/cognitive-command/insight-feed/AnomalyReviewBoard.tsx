import React from 'react';

export function AnomalyReviewBoard() {
  return (
    <div className="space-y-3">
      <span className="text-xs text-zinc-500">Detected anomalies for review</span>
      <div className="rounded border border-zinc-800 p-3 min-h-[120px]">
        <p className="text-xs text-zinc-500">Anomaly cards with detection source, deviation metrics, historical baseline comparison, and recommended follow-up actions.</p>
      </div>
    </div>
  );
}

import React from 'react';
import type { OutcomeReview } from '../types';

export function OutcomeReviewPanel() {
  return (
    <div className="space-y-3">
      <span className="text-xs text-zinc-500">Post-action outcome reviews</span>
      <div className="rounded border border-zinc-800 p-3 min-h-[120px]">
        <p className="text-xs text-zinc-500">Compares predicted vs actual outcomes after execution. Shows variance analysis, lessons learned, and links back to original forecasts. Supports post-action review workflows.</p>
      </div>
    </div>
  );
}

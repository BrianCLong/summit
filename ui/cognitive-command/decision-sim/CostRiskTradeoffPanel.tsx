import React from 'react';
import type { CostEstimate } from '../types';

export function CostRiskTradeoffPanel() {
  return (
    <div className="space-y-3">
      <span className="text-xs text-zinc-500">Cost vs risk analysis per option</span>
      <div className="rounded border border-zinc-800 p-3 min-h-[120px]">
        <p className="text-xs text-zinc-500">Scatter plot and matrix of financial cost, personnel requirements, time estimates, political capital expenditure, and opportunity costs against risk levels and confidence.</p>
      </div>
    </div>
  );
}

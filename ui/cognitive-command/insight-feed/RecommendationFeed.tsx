import React from 'react';

export function RecommendationFeed() {
  return (
    <div className="space-y-3">
      <span className="text-xs text-zinc-500">System-generated recommendations</span>
      <div className="rounded border border-zinc-800 p-3 min-h-[120px]">
        <p className="text-xs text-zinc-500">Actionable recommendations attached to narratives and forecasts. Each includes confidence, expected impact, and links to supporting evidence.</p>
      </div>
    </div>
  );
}

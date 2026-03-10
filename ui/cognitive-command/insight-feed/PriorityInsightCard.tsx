import React from 'react';
import type { CognitiveInsight, InsightCategory } from '../types';

const URGENCY_BORDERS: Record<string, string> = {
  critical: 'border-l-red-500',
  high: 'border-l-orange-500',
  medium: 'border-l-amber-500',
  low: 'border-l-zinc-600',
};

export function PriorityInsightCard() {
  return (
    <div className="space-y-3">
      <span className="text-xs text-zinc-500">Insights ranked by urgency, confidence, and impact</span>
      <div className="rounded border border-zinc-800 p-3 min-h-[150px]">
        <p className="text-xs text-zinc-500">Priority insight cards with: title, category badge, urgency indicator, confidence score, impact level, explanation of why the system surfaced it, evidence links, and triage actions (investigate, create mission, dismiss).</p>
      </div>
    </div>
  );
}

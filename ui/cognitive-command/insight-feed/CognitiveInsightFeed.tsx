import React, { useState } from 'react';
import { CognitivePanelHost } from '../CognitivePanelHost';
import { PriorityInsightCard } from './PriorityInsightCard';
import { LeadEmergencePanel } from './LeadEmergencePanel';
import { AnomalyReviewBoard } from './AnomalyReviewBoard';
import { RecommendationFeed } from './RecommendationFeed';
import { InsightTriageDrawer } from './InsightTriageDrawer';
import type { InsightCategory } from '../types';

const CATEGORY_COLORS: Record<InsightCategory, string> = {
  anomaly: 'bg-red-600',
  hidden_relationship: 'bg-violet-600',
  threat_signal: 'bg-orange-600',
  forecast_shift: 'bg-cyan-600',
  narrative_shift: 'bg-rose-600',
  mission_blocker: 'bg-amber-600',
  intervention_opportunity: 'bg-emerald-600',
  governance_concern: 'bg-blue-600',
};

function CognitiveInsightFeed() {
  const [categoryFilter, setCategoryFilter] = useState<InsightCategory | 'all'>('all');
  const [triageDrawerOpen, setTriageDrawerOpen] = useState(false);

  return (
    <div className="flex h-full flex-col gap-3">
      <div className="flex items-center justify-between">
        <h2 className="text-sm font-bold uppercase tracking-wider text-orange-400">Insight Feed</h2>
        <div className="flex items-center gap-2">
          <select
            value={categoryFilter}
            onChange={(e) => setCategoryFilter(e.target.value as InsightCategory | 'all')}
            className="rounded bg-zinc-800 px-2 py-1 text-xs text-zinc-300 border border-zinc-700"
          >
            <option value="all">All Categories</option>
            {Object.keys(CATEGORY_COLORS).map((cat) => (
              <option key={cat} value={cat}>{cat.replace(/_/g, ' ')}</option>
            ))}
          </select>
        </div>
      </div>
      <div className="grid flex-1 grid-cols-2 gap-3">
        <CognitivePanelHost title="Priority Insights" className="col-span-2">
          <PriorityInsightCard />
        </CognitivePanelHost>
        <CognitivePanelHost title="Lead Emergence">
          <LeadEmergencePanel />
        </CognitivePanelHost>
        <CognitivePanelHost title="Anomaly Review">
          <AnomalyReviewBoard />
        </CognitivePanelHost>
        <CognitivePanelHost title="Recommendations" className="col-span-2">
          <RecommendationFeed />
        </CognitivePanelHost>
      </div>
      {triageDrawerOpen && <InsightTriageDrawer onClose={() => setTriageDrawerOpen(false)} />}
    </div>
  );
}

export default CognitiveInsightFeed;

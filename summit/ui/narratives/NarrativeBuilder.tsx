import React from 'react';
import { NarrativeTimeline } from './NarrativeTimeline';
import { NarrativeExplorer } from './NarrativeExplorer';
import { NarrativeComparison } from './NarrativeComparison';

export const NarrativeBuilder: React.FC = () => {
  return (
    <div className="p-6 bg-slate-900 h-full text-slate-200">
      <h2 className="text-2xl font-bold mb-6">Narrative Intelligence Engine</h2>
      <div className="grid grid-cols-3 gap-6">
        <div className="col-span-2 space-y-6">
          <NarrativeTimeline />
          <NarrativeExplorer />
        </div>
        <div className="col-span-1">
          <NarrativeComparison />
        </div>
      </div>
    </div>
  );
};

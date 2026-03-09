import React from 'react';
import { InsightExplorer } from './InsightExplorer';
import { InsightGraph } from './InsightGraph';
import { InsightExplanation } from './InsightExplanation';

export const InsightFeed: React.FC = () => {
  return (
    <div className="flex h-full bg-slate-900 text-slate-200">
      <div className="w-1/3 border-r border-slate-700 p-4 overflow-y-auto">
        <h2 className="text-xl font-bold mb-4">Automated Insights</h2>
        <div className="space-y-4">
          <div className="p-4 bg-slate-800 rounded border-l-4 border-yellow-500 cursor-pointer hover:bg-slate-700">
            <h4 className="font-semibold">Anomaly Detected</h4>
            <p className="text-sm text-slate-400">Unusual financial flow identified between Entity A and Entity B.</p>
          </div>
          <div className="p-4 bg-slate-800 rounded border-l-4 border-blue-500 cursor-pointer hover:bg-slate-700">
            <h4 className="font-semibold">Hidden Relationship</h4>
            <p className="text-sm text-slate-400">Shared infrastructure detected across 3 distinct threats.</p>
          </div>
        </div>
      </div>
      <div className="w-2/3 p-6 flex flex-col gap-6">
        <InsightExplorer />
        <InsightGraph />
        <InsightExplanation />
      </div>
    </div>
  );
};

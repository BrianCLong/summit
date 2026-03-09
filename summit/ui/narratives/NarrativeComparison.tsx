import React from 'react';

export const NarrativeComparison: React.FC = () => {
  return (
    <div className="bg-slate-800 p-4 rounded shadow border border-slate-700 h-full">
      <h3 className="text-lg font-semibold mb-4">Conflict Detection</h3>
      <div className="p-3 bg-red-900/20 border border-red-800 rounded">
        <span className="text-red-400 text-sm font-bold">Conflict Detected</span>
        <p className="text-sm mt-1">Source A contradicts Source B regarding the timeline of events.</p>
      </div>
    </div>
  );
};

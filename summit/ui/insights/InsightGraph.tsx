import React from 'react';

export const InsightGraph: React.FC = () => {
  return (
    <div className="bg-slate-800 p-4 rounded shadow border border-slate-700 flex-grow">
      <h3 className="text-lg font-semibold mb-2">Pattern Visualization</h3>
      <div className="w-full h-full min-h-[200px] border border-slate-700 rounded flex items-center justify-center">
        <span className="text-slate-500">IntelGraph Pattern Miner View</span>
      </div>
    </div>
  );
};

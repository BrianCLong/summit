import React from 'react';

export const SearchResults: React.FC = () => {
  return (
    <div className="bg-slate-800 rounded-lg border border-slate-700 p-4">
      <h3 className="text-sm font-semibold text-slate-400 uppercase mb-4">Results</h3>
      <div className="text-center text-slate-500 py-8">
        Enter a query to search across datasets, reports, and IntelGraph.
      </div>
    </div>
  );
};

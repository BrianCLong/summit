import React from 'react';

export const EventSearch: React.FC = () => {
  return (
    <div className="bg-slate-800 p-4 rounded-lg border border-slate-700">
      <h3 className="font-semibold mb-2">Time Filters</h3>
      <div className="flex flex-wrap gap-2">
        <button className="text-xs px-2 py-1 bg-slate-700 hover:bg-slate-600 rounded">Last 24h</button>
        <button className="text-xs px-2 py-1 bg-slate-700 hover:bg-slate-600 rounded">Past Week</button>
        <button className="text-xs px-2 py-1 bg-slate-700 hover:bg-slate-600 rounded">Custom Range</button>
      </div>
    </div>
  );
};

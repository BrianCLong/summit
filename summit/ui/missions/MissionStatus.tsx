import React from 'react';

export const MissionStatus: React.FC = () => {
  return (
    <div className="grid grid-cols-3 gap-4">
      <div className="bg-slate-800 p-4 rounded shadow border border-slate-700">
        <div className="text-sm text-slate-400 uppercase">Active Investigations</div>
        <div className="text-3xl font-bold mt-1">12</div>
      </div>
      <div className="bg-slate-800 p-4 rounded shadow border border-slate-700">
        <div className="text-sm text-slate-400 uppercase">Agents Deployed</div>
        <div className="text-3xl font-bold mt-1">5</div>
      </div>
      <div className="bg-slate-800 p-4 rounded shadow border border-slate-700">
        <div className="text-sm text-slate-400 uppercase">Critical Insights</div>
        <div className="text-3xl font-bold mt-1 text-red-400">3</div>
      </div>
    </div>
  );
};

import React from 'react';

export const MissionEntities: React.FC = () => {
  return (
    <div className="bg-slate-800 p-4 rounded shadow border border-slate-700 h-full">
      <h3 className="text-lg font-semibold mb-4">Key Targets</h3>
      <ul className="space-y-2">
        <li className="p-2 bg-slate-700 rounded text-sm">Primary Actor Alpha</li>
        <li className="p-2 bg-slate-700 rounded text-sm">Infrastructure Cluster B</li>
        <li className="p-2 bg-slate-700 rounded text-sm">Financial Node X</li>
      </ul>
    </div>
  );
};

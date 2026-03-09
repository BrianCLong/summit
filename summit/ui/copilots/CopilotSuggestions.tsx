import React from 'react';

export const CopilotSuggestions: React.FC = () => {
  return (
    <div className="space-y-2">
      <h3 className="text-xs font-bold text-slate-400 uppercase">Suggested Actions</h3>
      <button className="w-full text-left p-2 text-sm bg-blue-900/30 hover:bg-blue-800/50 rounded border border-blue-800/50 transition">
        Run OSINT search on selected entity
      </button>
      <button className="w-full text-left p-2 text-sm bg-blue-900/30 hover:bg-blue-800/50 rounded border border-blue-800/50 transition">
        Find missing connections in graph
      </button>
    </div>
  );
};

import React from 'react';

export const MemoryGraph: React.FC<{ entities: any[] }> = ({ entities }) => {
  return (
    <div className="bg-slate-800 p-4 rounded shadow flex-grow">
      <h3 className="text-lg font-semibold mb-2">IntelGraph Viewer</h3>
      <div className="w-full h-48 border border-slate-700 rounded flex items-center justify-center bg-slate-900">
        <span className="text-slate-500">Graph visualization loading...</span>
      </div>
    </div>
  );
};

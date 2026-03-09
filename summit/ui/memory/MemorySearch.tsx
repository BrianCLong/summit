import React from 'react';

export const MemorySearch: React.FC = () => {
  return (
    <div className="bg-slate-800 p-4 rounded shadow">
      <input
        type="text"
        placeholder="Search memory, entities, events..."
        className="w-full bg-slate-900 text-white border border-slate-700 rounded px-3 py-2"
      />
    </div>
  );
};

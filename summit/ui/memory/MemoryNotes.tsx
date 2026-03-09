import React from 'react';

export const MemoryNotes: React.FC<{ notes: any[] }> = ({ notes }) => {
  return (
    <div className="bg-slate-800 p-4 rounded shadow flex-grow">
      <h3 className="text-lg font-semibold mb-2">Analyst Notes</h3>
      <textarea
        className="w-full h-32 bg-slate-900 text-white border border-slate-700 rounded p-2"
        placeholder="Record analytical decisions..."
      ></textarea>
    </div>
  );
};

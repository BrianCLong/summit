import React from 'react';

export const NarrativeTimeline: React.FC = () => {
  return (
    <div className="bg-slate-800 p-4 rounded shadow border border-slate-700">
      <h3 className="text-lg font-semibold mb-4">Story Arc</h3>
      <div className="h-32 flex items-center justify-center border-b-2 border-slate-600 relative">
        <div className="absolute w-full flex justify-between px-4">
          <div className="w-4 h-4 rounded-full bg-blue-500"></div>
          <div className="w-4 h-4 rounded-full bg-yellow-500"></div>
          <div className="w-4 h-4 rounded-full bg-red-500"></div>
        </div>
      </div>
    </div>
  );
};

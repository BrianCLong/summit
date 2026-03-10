import React from 'react';

export const SimulationBuilder = () => {
  return (
    <div className="w-full h-full bg-gray-900 border border-gray-700 rounded p-4 flex flex-col relative overflow-hidden">
       <div className="absolute top-0 right-0 p-4 opacity-10 pointer-events-none">
          {/* Abstract background gear icon representation */}
          <div className="w-48 h-48 border-8 border-dashed border-gray-400 rounded-full animate-spin-slow"></div>
       </div>
       <div className="flex justify-between items-center mb-6 z-10 border-b border-gray-700 pb-3">
          <span className="text-purple-400 font-bold tracking-widest uppercase">Simulation Command Center</span>
          <button className="bg-purple-600 text-white px-4 py-2 text-sm rounded-md shadow-lg shadow-purple-600/30 hover:bg-purple-700 transition-all active:scale-95">Run Scenario</button>
       </div>
       <div className="grid grid-cols-2 gap-4 flex-1 z-10">
          <div className="bg-gray-800 rounded p-4 flex flex-col space-y-4 border border-gray-700">
             <label className="text-gray-400 text-xs font-semibold uppercase tracking-wide">Base Parameters</label>
             <input type="text" placeholder="Scenario Name" className="w-full bg-gray-900 border border-gray-600 rounded px-3 py-2 text-sm text-white focus:outline-none focus:border-purple-500" />
             <textarea placeholder="Hypothesis..." className="w-full h-24 bg-gray-900 border border-gray-600 rounded px-3 py-2 text-sm text-white focus:outline-none focus:border-purple-500 resize-none"></textarea>
          </div>
          <div className="bg-gray-800 rounded p-4 border border-gray-700 flex items-center justify-center">
             <span className="text-gray-500 italic">Scenario Tree Preview</span>
          </div>
       </div>
    </div>
  );
};

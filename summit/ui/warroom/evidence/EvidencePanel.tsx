import React from 'react';

export const EvidencePanel = () => {
  return (
    <div className="flex-1 bg-gray-900 border border-gray-700 rounded p-4 text-sm font-sans flex flex-col h-full overflow-hidden shadow-inner">
       <div className="flex justify-between items-center mb-4 border-b border-gray-700 pb-2">
          <span className="text-yellow-500 font-bold uppercase tracking-wide flex items-center space-x-2">
             <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"></path></svg>
             <span>Provenance & Evidence</span>
          </span>
       </div>
       <div className="flex-1 overflow-y-auto space-y-3 custom-scrollbar">
          {[1,2,3].map(i => (
             <div key={i} className="bg-gray-800 p-3 rounded border border-gray-700 hover:border-yellow-500/50 transition-colors cursor-pointer group">
                <div className="flex justify-between items-start mb-1">
                   <span className="font-semibold text-gray-200 group-hover:text-yellow-400">Source Doc #{i}</span>
                   <span className="text-xs text-gray-500 bg-gray-700 px-2 py-0.5 rounded-full">Verified</span>
                </div>
                <div className="text-xs text-gray-400 line-clamp-2">Excerpt from intelligence report demonstrating origin of entity connection.</div>
             </div>
          ))}
       </div>
    </div>
  );
};

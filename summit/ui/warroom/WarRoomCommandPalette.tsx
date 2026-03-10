import React from 'react';

export const WarRoomCommandPalette = () => {
  return (
    <div className="fixed inset-0 bg-black/80 flex items-start justify-center pt-32 z-50 backdrop-blur-sm animate-fade-in">
       <div className="w-full max-w-2xl bg-gray-900 border border-gray-700 rounded-lg shadow-2xl overflow-hidden shadow-blue-900/10">
          <div className="flex items-center p-4 border-b border-gray-700 bg-gray-800">
             <svg className="w-5 h-5 text-gray-500 mr-3" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"></path></svg>
             <input type="text" placeholder="Search entities, queries, simulations..." className="w-full bg-transparent text-white text-lg focus:outline-none placeholder-gray-500" autoFocus />
             <div className="text-xs text-gray-500 bg-gray-700 px-2 py-1 rounded font-mono shadow-inner border border-gray-600">ESC</div>
          </div>
          <div className="p-2 space-y-1 max-h-96 overflow-y-auto custom-scrollbar">
             <div className="px-3 py-1 text-xs font-semibold text-gray-500 uppercase tracking-wider mt-2 mb-1">Actions</div>
             <div className="flex items-center px-4 py-3 bg-blue-600/20 border border-blue-500/50 rounded cursor-pointer group hover:bg-blue-600/30 transition-colors">
                <svg className="w-4 h-4 mr-3 text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1"></path></svg>
                <span className="text-blue-400 group-hover:text-blue-300 font-medium">Run Graph Query</span>
                <span className="ml-auto text-xs text-blue-500 font-mono bg-blue-900/30 px-2 py-1 rounded">Cmd + G</span>
             </div>
             <div className="flex items-center px-4 py-3 hover:bg-gray-800 rounded cursor-pointer group transition-colors border border-transparent hover:border-gray-700">
                <svg className="w-4 h-4 mr-3 text-green-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M10 20l4-16m4 4l4 4-4 4M6 16l-4-4 4-4"></path></svg>
                <span className="text-gray-300 group-hover:text-white font-medium">Launch Agent</span>
             </div>
             <div className="flex items-center px-4 py-3 hover:bg-gray-800 rounded cursor-pointer group transition-colors border border-transparent hover:border-gray-700">
                <svg className="w-4 h-4 mr-3 text-purple-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19.428 15.428a2 2 0 00-1.022-.547l-2.387-.477a6 6 0 00-3.86.517l-.318.158a6 6 0 01-3.86.517L6.05 15.21a2 2 0 00-1.806.547M8 4h8l-1 1v5.172a2 2 0 00.586 1.414l5 5c1.26 1.26.367 3.414-1.415 3.414H4.828c-1.782 0-2.674-2.154-1.414-3.414l5-5A2 2 0 009 10.172V5L8 4z"></path></svg>
                <span className="text-gray-300 group-hover:text-white font-medium">Trigger Simulation</span>
             </div>

             <div className="px-3 py-1 text-xs font-semibold text-gray-500 uppercase tracking-wider mt-4 mb-1 border-t border-gray-800 pt-3">Recent Entities</div>
             {[1,2].map(i => (
                 <div key={i} className="flex items-center px-4 py-2 hover:bg-gray-800 rounded cursor-pointer group transition-colors">
                    <div className="w-2 h-2 bg-red-500 rounded-full mr-3 shadow-[0_0_8px_rgba(239,68,68,0.5)]"></div>
                    <span className="text-gray-400 group-hover:text-gray-200">Entity {i} <span className="text-gray-600 ml-2 text-xs font-mono">ENT-00{i}</span></span>
                 </div>
             ))}
          </div>
       </div>
    </div>
  );
};

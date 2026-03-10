import React from 'react';

export const TemporalMap = () => {
  return (
    <div className="w-full h-full bg-gray-900 border border-gray-700 rounded p-4 flex flex-col relative overflow-hidden">
       <div className="absolute top-2 right-4 text-xs font-mono text-gray-500 bg-gray-800 px-2 py-1 rounded">TEMPORAL_RESOLUTION: 1D</div>
       <div className="flex-1 flex flex-col relative z-10">
           <div className="flex-1 overflow-x-auto custom-scrollbar flex items-center min-h-[200px] border-b border-gray-700 pb-4">
               {/* Timeline axis */}
               <div className="absolute w-[200%] h-0.5 bg-gray-600 top-1/2 -translate-y-1/2 z-0 shadow-[0_0_10px_rgba(255,255,255,0.1)]"></div>

               <div className="flex space-x-24 px-12 relative z-10 w-full justify-between items-center">
                   {[1, 2, 3, 4, 5, 6].map((i) => (
                       <div key={i} className={`flex flex-col items-center group cursor-pointer transition-transform ${i%2===0 ? '-translate-y-8' : 'translate-y-8'}`}>
                           <div className={`w-4 h-4 rounded-full border-2 bg-gray-900 ${i===3 ? 'border-red-500 shadow-[0_0_15px_rgba(239,68,68,0.8)]' : 'border-blue-400'} flex items-center justify-center relative z-20`}>
                               {i===3 && <div className="w-1.5 h-1.5 bg-red-500 rounded-full animate-ping"></div>}
                           </div>
                           <div className={`absolute w-px h-8 bg-gray-600 ${i%2===0 ? 'top-4' : 'bottom-4'} z-10`}></div>
                           <div className={`absolute ${i%2===0 ? '-top-12' : '-bottom-12'} bg-gray-800 border border-gray-700 p-2 rounded w-32 shadow-lg opacity-0 group-hover:opacity-100 transition-opacity z-30 pointer-events-none`}>
                               <div className="text-[10px] text-blue-400 font-mono mb-1">2026-04-1{i} 14:0{i}Z</div>
                               <div className="text-xs text-gray-300 font-semibold line-clamp-2">Entity {String.fromCharCode(64+i)} Activity Detected</div>
                           </div>
                       </div>
                   ))}
               </div>
           </div>

           <div className="h-16 mt-4 flex justify-between items-end px-4 text-xs text-gray-500 font-mono">
              <div className="flex flex-col items-center"><div className="h-2 w-px bg-gray-600 mb-1"></div>2026-04-10</div>
              <div className="flex flex-col items-center"><div className="h-2 w-px bg-gray-600 mb-1"></div>2026-04-12</div>
              <div className="flex flex-col items-center"><div className="h-2 w-px bg-gray-600 mb-1"></div>2026-04-14</div>
              <div className="flex flex-col items-center"><div className="h-2 w-px bg-gray-600 mb-1"></div>2026-04-16</div>
           </div>
       </div>
    </div>
  );
};

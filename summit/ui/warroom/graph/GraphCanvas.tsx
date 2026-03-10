import React from 'react';

export const GraphCanvas = () => {
  return (
    <div className="flex-1 w-full h-full bg-black flex flex-col items-center justify-center border border-gray-700 rounded relative">
       <div className="absolute top-2 left-2 text-xs text-gray-500 font-mono">IntelGraph Neo4j Backend - Virtualized (50k nodes supported)</div>
       <div className="w-64 h-64 border-2 border-blue-500 rounded-full flex items-center justify-center shadow-[0_0_15px_rgba(59,130,246,0.5)]">
          <span className="text-blue-400 font-semibold tracking-wide">Graph Core</span>
       </div>
    </div>
  );
};

import React from 'react';

export const TimelineCanvas = () => {
  return (
    <div className="flex-1 w-full bg-gray-900 border border-gray-700 rounded p-4 flex flex-col">
       <div className="text-sm font-semibold text-gray-300 mb-2 border-b border-gray-700 pb-2">Timeline Fusion Engine</div>
       <div className="flex-1 overflow-x-auto overflow-y-hidden flex items-center relative">
          <div className="absolute h-1 w-full bg-gray-600 top-1/2 transform -translate-y-1/2"></div>
          <div className="flex space-x-12 px-8 relative z-10">
              {[1,2,3,4,5].map(i => (
                 <div key={i} className="flex flex-col items-center cursor-pointer hover:scale-110 transition-transform">
                    <div className="w-3 h-3 bg-red-500 rounded-full shadow-[0_0_8px_rgba(239,68,68,0.8)]"></div>
                    <div className="mt-2 text-xs text-gray-400 font-mono">Event {i}</div>
                 </div>
              ))}
          </div>
       </div>
    </div>
  );
};

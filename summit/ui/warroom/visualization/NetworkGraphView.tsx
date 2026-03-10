import React from 'react';

export const NetworkGraphView = () => {
  return (
    <div className="w-full h-full bg-black relative flex items-center justify-center overflow-hidden border border-gray-800 rounded-lg">
       <div className="absolute inset-0 opacity-20" style={{
           backgroundImage: 'radial-gradient(circle at 50% 50%, #334155 1px, transparent 1px)',
           backgroundSize: '40px 40px'
       }}></div>

       <div className="relative z-10 flex flex-col items-center">
          <div className="w-24 h-24 rounded-full bg-blue-600/20 border-2 border-blue-500 flex items-center justify-center shadow-[0_0_30px_rgba(59,130,246,0.5)] cursor-pointer hover:scale-110 transition-transform">
             <span className="text-white font-bold tracking-wider">Root</span>
          </div>

          <div className="flex space-x-16 mt-16 relative">
             <div className="absolute -top-16 left-1/2 w-0.5 h-16 bg-blue-500/50"></div>

             <div className="flex flex-col items-center relative">
                <div className="absolute -top-16 left-1/2 w-16 h-0.5 bg-blue-500/50 origin-left -rotate-45 -translate-x-full"></div>
                <div className="w-16 h-16 rounded-full bg-red-600/20 border-2 border-red-500 flex items-center justify-center shadow-[0_0_20px_rgba(239,68,68,0.4)] cursor-pointer hover:scale-110 transition-transform">
                   <span className="text-white text-xs font-semibold">Node A</span>
                </div>
             </div>

             <div className="flex flex-col items-center relative">
                <div className="absolute -top-16 right-1/2 w-16 h-0.5 bg-blue-500/50 origin-right rotate-45 translate-x-full"></div>
                <div className="w-16 h-16 rounded-full bg-green-600/20 border-2 border-green-500 flex items-center justify-center shadow-[0_0_20px_rgba(34,197,94,0.4)] cursor-pointer hover:scale-110 transition-transform">
                   <span className="text-white text-xs font-semibold">Node B</span>
                </div>
             </div>
          </div>
       </div>

       <div className="absolute bottom-4 right-4 bg-gray-900/80 backdrop-blur border border-gray-700 p-3 rounded-lg flex flex-col space-y-2">
          <div className="flex items-center space-x-2 text-xs text-gray-400">
             <div className="w-3 h-3 rounded-full bg-blue-500"></div> <span>Organizations</span>
          </div>
          <div className="flex items-center space-x-2 text-xs text-gray-400">
             <div className="w-3 h-3 rounded-full bg-red-500"></div> <span>Threat Actors</span>
          </div>
          <div className="flex items-center space-x-2 text-xs text-gray-400">
             <div className="w-3 h-3 rounded-full bg-green-500"></div> <span>Assets</span>
          </div>
       </div>
    </div>
  );
};

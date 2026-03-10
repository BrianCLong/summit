import React from 'react';

export const AgentConsole = () => {
  return (
    <div className="flex-1 bg-gray-900 border border-gray-700 rounded p-4 text-sm font-mono flex flex-col h-full overflow-hidden">
       <div className="flex justify-between items-center mb-4 border-b border-gray-700 pb-2">
          <span className="text-green-400 font-bold">» Maestro Agent Operations Console</span>
          <button className="bg-green-600 text-white px-3 py-1 text-xs rounded hover:bg-green-700 transition-colors">Launch Task</button>
       </div>
       <div className="flex-1 overflow-y-auto space-y-2 pr-2 custom-scrollbar">
           {['Initializing...', 'Connecting to Swarm...', 'Fetching Context...', 'Reasoning...'].map((log, i) => (
             <div key={i} className="flex space-x-2">
                <span className="text-gray-500">[{new Date().toISOString().split('T')[1].slice(0,8)}]</span>
                <span className={i === 3 ? "text-yellow-400 animate-pulse" : "text-gray-300"}>{log}</span>
             </div>
           ))}
       </div>
    </div>
  );
};

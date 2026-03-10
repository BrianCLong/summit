import React, { useState } from 'react';
import { NetworkGraphView } from "./visualization/NetworkGraphView";
import { TemporalMap } from "./visualization/TemporalMap";
import { AgentConsole } from './agents/AgentConsole';
import { SimulationBuilder } from './simulation/SimulationBuilder';
import { EvidencePanel } from './evidence/EvidencePanel';

export const WarRoomWorkspace = () => {
  const [activePanel, setActivePanel] = useState<'graph' | 'timeline' | 'simulation'>('graph');

  return (
    <div className="flex-1 flex flex-col p-2 space-y-2 overflow-hidden bg-gray-950">
       <div className="flex space-x-2 h-[65%] min-h-0">
          <div className="flex-1 rounded border border-gray-700 bg-gray-900 overflow-hidden relative shadow-lg flex flex-col">
             <div className="flex bg-gray-800 border-b border-gray-700 px-2 py-1 space-x-1">
                 {['graph', 'timeline', 'simulation'].map(tab => (
                    <button
                      key={tab}
                      onClick={() => setActivePanel(tab as any)}
                      className={`px-3 py-1 text-xs font-semibold rounded-t-md border-t border-x transition-colors ${
                         activePanel === tab
                            ? 'bg-gray-900 border-gray-700 text-blue-400 border-b-transparent'
                            : 'bg-gray-800 border-transparent text-gray-500 hover:text-gray-300 hover:bg-gray-700'
                      }`}
                      style={{ marginBottom: activePanel === tab ? '-1px' : '0' }}
                    >
                       {tab.toUpperCase()}
                    </button>
                 ))}
             </div>
             <div className="flex-1 relative">
                {activePanel === 'graph' && <NetworkGraphView />}
                {activePanel === 'timeline' && <TemporalMap />}
                {activePanel === 'simulation' && <SimulationBuilder />}
             </div>
          </div>

          <div className="w-80 rounded border border-gray-700 bg-gray-900 flex flex-col shadow-lg">
             <EvidencePanel />
          </div>
       </div>

       <div className="flex space-x-2 h-[35%] min-h-0">
          <div className="flex-1 rounded border border-gray-700 bg-gray-900 shadow-lg flex flex-col">
             <AgentConsole />
          </div>
          <div className="w-80 rounded border border-gray-700 bg-gray-900 shadow-lg flex flex-col p-3">
             <div className="text-sm font-semibold text-gray-400 border-b border-gray-700 pb-2 mb-2 flex justify-between items-center">
                 <span>Active Investigations</span>
                 <button className="text-xs bg-blue-600/20 text-blue-400 px-2 py-0.5 rounded hover:bg-blue-600/40 transition-colors">New</button>
             </div>
             <div className="flex-1 overflow-y-auto space-y-2 custom-scrollbar">
                {[1, 2].map(i => (
                   <div key={i} className="p-2 bg-gray-800 rounded border border-gray-700 hover:border-blue-500/50 cursor-pointer transition-colors group">
                      <div className="flex justify-between items-center">
                         <span className="font-semibold text-gray-300 group-hover:text-blue-400">Case Alpha-{i}</span>
                         <span className="w-2 h-2 rounded-full bg-green-500 animate-pulse"></span>
                      </div>
                      <div className="text-xs text-gray-500 mt-1 flex justify-between">
                          <span>Updated 2m ago</span>
                          <span className="font-mono text-[10px] bg-gray-900 px-1 rounded">INV-00{i}</span>
                      </div>
                   </div>
                ))}
             </div>
          </div>
       </div>
    </div>
  );
};

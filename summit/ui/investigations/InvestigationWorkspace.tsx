import React from 'react';
import { InvestigationDashboard } from './InvestigationDashboard';

export const InvestigationWorkspace = () => {
  return (
    <div className="flex w-full h-full bg-gray-950">
       <div className="w-64 bg-gray-900 border-r border-gray-800 flex flex-col">
          <div className="p-4 border-b border-gray-800">
             <div className="font-bold text-gray-200">Case Manager</div>
          </div>
          <div className="flex-1 overflow-y-auto p-2 space-y-1 custom-scrollbar">
             {['Overview', 'Timeline', 'Entities', 'Evidence', 'Notes'].map((item, i) => (
                <div key={item} className={`px-3 py-2 rounded text-sm cursor-pointer transition-colors ${i===0 ? 'bg-blue-600/20 text-blue-400' : 'text-gray-400 hover:bg-gray-800 hover:text-gray-200'}`}>
                   {item}
                </div>
             ))}
          </div>
       </div>
       <div className="flex-1 relative">
          <InvestigationDashboard />
       </div>
    </div>
  );
};

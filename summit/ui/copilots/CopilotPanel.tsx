import React from 'react';
import { CopilotChat } from './CopilotChat';
import { CopilotSuggestions } from './CopilotSuggestions';
import { CopilotTaskRunner } from './CopilotTaskRunner';

export const CopilotPanel: React.FC = () => {
  return (
    <div className="w-80 h-full bg-slate-900 border-l border-slate-700 flex flex-col">
      <div className="p-4 border-b border-slate-700">
        <h2 className="text-lg font-bold text-blue-400">Agent Copilot</h2>
      </div>
      <div className="flex-grow overflow-y-auto p-4 space-y-4">
        <CopilotSuggestions />
        <CopilotChat />
      </div>
      <div className="p-4 border-t border-slate-700">
        <CopilotTaskRunner />
      </div>
    </div>
  );
};

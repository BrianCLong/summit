import React from 'react';

export const CopilotChat: React.FC = () => {
  return (
    <div className="flex flex-col h-64 border border-slate-700 rounded bg-slate-800">
      <div className="flex-grow p-2 space-y-2 overflow-y-auto">
        <div className="bg-slate-700 p-2 rounded text-sm w-4/5">How can I assist your investigation?</div>
      </div>
      <input type="text" placeholder="Ask copilot..." className="w-full p-2 bg-slate-900 text-white border-t border-slate-700" />
    </div>
  );
};

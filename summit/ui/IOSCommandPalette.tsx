import React, { useState, useEffect } from 'react';

export const IOSCommandPalette: React.FC = () => {
  const [isOpen, setIsOpen] = useState(false);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.metaKey && e.key === 'k') {
        e.preventDefault();
        setIsOpen(!isOpen);
      }
      if (e.key === 'Escape') setIsOpen(false);
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-start justify-center pt-32">
      <div className="bg-slate-900 w-full max-w-2xl rounded-xl shadow-2xl border border-slate-700 overflow-hidden flex flex-col">
        <div className="p-4 border-b border-slate-700 flex items-center">
          <span className="text-blue-500 mr-3">⌘</span>
          <input
            type="text"
            autoFocus
            placeholder="Universal Command (e.g., 'Open investigation', 'Query graph', 'Run agent')"
            className="w-full bg-transparent text-white outline-none text-lg"
          />
        </div>
        <div className="max-h-96 overflow-y-auto p-2">
          <div className="px-3 py-2 text-xs font-semibold text-slate-500 uppercase">Suggested Commands</div>
          <button className="w-full text-left px-4 py-3 hover:bg-blue-600/20 text-slate-200 rounded flex items-center gap-3">
            <span className="w-6 h-6 flex items-center justify-center bg-blue-900/50 rounded text-blue-400">🕵️</span>
            Open Investigation
          </button>
          <button className="w-full text-left px-4 py-3 hover:bg-blue-600/20 text-slate-200 rounded flex items-center gap-3">
            <span className="w-6 h-6 flex items-center justify-center bg-purple-900/50 rounded text-purple-400">🤖</span>
            Launch Simulation Agent
          </button>
          <button className="w-full text-left px-4 py-3 hover:bg-blue-600/20 text-slate-200 rounded flex items-center gap-3">
            <span className="w-6 h-6 flex items-center justify-center bg-green-900/50 rounded text-green-400">🕸️</span>
            Query IntelGraph
          </button>
          <button className="w-full text-left px-4 py-3 hover:bg-blue-600/20 text-slate-200 rounded flex items-center gap-3">
            <span className="w-6 h-6 flex items-center justify-center bg-yellow-900/50 rounded text-yellow-400">💡</span>
            Retrieve Latest Insights
          </button>
        </div>
        <div className="bg-slate-800 p-2 text-xs text-slate-400 flex justify-between border-t border-slate-700">
          <span>↑↓ to navigate</span>
          <span>↵ to execute</span>
          <span>esc to dismiss</span>
        </div>
      </div>
    </div>
  );
};

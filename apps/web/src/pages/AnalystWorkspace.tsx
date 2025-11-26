import React from 'react';
import { MapPane } from '../panes/MapPane';
import { GraphPane } from '../panes/GraphPane';
import { TimelinePane } from '../panes/TimelinePane';
import ExplainPanel from '../panes/ExplainPanel';
import { useWorkspaceStore } from '../store/workspaceStore';

export default function AnalystWorkspace() {
  const { selectedEntityIds, clearSelection } = useWorkspaceStore();

  return (
    <div className="flex h-screen w-screen bg-slate-950 text-slate-200 overflow-hidden">
      {/* Main Content Area - Grid Layout */}
      <div className="flex-1 flex flex-col h-full overflow-hidden">

        {/* Top Bar / Navigation (Simplified) */}
        <header className="h-14 border-b border-slate-800 flex items-center px-4 justify-between bg-slate-950 shrink-0">
            <div className="flex items-center gap-4">
                <h1 className="font-bold text-lg tracking-tight text-slate-100">Summit <span className="text-indigo-500 font-light">Analyst</span></h1>
                <div className="h-6 w-px bg-slate-800 mx-2"></div>
                <span className="text-sm text-slate-400">Investigation #2948</span>
            </div>
            <div className="flex items-center gap-2">
                <span className="text-xs text-slate-500">
                    {selectedEntityIds.length > 0 ? `${selectedEntityIds.length} selected` : 'No selection'}
                </span>
                {selectedEntityIds.length > 0 && (
                    <button onClick={clearSelection} className="text-xs text-slate-400 hover:text-white px-2 py-1 rounded bg-slate-800 hover:bg-slate-700 transition">
                        Clear
                    </button>
                )}
            </div>
        </header>

        {/* Tri-Pane Grid */}
        <div className="flex-1 p-2 gap-2 grid grid-rows-[2fr_1fr] grid-cols-[1fr_1fr] overflow-hidden">

            {/* Top Left: Map */}
            <div className="row-span-1 col-span-1 min-h-0 min-w-0">
                <MapPane />
            </div>

            {/* Top Right: Graph */}
            <div className="row-span-1 col-span-1 min-h-0 min-w-0">
                <GraphPane />
            </div>

            {/* Bottom: Timeline (Full Width) */}
            <div className="row-span-1 col-span-2 min-h-0 min-w-0">
                <TimelinePane />
            </div>
        </div>
      </div>

      {/* Right Sidebar: AI Assistant */}
      <ExplainPanel />

    </div>
  );
}

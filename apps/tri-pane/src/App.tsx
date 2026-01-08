import React from "react";
import { CommandPalette } from "./components/CommandPalette";
import { ExplainPanel } from "./components/ExplainPanel";
import { GraphPane } from "./components/GraphPane";
import { MapPane } from "./components/MapPane";
import { SavedViewsPanel } from "./components/SavedViewsPanel";
import { Toast } from "./components/Toast";
import { TimelinePane } from "./components/TimelinePane";
import { TriPaneProvider } from "./components/EventBus";
import { featureFlags } from "./config";

function Shell() {
  return (
    <div className="min-h-screen bg-midnight text-sand">
      <header className="sticky top-0 z-40 border-b border-sand/10 bg-midnight/80 backdrop-blur">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-3">
          <div>
            <p className="text-xs uppercase tracking-[0.2em] text-sand/70">PROMPT 8</p>
            <h1 className="text-2xl font-semibold">Tri-Pane Analyst Workspace</h1>
            <p className="text-sm text-sand/70">
              Keyboard-first graph · timeline · map with synchronized brushing and saved layouts
            </p>
          </div>
          <CommandPalette />
        </div>
      </header>
      <main className="mx-auto flex max-w-6xl flex-col gap-4 px-6 py-6">
        <div className="grid gap-4 lg:grid-cols-3">
          <div className="lg:col-span-2 space-y-4">
            <GraphPane />
            <MapPane />
          </div>
          <div className="space-y-4">
            {featureFlags.savedViews && <SavedViewsPanel />}
            <ExplainPanel />
          </div>
        </div>
        <TimelinePane />
      </main>
      <Toast />
    </div>
  );
}

export default function App() {
  return (
    <TriPaneProvider>
      <Shell />
    </TriPaneProvider>
  );
}

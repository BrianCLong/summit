"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.default = App;
const react_1 = __importDefault(require("react"));
const CommandPalette_1 = require("./components/CommandPalette");
const ExplainPanel_1 = require("./components/ExplainPanel");
const GraphPane_1 = require("./components/GraphPane");
const MapPane_1 = require("./components/MapPane");
const SavedViewsPanel_1 = require("./components/SavedViewsPanel");
const Toast_1 = require("./components/Toast");
const TimelinePane_1 = require("./components/TimelinePane");
const cognitive_battlespace_1 = require("./pages/cognitive-battlespace");
const EventBus_1 = require("./components/EventBus");
const config_1 = require("./config");
function Shell() {
    return (<div className="min-h-screen bg-midnight text-sand">
      <header className="sticky top-0 z-40 border-b border-sand/10 bg-midnight/80 backdrop-blur">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-3">
          <div>
            <p className="text-xs uppercase tracking-[0.2em] text-sand/70">PROMPT 8</p>
            <h1 className="text-2xl font-semibold">Tri-Pane Analyst Workspace</h1>
            <p className="text-sm text-sand/70">
              Keyboard-first graph · timeline · map with synchronized brushing and saved layouts
            </p>
          </div>
          <CommandPalette_1.CommandPalette />
        </div>
      </header>
      <main className="mx-auto flex max-w-6xl flex-col gap-4 px-6 py-6">
        <div className="grid gap-4 lg:grid-cols-3">
          <div className="lg:col-span-2 space-y-4">
            <GraphPane_1.GraphPane />
            <MapPane_1.MapPane />
          </div>
          <div className="space-y-4">
            {config_1.featureFlags.savedViews && <SavedViewsPanel_1.SavedViewsPanel />}
            <ExplainPanel_1.ExplainPanel />
          </div>
        </div>
        <TimelinePane_1.TimelinePane />
        <cognitive_battlespace_1.CognitiveBattlespacePage />
      </main>
      <Toast_1.Toast />
    </div>);
}
function App() {
    return (<EventBus_1.TriPaneProvider>
      <Shell />
    </EventBus_1.TriPaneProvider>);
}

"use strict";
/**
 * Analyst Console
 *
 * Main tri-pane analyst console component with Graph, Timeline, Map,
 * and "Explain This View" panel. All panes share synchronized global
 * view state for cross-highlighting, filtering, and selection.
 *
 * Frontend Stack: React 19 + TypeScript + Tailwind + Vite
 */
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
exports.AnalystConsole = AnalystConsole;
const react_1 = __importStar(require("react"));
const lucide_react_1 = require("lucide-react");
const utils_1 = require("@/lib/utils");
const Card_1 = require("@/components/ui/Card");
const Badge_1 = require("@/components/ui/Badge");
const Button_1 = require("@/components/ui/Button");
const Tooltip_1 = require("@/components/ui/Tooltip");
const Kbd_1 = require("@/components/ui/Kbd");
const AnalystViewContext_1 = require("./AnalystViewContext");
const GraphPane_1 = require("./GraphPane");
const TimelinePane_1 = require("./TimelinePane");
const AnalystMapPane_1 = require("./AnalystMapPane");
const ExplainThisViewPanel_1 = require("./ExplainThisViewPanel");
/**
 * Inner console component that uses the context
 */
function AnalystConsoleInner({ entities, links, events, locations, className, onExport, }) {
    const { state, resetSelection, resetFilters, resetAll } = (0, AnalystViewContext_1.useAnalystView)();
    const [showExplainPanel, setShowExplainPanel] = (0, react_1.useState)(true);
    const [showProvenance, setShowProvenance] = (0, react_1.useState)(false);
    const [focusedPane, setFocusedPane] = (0, react_1.useState)(null);
    // Calculate visible counts for header badges
    const visibleCounts = (0, react_1.useMemo)(() => {
        const fromTime = state.timeWindow.startMs;
        const toTime = state.timeWindow.endMs;
        // Filter events by time window
        const visibleEvents = events.filter(event => {
            const eventTime = new Date(event.timestamp).getTime();
            return eventTime >= fromTime && eventTime <= toTime;
        });
        // Get entity IDs involved in visible events
        const entityIdsInTimeWindow = new Set(visibleEvents.flatMap(e => e.entityIds));
        // Filter entities (could be more sophisticated)
        let visibleEntities = entities;
        if (state.filters.entityTypes && state.filters.entityTypes.length > 0) {
            visibleEntities = visibleEntities.filter(e => state.filters.entityTypes?.includes(e.type));
        }
        // Filter locations by time window
        const visibleLocations = locations.filter(loc => {
            if (loc.firstSeenAt && loc.lastSeenAt) {
                const firstSeen = new Date(loc.firstSeenAt).getTime();
                const lastSeen = new Date(loc.lastSeenAt).getTime();
                return firstSeen <= toTime && lastSeen >= fromTime;
            }
            return true;
        });
        // Filter links
        const visibleEntityIds = new Set(visibleEntities.map(e => e.id));
        const visibleLinks = links.filter(link => visibleEntityIds.has(link.sourceId) && visibleEntityIds.has(link.targetId));
        return {
            entities: visibleEntities.length,
            links: visibleLinks.length,
            events: visibleEvents.length,
            locations: visibleLocations.length,
        };
    }, [entities, links, events, locations, state]);
    // Keyboard shortcuts
    (0, react_1.useEffect)(() => {
        const handleKeyDown = (e) => {
            // Skip if in input/textarea
            if (e.target instanceof HTMLInputElement ||
                e.target instanceof HTMLTextAreaElement) {
                return;
            }
            // Cmd/Ctrl + 1/2/3 to focus panes
            if ((e.metaKey || e.ctrlKey) && e.key >= '1' && e.key <= '3') {
                e.preventDefault();
                const panes = ['graph', 'timeline', 'map'];
                setFocusedPane(panes[parseInt(e.key) - 1]);
            }
            // Escape to clear focus
            if (e.key === 'Escape') {
                setFocusedPane(null);
                resetSelection();
            }
            // P for provenance
            if (e.key === 'p' || e.key === 'P') {
                setShowProvenance(prev => !prev);
            }
            // E for explain panel
            if (e.key === 'e' || e.key === 'E') {
                setShowExplainPanel(prev => !prev);
            }
            // R for reset
            if (e.key === 'r' && !e.metaKey && !e.ctrlKey) {
                resetAll();
            }
        };
        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [resetSelection, resetAll]);
    // Check if any filters are active
    const hasActiveFilters = (state.filters.entityTypes && state.filters.entityTypes.length > 0) ||
        (state.filters.eventTypes && state.filters.eventTypes.length > 0) ||
        state.filters.minConfidence !== undefined;
    const hasSelection = state.selection.selectedEntityIds.length > 0 ||
        state.selection.selectedEventIds.length > 0 ||
        state.selection.selectedLocationIds.length > 0;
    return (<div className={(0, utils_1.cn)('flex flex-col h-full w-full bg-slate-950 text-slate-50', className)} role="main" aria-label="Tri-pane analyst console">
      {/* Header Controls */}
      <div className="flex items-center justify-between bg-slate-900 border-b border-slate-800 p-3">
        <div className="flex items-center gap-4">
          <h1 className="text-lg font-semibold flex items-center gap-2">
            <lucide_react_1.Layers className="h-5 w-5 text-blue-400"/>
            Analyst Console
          </h1>

          {/* Status badges */}
          <div className="flex items-center gap-2" role="status" aria-live="polite">
            <Badge_1.Badge variant="outline" className="flex items-center gap-1">
              <lucide_react_1.Network className="h-3 w-3"/>
              {visibleCounts.entities} entities
            </Badge_1.Badge>
            <Badge_1.Badge variant="outline" className="flex items-center gap-1">
              <lucide_react_1.Clock className="h-3 w-3"/>
              {visibleCounts.events} events
            </Badge_1.Badge>
            <Badge_1.Badge variant="outline" className="flex items-center gap-1">
              <lucide_react_1.MapPin className="h-3 w-3"/>
              {visibleCounts.locations} locations
            </Badge_1.Badge>
          </div>
        </div>

        {/* Controls */}
        <div className="flex items-center gap-2">
          <Tooltip_1.Tooltip content="Toggle provenance overlay (P)">
            <Button_1.Button variant="outline" size="sm" onClick={() => setShowProvenance(!showProvenance)} aria-label="Toggle provenance" aria-pressed={showProvenance}>
              {showProvenance ? (<lucide_react_1.Eye className="h-4 w-4"/>) : (<lucide_react_1.EyeOff className="h-4 w-4"/>)}
              <span className="ml-1 hidden sm:inline">Provenance</span>
            </Button_1.Button>
          </Tooltip_1.Tooltip>

          <Tooltip_1.Tooltip content="Toggle explain panel (E)">
            <Button_1.Button variant="outline" size="sm" onClick={() => setShowExplainPanel(!showExplainPanel)} aria-label="Toggle explain panel" aria-pressed={showExplainPanel}>
              <lucide_react_1.Lightbulb className="h-4 w-4"/>
              <span className="ml-1 hidden sm:inline">Explain</span>
            </Button_1.Button>
          </Tooltip_1.Tooltip>

          <Tooltip_1.Tooltip content="Reset all filters and selection (R)">
            <Button_1.Button variant="outline" size="sm" onClick={resetAll} disabled={!hasActiveFilters && !hasSelection} aria-label="Reset all">
              <lucide_react_1.RefreshCw className="h-4 w-4"/>
              <span className="ml-1 hidden sm:inline">Reset</span>
            </Button_1.Button>
          </Tooltip_1.Tooltip>

          {onExport && (<Tooltip_1.Tooltip content="Export current view">
              <Button_1.Button variant="outline" size="sm" onClick={onExport} aria-label="Export">
                <lucide_react_1.Download className="h-4 w-4"/>
                <span className="ml-1 hidden sm:inline">Export</span>
              </Button_1.Button>
            </Tooltip_1.Tooltip>)}
        </div>
      </div>

      {/* Main content area */}
      <div className="flex flex-1 min-h-0 overflow-hidden">
        {/* Tri-pane layout */}
        <div className={(0, utils_1.cn)('flex flex-col flex-1 min-w-0 transition-all duration-300', showExplainPanel ? 'mr-0' : '')}>
          <div className="flex flex-1 min-h-0 overflow-hidden">
            {/* Left: Graph + Timeline stacked */}
            <div className="flex flex-col flex-[2] min-w-0 border-r border-slate-800">
              {/* Graph Pane */}
              <div className={(0, utils_1.cn)('flex-1 min-h-0 transition-all', focusedPane === 'graph' && 'ring-2 ring-blue-500 ring-inset')}>
                <Card_1.Card className="h-full rounded-none border-0 border-b border-slate-800">
                  <Card_1.CardHeader className="pb-2 bg-slate-900/50">
                    <Card_1.CardTitle className="text-sm flex items-center gap-2">
                      <lucide_react_1.Network className="h-4 w-4"/>
                      Graph
                      <Kbd_1.Kbd keys={['mod', '1']} className="ml-auto bg-slate-800"/>
                    </Card_1.CardTitle>
                  </Card_1.CardHeader>
                  <Card_1.CardContent className="p-0 h-[calc(100%-3rem)]">
                    <GraphPane_1.GraphPane entities={entities} links={links} events={events}/>
                  </Card_1.CardContent>
                </Card_1.Card>
              </div>

              {/* Timeline Pane */}
              <div className={(0, utils_1.cn)('h-48 min-h-[12rem] transition-all', focusedPane === 'timeline' && 'ring-2 ring-blue-500 ring-inset')}>
                <Card_1.Card className="h-full rounded-none border-0">
                  <Card_1.CardHeader className="pb-2 bg-slate-900/50">
                    <Card_1.CardTitle className="text-sm flex items-center gap-2">
                      <lucide_react_1.Clock className="h-4 w-4"/>
                      Timeline
                      <Kbd_1.Kbd keys={['mod', '2']} className="ml-auto bg-slate-800"/>
                    </Card_1.CardTitle>
                  </Card_1.CardHeader>
                  <Card_1.CardContent className="p-0 h-[calc(100%-3rem)]">
                    <TimelinePane_1.TimelinePane events={events}/>
                  </Card_1.CardContent>
                </Card_1.Card>
              </div>
            </div>

            {/* Right: Map Pane */}
            <div className={(0, utils_1.cn)('flex flex-1 min-w-0 transition-all', focusedPane === 'map' && 'ring-2 ring-blue-500 ring-inset')}>
              <Card_1.Card className="h-full w-full rounded-none border-0">
                <Card_1.CardHeader className="pb-2 bg-slate-900/50">
                  <Card_1.CardTitle className="text-sm flex items-center gap-2">
                    <lucide_react_1.MapPin className="h-4 w-4"/>
                    Map
                    <Kbd_1.Kbd keys={['mod', '3']} className="ml-auto bg-slate-800"/>
                  </Card_1.CardTitle>
                </Card_1.CardHeader>
                <Card_1.CardContent className="p-0 h-[calc(100%-3rem)]">
                  <AnalystMapPane_1.AnalystMapPane locations={locations} events={events}/>
                </Card_1.CardContent>
              </Card_1.Card>
            </div>
          </div>
        </div>

        {/* Explain This View Panel */}
        {showExplainPanel && (<div className="w-80 min-w-[20rem] max-w-sm flex-shrink-0">
            <ExplainThisViewPanel_1.ExplainThisViewPanel entities={entities} links={links} events={events} locations={locations}/>
          </div>)}
      </div>

      {/* Keyboard shortcuts overlay (bottom right) */}
      <div className="fixed bottom-4 right-4 bg-slate-900/90 backdrop-blur-sm border border-slate-800 rounded-lg shadow-lg text-xs p-3 max-w-xs opacity-60 hover:opacity-100 transition-opacity z-50 hidden lg:block">
        <div className="flex items-center gap-2 font-semibold mb-2 text-slate-300">
          <lucide_react_1.Keyboard className="h-4 w-4"/>
          Shortcuts
        </div>
        <div className="space-y-1 text-slate-400">
          <div className="flex items-center justify-between gap-4">
            <span>Focus pane</span>
            <Kbd_1.Kbd keys={['mod', '1-3']} className="bg-slate-800"/>
          </div>
          <div className="flex items-center justify-between gap-4">
            <span>Provenance</span>
            <Kbd_1.Kbd keys="P" className="bg-slate-800"/>
          </div>
          <div className="flex items-center justify-between gap-4">
            <span>Explain panel</span>
            <Kbd_1.Kbd keys="E" className="bg-slate-800"/>
          </div>
          <div className="flex items-center justify-between gap-4">
            <span>Reset</span>
            <Kbd_1.Kbd keys="R" className="bg-slate-800"/>
          </div>
          <div className="flex items-center justify-between gap-4">
            <span>Clear selection</span>
            <Kbd_1.Kbd keys="Esc" className="bg-slate-800"/>
          </div>
        </div>
      </div>
    </div>);
}
/**
 * Main AnalystConsole component - wraps inner component with provider
 */
function AnalystConsole({ entities, links, events, locations, initialTimeWindow, className, onExport, }) {
    // Create initial state
    const initialState = (0, react_1.useMemo)(() => {
        const defaultState = (0, AnalystViewContext_1.createDefaultViewState)();
        if (initialTimeWindow) {
            return {
                ...defaultState,
                timeWindow: initialTimeWindow,
            };
        }
        // If no initial time window, derive from events if possible
        if (events.length > 0) {
            const timestamps = events.map(e => new Date(e.timestamp).getTime());
            const minTime = Math.min(...timestamps);
            const maxTime = Math.max(...timestamps);
            // Add some padding
            const padding = (maxTime - minTime) * 0.1;
            return {
                ...defaultState,
                timeWindow: {
                    startMs: minTime - padding,
                    endMs: maxTime + padding,
                    granularity: 'minute',
                    tzMode: 'UTC',
                },
            };
        }
        return defaultState;
    }, [events, initialTimeWindow]);
    return (<AnalystViewContext_1.AnalystViewProvider initialState={initialState}>
      <AnalystConsoleInner entities={entities} links={links} events={events} locations={locations} className={className} onExport={onExport}/>
    </AnalystViewContext_1.AnalystViewProvider>);
}

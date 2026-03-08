"use strict";
/**
 * Tri-Pane UI Plugin
 * Synchronized timeline/map/graph panes with brushing, XAI overlays,
 * and provenance tooltips - all as a loadable extension
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
exports.TriPaneMain = void 0;
exports.registerUiExtension = registerUiExtension;
const react_1 = __importStar(require("react"));
const zustand_1 = require("zustand");
// ============================================================================
// Zustand Store
// ============================================================================
const useTriPaneStore = (0, zustand_1.create)((set, get) => ({
    viewState: {
        selectedNodes: [],
        timeRange: null,
        geoExtent: null,
        filters: {},
        highlightedElements: [],
    },
    savedViews: [],
    undoStack: [],
    redoStack: [],
    xaiOverlays: [],
    provenanceCache: new Map(),
    setSelectedNodes: (nodes) => {
        const current = get().viewState;
        set({
            undoStack: [...get().undoStack, current],
            redoStack: [],
            viewState: { ...current, selectedNodes: nodes },
        });
    },
    setTimeRange: (range) => {
        const current = get().viewState;
        set({
            undoStack: [...get().undoStack, current],
            redoStack: [],
            viewState: { ...current, timeRange: range },
        });
    },
    setGeoExtent: (extent) => {
        const current = get().viewState;
        set({
            undoStack: [...get().undoStack, current],
            redoStack: [],
            viewState: { ...current, geoExtent: extent },
        });
    },
    setFilter: (key, value) => {
        const current = get().viewState;
        set({
            undoStack: [...get().undoStack, current],
            redoStack: [],
            viewState: {
                ...current,
                filters: { ...current.filters, [key]: value },
            },
        });
    },
    highlightElements: (elements) => {
        set({
            viewState: { ...get().viewState, highlightedElements: elements },
        });
    },
    saveView: (name) => {
        const view = {
            id: `view_${Date.now()}`,
            name,
            state: { ...get().viewState },
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
        };
        set({ savedViews: [...get().savedViews, view] });
        return view;
    },
    loadView: (viewId) => {
        const view = get().savedViews.find((v) => v.id === viewId);
        if (view) {
            const current = get().viewState;
            set({
                undoStack: [...get().undoStack, current],
                redoStack: [],
                viewState: { ...view.state },
            });
        }
    },
    deleteView: (viewId) => {
        set({ savedViews: get().savedViews.filter((v) => v.id !== viewId) });
    },
    undo: () => {
        const { undoStack, viewState } = get();
        if (undoStack.length > 0) {
            const previous = undoStack[undoStack.length - 1];
            set({
                undoStack: undoStack.slice(0, -1),
                redoStack: [...get().redoStack, viewState],
                viewState: previous,
            });
        }
    },
    redo: () => {
        const { redoStack, viewState } = get();
        if (redoStack.length > 0) {
            const next = redoStack[redoStack.length - 1];
            set({
                redoStack: redoStack.slice(0, -1),
                undoStack: [...get().undoStack, viewState],
                viewState: next,
            });
        }
    },
    canUndo: () => get().undoStack.length > 0,
    canRedo: () => get().redoStack.length > 0,
    setXAIOverlays: (overlays) => set({ xaiOverlays: overlays }),
    cacheProvenance: (elementId, provenance) => {
        const cache = new Map(get().provenanceCache);
        cache.set(elementId, provenance);
        set({ provenanceCache: cache });
    },
}));
const GraphPane = ({ _data, _onNodeSelect, _onBrush }) => {
    const { _viewState, _xaiOverlays, _highlightElements } = useTriPaneStore();
    // D3 force graph would be initialized here
    (0, react_1.useEffect)(() => {
        // Initialize D3 force simulation
        // svg.selectAll('circle').data(data.nodes)...
    }, [data]);
    return (<div className="graph-pane" role="application" aria-label="Graph visualization">
      <svg width="100%" height="100%">
        {/* Graph would be rendered here */}
        <g className="nodes">
          {/* Nodes with XAI overlays */}
        </g>
        <g className="edges">
          {/* Edges */}
        </g>
      </svg>
      {/* XAI Legend */}
      <div className="xai-legend" aria-label="Importance scale">
        <span>Low</span>
        <div className="gradient-bar"/>
        <span>High</span>
      </div>
    </div>);
};
const TimelinePane = ({ _data, _onTimeRangeSelect, _onEventSelect, }) => {
    const { _viewState } = useTriPaneStore();
    return (<div className="timeline-pane" role="application" aria-label="Timeline visualization">
      <svg width="100%" height="100%">
        {/* Timeline axis */}
        <g className="axis"/>
        {/* Events */}
        <g className="events">
          {/* Event markers with provenance tooltips */}
        </g>
        {/* Brush for selection */}
        <g className="brush"/>
      </svg>
    </div>);
};
const MapPane = ({ _data, _onLocationSelect, _onExtentChange, }) => {
    const { _viewState } = useTriPaneStore();
    // Leaflet map would be initialized here
    (0, react_1.useEffect)(() => {
        // const map = L.map('map').setView([0, 0], 2);
        // L.tileLayer(...)
    }, []);
    return (<div className="map-pane" role="application" aria-label="Map visualization">
      <div id="map" style={{ width: '100%', height: '100%' }}/>
    </div>);
};
const ExplainerPanel = ({ selectedElement }) => {
    const { xaiOverlays, provenanceCache } = useTriPaneStore();
    const overlay = xaiOverlays.find((o) => o.nodeId === selectedElement);
    const provenance = selectedElement ? provenanceCache.get(selectedElement) : null;
    if (!selectedElement) {
        return (<div className="explainer-panel" role="complementary" aria-label="View explainer">
        <p>Select an element to see its explanation and provenance.</p>
      </div>);
    }
    return (<div className="explainer-panel" role="complementary" aria-label="View explainer">
      <h3>Element: {selectedElement}</h3>

      {overlay && (<section aria-label="XAI explanation">
          <h4>AI Explanation</h4>
          <p>
            <strong>Type:</strong> {overlay.overlayType}
          </p>
          <p>
            <strong>Score:</strong> {(overlay.value * 100).toFixed(1)}%
          </p>
          <p>{overlay.explanation}</p>
        </section>)}

      {provenance && (<section aria-label="Data provenance">
          <h4>Provenance</h4>
          <p>
            <strong>Source:</strong> {provenance.source}
          </p>
          <p>
            <strong>Timestamp:</strong> {new Date(provenance.timestamp).toLocaleString()}
          </p>
          <p>
            <strong>Confidence:</strong> {(provenance.confidence * 100).toFixed(1)}%
          </p>
          <div>
            <strong>Transform Chain:</strong>
            <ol>
              {provenance.transformChain.map((step, i) => (<li key={i}>{step}</li>))}
            </ol>
          </div>
        </section>)}
    </div>);
};
const useCommandPalette = () => {
    const [isOpen, setIsOpen] = (0, react_1.useState)(false);
    const [search, setSearch] = (0, react_1.useState)('');
    const store = useTriPaneStore();
    const commands = (0, react_1.useMemo)(() => [
        {
            id: 'undo',
            label: 'Undo',
            shortcut: 'Ctrl+Z',
            action: store.undo,
        },
        {
            id: 'redo',
            label: 'Redo',
            shortcut: 'Ctrl+Shift+Z',
            action: store.redo,
        },
        {
            id: 'save-view',
            label: 'Save Current View',
            shortcut: 'Ctrl+S',
            action: () => {
                // const name = prompt('View name:');
                // if (name) {store.saveView(name);}
            },
        },
        {
            id: 'clear-selection',
            label: 'Clear Selection',
            shortcut: 'Escape',
            action: () => store.setSelectedNodes([]),
        },
        {
            id: 'toggle-xai',
            label: 'Toggle XAI Overlays',
            action: () => {
                // Toggle XAI overlay visibility
            },
        },
        {
            id: 'export-view',
            label: 'Export View as Image',
            action: () => {
                // Export current view
            },
        },
    ], [store]);
    const filteredCommands = commands.filter((cmd) => cmd.label.toLowerCase().includes(search.toLowerCase()));
    // Keyboard shortcut handler
    (0, react_1.useEffect)(() => {
        const handleKeyDown = (e) => {
            if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
                e.preventDefault();
                setIsOpen(true);
            }
            if (e.key === 'Escape') {
                setIsOpen(false);
            }
        };
        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, []);
    return { isOpen, setIsOpen, search, setSearch, commands: filteredCommands };
};
const TriPaneMain = ({ layout = 'horizontal' }) => {
    const store = useTriPaneStore();
    const commandPalette = useCommandPalette();
    const [selectedElement, setSelectedElement] = (0, react_1.useState)(null);
    // TTFI metrics instrumentation
    (0, react_1.useEffect)(() => {
        const startTime = performance.now();
        // Report time to first interaction
        const handleFirstInteraction = () => {
            const _ttfi = performance.now() - startTime;
            // [Metrics] TTFI: ${_ttfi.toFixed(2)}ms
            // Would send to analytics
            // analytics.track('tri_pane_ttfi', { ttfi });
            window.removeEventListener('click', handleFirstInteraction);
        };
        window.addEventListener('click', handleFirstInteraction);
        return () => window.removeEventListener('click', handleFirstInteraction);
    }, []);
    // Synchronized brushing handler
    const handleBrush = (0, react_1.useCallback)((nodeIds) => {
        store.setSelectedNodes(nodeIds);
        store.highlightElements(nodeIds);
    }, [store]);
    const layoutClass = `tri-pane-container layout-${layout}`;
    return (<div className={layoutClass} role="main" aria-label="Tri-pane visualization">
      {/* Command Palette */}
      {commandPalette.isOpen && (<div className="command-palette" role="dialog" aria-label="Command palette">
          <input type="text" value={commandPalette.search} onChange={(e) => commandPalette.setSearch(e.target.value)} placeholder="Type a command..." autoFocus aria-label="Search commands"/>
          <ul role="listbox">
            {commandPalette.commands.map((cmd) => (<li key={cmd.id} role="option" onClick={() => {
                    cmd.action();
                    commandPalette.setIsOpen(false);
                }}>
                <span>{cmd.label}</span>
                {cmd.shortcut && <kbd>{cmd.shortcut}</kbd>}
              </li>))}
          </ul>
        </div>)}

      {/* Toolbar */}
      <div className="toolbar" role="toolbar" aria-label="View controls">
        <button onClick={store.undo} disabled={!store.canUndo()} aria-label="Undo">
          Undo
        </button>
        <button onClick={store.redo} disabled={!store.canRedo()} aria-label="Redo">
          Redo
        </button>
        <button onClick={() => commandPalette.setIsOpen(true)} aria-label="Open command palette">
          Commands (Ctrl+K)
        </button>
        <select aria-label="Saved views" onChange={(e) => store.loadView(e.target.value)}>
          <option value="">Load saved view...</option>
          {store.savedViews.map((view) => (<option key={view.id} value={view.id}>
              {view.name}
            </option>))}
        </select>
      </div>

      {/* Panes */}
      <div className="panes">
        <GraphPane data={{}} onNodeSelect={setSelectedElement} onBrush={handleBrush}/>
        <TimelinePane data={{}} onTimeRangeSelect={(range) => store.setTimeRange(range)} onEventSelect={setSelectedElement}/>
        <MapPane data={{}} onLocationSelect={setSelectedElement} onExtentChange={(extent) => store.setGeoExtent(extent)}/>
      </div>

      {/* Explainer Panel */}
      <ExplainerPanel selectedElement={selectedElement}/>

      {/* Accessibility: Skip links */}
      <a href="#graph-pane" className="skip-link">
        Skip to graph
      </a>
      <a href="#timeline-pane" className="skip-link">
        Skip to timeline
      </a>
      <a href="#map-pane" className="skip-link">
        Skip to map
      </a>
    </div>);
};
exports.TriPaneMain = TriPaneMain;
// ============================================================================
// Plugin Registration
// ============================================================================
function registerUiExtension(extensionId) {
    if (extensionId === 'tri-pane') {
        // [tri-pane-explain] Registered as UI extension
        // Register with plugin loader
        if (typeof window !== 'undefined' && window.__INTELGRAPH_PLUGINS__) {
            window.__INTELGRAPH_PLUGINS__.register({
                id: 'tri-pane-explain',
                component: exports.TriPaneMain,
                panels: ['tri-pane-main', 'explainer-panel'],
            });
        }
    }
}
// Auto-register if in browser context
if (typeof window !== 'undefined') {
    registerUiExtension('tri-pane');
}
exports.default = exports.TriPaneMain;

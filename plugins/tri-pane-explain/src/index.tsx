/**
 * Tri-Pane UI Plugin
 * Synchronized timeline/map/graph panes with brushing, XAI overlays,
 * and provenance tooltips - all as a loadable extension
 */

import React, { useState, useCallback, useEffect, useMemo } from 'react';
import { create } from 'zustand';

// ============================================================================
// Types
// ============================================================================

interface ViewState {
  selectedNodes: string[];
  timeRange: [Date, Date] | null;
  geoExtent: [[number, number], [number, number]] | null;
  filters: Record<string, any>;
  highlightedElements: string[];
}

interface SavedView {
  id: string;
  name: string;
  state: ViewState;
  createdAt: string;
  updatedAt: string;
}

interface XAIOverlay {
  nodeId: string;
  overlayType: 'importance' | 'confidence' | 'provenance' | 'anomaly';
  value: number;
  explanation: string;
}

interface ProvenanceInfo {
  source: string;
  timestamp: string;
  transformChain: string[];
  confidence: number;
}

interface TriPaneStore {
  viewState: ViewState;
  savedViews: SavedView[];
  undoStack: ViewState[];
  redoStack: ViewState[];
  xaiOverlays: XAIOverlay[];
  provenanceCache: Map<string, ProvenanceInfo>;

  // Actions
  setSelectedNodes: (nodes: string[]) => void;
  setTimeRange: (range: [Date, Date] | null) => void;
  setGeoExtent: (extent: [[number, number], [number, number]] | null) => void;
  setFilter: (key: string, value: any) => void;
  highlightElements: (elements: string[]) => void;

  // View management
  saveView: (name: string) => SavedView;
  loadView: (viewId: string) => void;
  deleteView: (viewId: string) => void;

  // Undo/redo
  undo: () => void;
  redo: () => void;
  canUndo: () => boolean;
  canRedo: () => boolean;

  // XAI
  setXAIOverlays: (overlays: XAIOverlay[]) => void;
  cacheProvenance: (elementId: string, provenance: ProvenanceInfo) => void;
}

// ============================================================================
// Zustand Store
// ============================================================================

const useTriPaneStore = create<TriPaneStore>((set, get) => ({
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
    const view: SavedView = {
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

// ============================================================================
// Graph Pane Component
// ============================================================================

interface GraphPaneProps {
  data: any;
  onNodeSelect: (nodeId: string) => void;
  onBrush: (nodeIds: string[]) => void;
}

const GraphPane: React.FC<GraphPaneProps> = ({ data, onNodeSelect, onBrush }) => {
  const { viewState, xaiOverlays, highlightElements } = useTriPaneStore();

  // D3 force graph would be initialized here
  useEffect(() => {
    // Initialize D3 force simulation
    // svg.selectAll('circle').data(data.nodes)...
  }, [data]);

  return (
    <div className="graph-pane" role="application" aria-label="Graph visualization">
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
        <div className="gradient-bar" />
        <span>High</span>
      </div>
    </div>
  );
};

// ============================================================================
// Timeline Pane Component
// ============================================================================

interface TimelinePaneProps {
  data: any;
  onTimeRangeSelect: (range: [Date, Date]) => void;
  onEventSelect: (eventId: string) => void;
}

const TimelinePane: React.FC<TimelinePaneProps> = ({
  data,
  onTimeRangeSelect,
  onEventSelect,
}) => {
  const { viewState } = useTriPaneStore();

  return (
    <div className="timeline-pane" role="application" aria-label="Timeline visualization">
      <svg width="100%" height="100%">
        {/* Timeline axis */}
        <g className="axis" />
        {/* Events */}
        <g className="events">
          {/* Event markers with provenance tooltips */}
        </g>
        {/* Brush for selection */}
        <g className="brush" />
      </svg>
    </div>
  );
};

// ============================================================================
// Map Pane Component
// ============================================================================

interface MapPaneProps {
  data: any;
  onLocationSelect: (locationId: string) => void;
  onExtentChange: (extent: [[number, number], [number, number]]) => void;
}

const MapPane: React.FC<MapPaneProps> = ({
  data,
  onLocationSelect,
  onExtentChange,
}) => {
  const { viewState } = useTriPaneStore();

  // Leaflet map would be initialized here
  useEffect(() => {
    // const map = L.map('map').setView([0, 0], 2);
    // L.tileLayer(...)
  }, []);

  return (
    <div className="map-pane" role="application" aria-label="Map visualization">
      <div id="map" style={{ width: '100%', height: '100%' }} />
    </div>
  );
};

// ============================================================================
// Explainer Panel Component
// ============================================================================

interface ExplainerPanelProps {
  selectedElement: string | null;
}

const ExplainerPanel: React.FC<ExplainerPanelProps> = ({ selectedElement }) => {
  const { xaiOverlays, provenanceCache } = useTriPaneStore();

  const overlay = xaiOverlays.find((o) => o.nodeId === selectedElement);
  const provenance = selectedElement ? provenanceCache.get(selectedElement) : null;

  if (!selectedElement) {
    return (
      <div className="explainer-panel" role="complementary" aria-label="View explainer">
        <p>Select an element to see its explanation and provenance.</p>
      </div>
    );
  }

  return (
    <div className="explainer-panel" role="complementary" aria-label="View explainer">
      <h3>Element: {selectedElement}</h3>

      {overlay && (
        <section aria-label="XAI explanation">
          <h4>AI Explanation</h4>
          <p>
            <strong>Type:</strong> {overlay.overlayType}
          </p>
          <p>
            <strong>Score:</strong> {(overlay.value * 100).toFixed(1)}%
          </p>
          <p>{overlay.explanation}</p>
        </section>
      )}

      {provenance && (
        <section aria-label="Data provenance">
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
              {provenance.transformChain.map((step, i) => (
                <li key={i}>{step}</li>
              ))}
            </ol>
          </div>
        </section>
      )}
    </div>
  );
};

// ============================================================================
// Command Palette Hook
// ============================================================================

interface Command {
  id: string;
  label: string;
  shortcut?: string;
  action: () => void;
}

const useCommandPalette = () => {
  const [isOpen, setIsOpen] = useState(false);
  const [search, setSearch] = useState('');
  const store = useTriPaneStore();

  const commands: Command[] = useMemo(
    () => [
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
          const name = prompt('View name:');
          if (name) store.saveView(name);
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
    ],
    [store],
  );

  const filteredCommands = commands.filter((cmd) =>
    cmd.label.toLowerCase().includes(search.toLowerCase()),
  );

  // Keyboard shortcut handler
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
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

// ============================================================================
// Main Tri-Pane Component
// ============================================================================

interface TriPaneMainProps {
  layout?: 'horizontal' | 'vertical' | 'grid';
}

export const TriPaneMain: React.FC<TriPaneMainProps> = ({ layout = 'horizontal' }) => {
  const store = useTriPaneStore();
  const commandPalette = useCommandPalette();
  const [selectedElement, setSelectedElement] = useState<string | null>(null);

  // TTFI metrics instrumentation
  useEffect(() => {
    const startTime = performance.now();

    // Report time to first interaction
    const handleFirstInteraction = () => {
      const ttfi = performance.now() - startTime;
      console.log(`[Metrics] TTFI: ${ttfi.toFixed(2)}ms`);

      // Would send to analytics
      // analytics.track('tri_pane_ttfi', { ttfi });

      window.removeEventListener('click', handleFirstInteraction);
    };

    window.addEventListener('click', handleFirstInteraction);
    return () => window.removeEventListener('click', handleFirstInteraction);
  }, []);

  // Synchronized brushing handler
  const handleBrush = useCallback(
    (nodeIds: string[]) => {
      store.setSelectedNodes(nodeIds);
      store.highlightElements(nodeIds);
    },
    [store],
  );

  const layoutClass = `tri-pane-container layout-${layout}`;

  return (
    <div className={layoutClass} role="main" aria-label="Tri-pane visualization">
      {/* Command Palette */}
      {commandPalette.isOpen && (
        <div className="command-palette" role="dialog" aria-label="Command palette">
          <input
            type="text"
            value={commandPalette.search}
            onChange={(e) => commandPalette.setSearch(e.target.value)}
            placeholder="Type a command..."
            autoFocus
            aria-label="Search commands"
          />
          <ul role="listbox">
            {commandPalette.commands.map((cmd) => (
              <li
                key={cmd.id}
                role="option"
                onClick={() => {
                  cmd.action();
                  commandPalette.setIsOpen(false);
                }}
              >
                <span>{cmd.label}</span>
                {cmd.shortcut && <kbd>{cmd.shortcut}</kbd>}
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* Toolbar */}
      <div className="toolbar" role="toolbar" aria-label="View controls">
        <button
          onClick={store.undo}
          disabled={!store.canUndo()}
          aria-label="Undo"
        >
          Undo
        </button>
        <button
          onClick={store.redo}
          disabled={!store.canRedo()}
          aria-label="Redo"
        >
          Redo
        </button>
        <button
          onClick={() => commandPalette.setIsOpen(true)}
          aria-label="Open command palette"
        >
          Commands (Ctrl+K)
        </button>
        <select
          aria-label="Saved views"
          onChange={(e) => store.loadView(e.target.value)}
        >
          <option value="">Load saved view...</option>
          {store.savedViews.map((view) => (
            <option key={view.id} value={view.id}>
              {view.name}
            </option>
          ))}
        </select>
      </div>

      {/* Panes */}
      <div className="panes">
        <GraphPane
          data={{}}
          onNodeSelect={setSelectedElement}
          onBrush={handleBrush}
        />
        <TimelinePane
          data={{}}
          onTimeRangeSelect={(range) => store.setTimeRange(range)}
          onEventSelect={setSelectedElement}
        />
        <MapPane
          data={{}}
          onLocationSelect={setSelectedElement}
          onExtentChange={(extent) => store.setGeoExtent(extent)}
        />
      </div>

      {/* Explainer Panel */}
      <ExplainerPanel selectedElement={selectedElement} />

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
    </div>
  );
};

// ============================================================================
// Plugin Registration
// ============================================================================

export function registerUiExtension(extensionId: string): void {
  if (extensionId === 'tri-pane') {
    console.log('[tri-pane-explain] Registered as UI extension');

    // Register with plugin loader
    if (typeof window !== 'undefined' && (window as any).__INTELGRAPH_PLUGINS__) {
      (window as any).__INTELGRAPH_PLUGINS__.register({
        id: 'tri-pane-explain',
        component: TriPaneMain,
        panels: ['tri-pane-main', 'explainer-panel'],
      });
    }
  }
}

// Auto-register if in browser context
if (typeof window !== 'undefined') {
  registerUiExtension('tri-pane');
}

export default TriPaneMain;

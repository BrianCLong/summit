"use strict";
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
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.GraphPane = void 0;
/* eslint-disable @typescript-eslint/ban-ts-comment */
// @ts-nocheck
const react_1 = __importStar(require("react"));
const react_force_graph_2d_1 = __importDefault(require("react-force-graph-2d"));
const workspaceStore_1 = require("../store/workspaceStore");
// Simple wrapper to handle resize if hook doesn't exist
const GraphWrapper = ({ children }) => {
    const containerRef = (0, react_1.useRef)(null);
    const [dimensions, setDimensions] = react_1.default.useState({ width: 0, height: 0 });
    (0, react_1.useEffect)(() => {
        if (!containerRef.current)
            return;
        const resizeObserver = new ResizeObserver((entries) => {
            for (let entry of entries) {
                setDimensions({
                    width: entry.contentRect.width,
                    height: entry.contentRect.height
                });
            }
        });
        resizeObserver.observe(containerRef.current);
        return () => resizeObserver.disconnect();
    }, []);
    return (<div ref={containerRef} className="w-full h-full">
      {dimensions.width > 0 && dimensions.height > 0 && children(dimensions.width, dimensions.height)}
    </div>);
};
const GraphPane = () => {
    const { entities, links, selectedEntityIds, selectEntity, isSyncing, syncError, retrySync } = (0, workspaceStore_1.useWorkspaceStore)();
    const graphRef = (0, react_1.useRef)(undefined);
    // Syncing indicator logic (only show if lag > 250ms)
    const [showSyncing, setShowSyncing] = (0, react_1.useState)(false);
    (0, react_1.useEffect)(() => {
        let timer;
        if (isSyncing) {
            timer = setTimeout(() => setShowSyncing(true), 250);
        }
        else {
            setShowSyncing(false);
        }
        return () => clearTimeout(timer);
    }, [isSyncing]);
    // Prepare graph data
    // Memoize graphData to ensure reference stability. This prevents ForceGraph2D
    // from restarting the simulation (and resetting node positions) on every render.
    const graphData = (0, react_1.useMemo)(() => ({
        nodes: entities.map(e => ({ ...e })),
        links: links.map(l => ({ ...l }))
    }), [entities, links]);
    // Handle node click
    const handleNodeClick = (0, react_1.useCallback)((node) => {
        selectEntity(node.id);
    }, [selectEntity]);
    // Effect to highlight/zoom on selection
    (0, react_1.useEffect)(() => {
        if (selectedEntityIds.length === 1 && graphRef.current) {
            // Optional: center on selected node
            // graphRef.current.centerAt(node.x, node.y, 1000);
            // graphRef.current.zoom(8, 2000);
        }
    }, [selectedEntityIds]);
    return (<div className="w-full h-full relative bg-slate-900 border border-slate-800 rounded-lg overflow-hidden flex flex-col">
        <div className="absolute top-2 left-2 z-10 bg-slate-900/80 backdrop-blur px-3 py-1 rounded text-xs font-mono text-purple-400 border border-purple-900/50">
            NETWORK ANALYSIS
        </div>

        {/* Syncing Indicator */}
        {showSyncing && (<div className="absolute top-2 right-2 z-20 bg-yellow-500/80 text-black px-2 py-1 rounded text-xs font-bold animate-pulse">
                Syncing...
            </div>)}

        {/* Error Banner */}
        {syncError && (<div className="absolute top-10 left-1/2 transform -translate-x-1/2 z-30 bg-red-900/90 border border-red-500 text-white px-4 py-3 rounded shadow-lg flex flex-col items-center gap-2">
                 <div className="font-bold text-sm">Couldn’t refresh results</div>
                 <div className="text-xs">Your selected time range is unchanged.</div>
                 <button onClick={retrySync} className="bg-red-700 hover:bg-red-600 px-3 py-1 rounded text-xs font-semibold transition-colors">
                     Retry
                 </button>
             </div>)}

      <GraphWrapper>
        {(width, height) => (<react_force_graph_2d_1.default ref={graphRef} width={width} height={height} graphData={graphData} nodeLabel="label" nodeColor={(node) => selectedEntityIds.includes(node.id) ? '#22d3ee' : '#a855f7'} nodeRelSize={6} linkColor={() => '#475569'} backgroundColor="#0f172a" onNodeClick={handleNodeClick} cooldownTicks={100} linkDirectionalArrowLength={3.5} linkDirectionalArrowRelPos={1}/>)}
      </GraphWrapper>
    </div>);
};
exports.GraphPane = GraphPane;

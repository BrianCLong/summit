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
Object.defineProperty(exports, "__esModule", { value: true });
exports.GraphExplorerView = void 0;
// conductor-ui/frontend/src/views/GraphExplorerView.tsx
// Appending Server-Saved Views functionality
const react_1 = __importStar(require("react"));
const SloHintBadge_1 = require("../components/graph/SloHintBadge");
const fetchGraphNeighbors = async (nodeId) => {
    console.log(`Fetching neighbors for ${nodeId}...`);
    await new Promise((res) => setTimeout(res, 350));
    return {
        nodes: [{ id: `neighbor-${Math.random()}`, label: 'Neighbor', type: 'IP' }],
        edges: [
            {
                id: `edge-${Math.random()}`,
                source: nodeId,
                target: `neighbor-${Math.random()}`,
            },
        ],
        latencyMs: 350,
    };
};
const fetchSavedViews = async () => {
    return [
        { id: 'view-1', name: 'My Saved Investigation', nodes: [], edges: [] },
    ];
};
const GraphExplorerView = () => {
    const [query, setQuery] = (0, react_1.useState)('');
    const [nodes, setNodes] = (0, react_1.useState)([
        { id: 'start-node', label: 'Start Node', type: 'Domain' },
    ]);
    const [edges, setEdges] = (0, react_1.useState)([]);
    const [latency, setLatency] = (0, react_1.useState)(null);
    const [isLoading, setIsLoading] = (0, react_1.useState)(false);
    const [savedViews, setSavedViews] = (0, react_1.useState)([]);
    (0, react_1.useEffect)(() => {
        fetchSavedViews().then(setSavedViews);
    }, []);
    const handleExpandNode = (0, react_1.useCallback)(async (nodeId) => {
        setIsLoading(true);
        const result = await fetchGraphNeighbors(nodeId);
        setNodes((prev) => [...prev, ...result.nodes]);
        setEdges((prev) => [...prev, ...result.edges]);
        setLatency(result.latencyMs);
        setIsLoading(false);
    }, []);
    return (<div>
      <h1>Graph Explorer</h1>
      <div>
        <h3>Saved Views</h3>
        <ul>
          {savedViews.map((v) => (<li key={v.id}>{v.name}</li>))}
        </ul>
        <button>Save Current View</button>
      </div>
      <hr />
      <div style={{ marginBottom: '1rem' }}>
        <input type="text" value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Search for an entity..."/>
        <button onClick={() => handleExpandNode(query)}>Search & Expand</button>
      </div>

      {isLoading && <p>Loading...</p>}
      {latency !== null && <SloHintBadge_1.SloHintBadge latencyMs={latency} sloMs={300}/>}

      <div style={{
            border: '1px solid grey',
            height: '500px',
            position: 'relative',
        }}>
        <p style={{ padding: '1rem' }}>Graph visualization area.</p>
        <ul>
          {nodes.map((n) => (<li key={n.id}>
              {n.label} ({n.type})
            </li>))}
        </ul>
      </div>
    </div>);
};
exports.GraphExplorerView = GraphExplorerView;

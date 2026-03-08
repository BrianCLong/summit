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
exports.RunDetailPage = void 0;
const react_1 = __importStar(require("react"));
const react_router_dom_1 = require("react-router-dom");
const material_1 = require("@mui/material");
const icons_material_1 = require("@mui/icons-material");
const api_1 = require("../api");
const RunDetailPage = () => {
    const { id } = (0, react_router_dom_1.useParams)();
    const navigate = (0, react_router_dom_1.useNavigate)();
    const [run, setRun] = (0, react_1.useState)(null);
    const [graph, setGraph] = (0, react_1.useState)(null);
    const [loading, setLoading] = (0, react_1.useState)(true);
    (0, react_1.useEffect)(() => {
        if (id)
            loadData(id);
    }, [id]);
    const loadData = async (runId) => {
        try {
            const [runData, graphData] = await Promise.all([
                api_1.api.runs.get(runId),
                api_1.api.runs.getGraph(runId)
            ]);
            setRun(runData);
            setGraph(graphData);
        }
        catch (err) {
            console.error(err);
        }
        finally {
            setLoading(false);
        }
    };
    if (loading)
        return <material_1.CircularProgress />;
    if (!run)
        return <material_1.Typography>Run not found</material_1.Typography>;
    return (<material_1.Box>
      <material_1.Button startIcon={<icons_material_1.ArrowBack />} onClick={() => navigate('/maestro/runs')} sx={{ mb: 2 }}>
        Back to Runs
      </material_1.Button>

      <material_1.Grid container spacing={3}>
        <material_1.Grid item xs={12}>
           <material_1.Paper sx={{ p: 3 }}>
              <material_1.Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
                  <material_1.Typography variant="h5">Run: {run.id}</material_1.Typography>
                  <StatusChip status={run.status}/>
              </material_1.Box>
              <material_1.Grid container spacing={2}>
                  <material_1.Grid item xs={3}><material_1.Typography color="textSecondary">Pipeline</material_1.Typography><material_1.Typography>{run.pipeline}</material_1.Typography></material_1.Grid>
                  <material_1.Grid item xs={3}><material_1.Typography color="textSecondary">Started</material_1.Typography><material_1.Typography>{new Date(run.started_at).toLocaleString()}</material_1.Typography></material_1.Grid>
                  <material_1.Grid item xs={3}><material_1.Typography color="textSecondary">Duration</material_1.Typography><material_1.Typography>{run.duration_ms}ms</material_1.Typography></material_1.Grid>
                  <material_1.Grid item xs={3}><material_1.Typography color="textSecondary">Cost</material_1.Typography><material_1.Typography>${run.cost?.toFixed(4)}</material_1.Typography></material_1.Grid>
              </material_1.Grid>
           </material_1.Paper>
        </material_1.Grid>

        <material_1.Grid item xs={12}>
            <material_1.Paper sx={{ p: 3, minHeight: 400 }}>
                <material_1.Typography variant="h6" gutterBottom>Task Graph</material_1.Typography>
                {graph ? (<SimpleDAG graph={graph}/>) : (<material_1.Typography>No graph data available</material_1.Typography>)}
            </material_1.Paper>
        </material_1.Grid>
      </material_1.Grid>
    </material_1.Box>);
};
exports.RunDetailPage = RunDetailPage;
const StatusChip = ({ status }) => {
    let color = 'default';
    if (status === 'succeeded')
        color = 'success';
    if (status === 'failed')
        color = 'error';
    if (status === 'running')
        color = 'primary';
    return <material_1.Chip label={status} color={color}/>;
};
// A very simple SVG DAG renderer
const SimpleDAG = ({ graph }) => {
    // Simple layout: position nodes in a row for now
    // In a real app, use Dagre or ReactFlow
    const nodes = graph.nodes.map((n, i) => ({
        ...n,
        x: 50 + i * 150,
        y: 100
    }));
    return (<svg width="100%" height="300" style={{ border: '1px solid #eee' }}>
            <defs>
                <marker id="arrowhead" markerWidth="10" markerHeight="7" refX="28" refY="3.5" orient="auto">
                  <polygon points="0 0, 10 3.5, 0 7" fill="#ccc"/>
                </marker>
            </defs>
            {graph.edges.map((e, i) => {
            const source = nodes.find(n => n.id === e.source);
            const target = nodes.find(n => n.id === e.target);
            if (!source || !target)
                return null;
            return (<line key={i} x1={source.x} y1={source.y} x2={target.x} y2={target.y} stroke="#ccc" strokeWidth="2" markerEnd="url(#arrowhead)"/>);
        })}
            {nodes.map(n => (<g key={n.id} transform={`translate(${n.x},${n.y})`}>
                    <circle r="30" fill={n.status === 'success' ? '#e8f5e9' : n.status === 'running' ? '#e3f2fd' : '#f5f5f5'} stroke={n.status === 'success' ? 'green' : 'blue'}/>
                    <text textAnchor="middle" dy="5" fontSize="12">{n.label}</text>
                </g>))}
        </svg>);
};

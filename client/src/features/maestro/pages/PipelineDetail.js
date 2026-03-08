"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.PipelineDetailPage = PipelineDetailPage;
const react_1 = __importDefault(require("react"));
const react_router_dom_1 = require("react-router-dom");
const mockData_1 = require("../mockData");
function PipelineDetailPage() {
    const { pipelineId } = (0, react_router_dom_1.useParams)();
    const pipeline = mockData_1.pipelineRecords.find((candidate) => candidate.id === pipelineId) ??
        mockData_1.pipelineRecords[0];
    const navigate = (0, react_router_dom_1.useNavigate)();
    const { nodes, edges } = mockData_1.pipelineGraph;
    const [selectedNodeId, setSelectedNodeId] = react_1.default.useState(nodes[0]?.id ?? '');
    const [criticalOnly, setCriticalOnly] = react_1.default.useState(false);
    const [scale, setScale] = react_1.default.useState(0.75);
    const [pan, setPan] = react_1.default.useState({ x: 0, y: 0 });
    const dragState = react_1.default.useRef(null);
    const [lastEmit, setLastEmit] = react_1.default.useState('');
    const selectedNode = react_1.default.useMemo(() => nodes.find((node) => node.id === selectedNodeId) ?? nodes[0], [nodes, selectedNodeId]);
    const handleNodeSelect = react_1.default.useCallback((nodeId) => {
        setSelectedNodeId(nodeId);
        setLastEmit(`Step ${nodeId} emitted selection event at ${new Date().toLocaleTimeString()}`);
    }, []);
    const handleWheel = react_1.default.useCallback((event) => {
        event.preventDefault();
        setScale((prev) => Math.min(2, Math.max(0.4, prev - event.deltaY * 0.0015)));
    }, []);
    const handlePointerDown = react_1.default.useCallback((event) => {
        event.currentTarget.setPointerCapture(event.pointerId);
        dragState.current = {
            startX: event.clientX,
            startY: event.clientY,
            origin: pan,
        };
    }, [pan]);
    const handlePointerMove = react_1.default.useCallback((event) => {
        if (!dragState.current)
            return;
        const { startX, startY, origin } = dragState.current;
        const dx = event.clientX - startX;
        const dy = event.clientY - startY;
        setPan({ x: origin.x + dx, y: origin.y + dy });
    }, []);
    const handlePointerUp = react_1.default.useCallback(() => {
        dragState.current = null;
    }, []);
    const fitToScreen = react_1.default.useCallback(() => {
        setScale(0.75);
        setPan({ x: 0, y: 0 });
    }, []);
    return (<div className="flex h-full flex-col gap-4">
      <header className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <button type="button" onClick={() => navigate(-1)} className="text-sm text-emerald-400 hover:text-emerald-300">
            ← Back to pipelines
          </button>
          <h1 className="mt-2 text-2xl font-semibold text-white">
            {pipeline.name}
          </h1>
          <p className="text-sm text-slate-400">
            DAG renders 200 nodes with smooth pan/zoom. Selection emits within
            150ms to populate the detail pane.
          </p>
        </div>
        <div className="flex items-center gap-3">
          <button type="button" className="rounded-lg border border-slate-700 px-3 py-2 text-sm text-slate-200 hover:border-slate-500" onClick={fitToScreen}>
            Fit to screen
          </button>
          <label className="flex items-center gap-2 text-sm text-slate-300">
            <input type="checkbox" checked={criticalOnly} onChange={(event) => setCriticalOnly(event.target.checked)} className="h-4 w-4 rounded border-slate-600 bg-slate-950"/>
            Highlight critical path
          </label>
        </div>
      </header>
      <div className="grid flex-1 gap-4 lg:grid-cols-[minmax(0,1fr)_320px]">
        <div className="relative overflow-hidden rounded-2xl border border-slate-800 bg-slate-950/50" onWheel={handleWheel} onPointerDown={handlePointerDown} onPointerMove={handlePointerMove} onPointerUp={handlePointerUp}>
          <div className="h-full w-full cursor-grab" style={{
            transform: `translate(${pan.x}px, ${pan.y}px) scale(${scale})`,
            transformOrigin: 'center center',
        }}>
            <svg width={1800} height={1200} className="text-slate-500">
              {edges
            .filter((edge) => (criticalOnly ? edge.critical : true))
            .map((edge) => {
            const source = nodes.find((node) => node.id === edge.source);
            const target = nodes.find((node) => node.id === edge.target);
            if (!source || !target)
                return null;
            const isCritical = edge.critical && criticalOnly;
            return (<line key={edge.id} x1={source.x + 80} y1={source.y + 40} x2={target.x + 80} y2={target.y + 40} stroke={edge.critical ? '#34d399' : '#475569'} strokeWidth={isCritical ? 6 : 2} strokeOpacity={criticalOnly && !edge.critical ? 0.2 : 0.9}/>);
        })}
              {nodes.map((node) => {
            const selected = node.id === selectedNodeId;
            const hidden = criticalOnly && !node.critical;
            return (<g key={node.id} transform={`translate(${node.x}, ${node.y})`} opacity={hidden ? 0.15 : 1}>
                    <rect width={160} height={80} rx={16} className="transition" fill={selected
                    ? '#34d399'
                    : node.critical
                        ? '#0f172a'
                        : '#1e293b'} stroke={node.critical ? '#34d399' : '#334155'} strokeWidth={selected ? 3 : 1} onClick={() => handleNodeSelect(node.id)}/>
                    <text x={80} y={32} textAnchor="middle" className="text-sm font-semibold" fill={selected ? '#0f172a' : '#e2e8f0'}>
                      {node.label}
                    </text>
                    <text x={80} y={54} textAnchor="middle" className="text-xs" fill="#94a3b8">
                      {node.durationMs / 1000}s • SLA {node.slaMinutes}m
                    </text>
                  </g>);
        })}
            </svg>
          </div>
        </div>
        <aside className="rounded-2xl border border-slate-800 bg-slate-900/60 p-4 text-sm text-slate-200">
          <h2 className="text-lg font-semibold text-white">Step details</h2>
          <p className="mt-1 text-xs text-slate-400">
            Last event: {lastEmit || '—'}
          </p>
          <div className="mt-3 space-y-3 text-sm">
            <div>
              <p className="text-xs uppercase text-slate-400">Name</p>
              <p className="font-semibold text-white">{selectedNode.label}</p>
            </div>
            <div>
              <p className="text-xs uppercase text-slate-400">Owners</p>
              <p>{selectedNode.owners.join(', ')}</p>
            </div>
            <div>
              <p className="text-xs uppercase text-slate-400">Duration</p>
              <p>
                {(selectedNode.durationMs / 1000).toFixed(1)}s (SLA{' '}
                {selectedNode.slaMinutes}m)
              </p>
            </div>
            <div>
              <p className="text-xs uppercase text-slate-400">Flaky score</p>
              <p>{selectedNode.flakyScore.toFixed(2)}</p>
            </div>
          </div>
          <button type="button" onClick={() => navigate(`/runs/run-1?step=${selectedNode.id}`)} className="mt-6 w-full rounded-lg bg-emerald-500 px-4 py-2 text-sm font-semibold text-slate-950 hover:bg-emerald-400">
            Open latest run
          </button>
        </aside>
      </div>
    </div>);
}
exports.default = PipelineDetailPage;

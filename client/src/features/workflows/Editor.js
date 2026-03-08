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
exports.default = WorkflowEditor;
const react_1 = __importDefault(require("react"));
const reactflow_1 = __importStar(require("reactflow"));
require("reactflow/dist/style.css");
const initialNodes = [
    {
        id: 'src',
        position: { x: 50, y: 50 },
        data: { label: 'Source' },
        type: 'input',
    },
    { id: 'build', position: { x: 250, y: 50 }, data: { label: 'Build' } },
    { id: 'test', position: { x: 450, y: 50 }, data: { label: 'Test' } },
    {
        id: 'deploy',
        position: { x: 650, y: 50 },
        data: { label: 'Deploy' },
        type: 'output',
    },
];
const initialEdges = [
    { id: 'e1', source: 'src', target: 'build', animated: true },
    { id: 'e2', source: 'build', target: 'test', animated: true },
    { id: 'e3', source: 'test', target: 'deploy', animated: true },
];
function WorkflowEditor() {
    const [nodes, , onNodesChange] = (0, reactflow_1.useNodesState)(initialNodes);
    const [edges, setEdges, onEdgesChange] = (0, reactflow_1.useEdgesState)(initialEdges);
    const [result, setResult] = react_1.default.useState(null);
    const onConnect = react_1.default.useCallback((params) => setEdges((eds) => (0, reactflow_1.addEdge)(params, eds)), [setEdges]);
    const previewRun = async () => {
        // Safe, idempotent dry-run startRun
        const query = `mutation($i: StartRunInput!) { startRun(input:$i){ status diff auditId } }`;
        const variables = {
            i: {
                pipelineId: 'pipeline-reactflow',
                parameters: { NODE_COUNT: nodes.length },
                canaryPercent: 5,
                maxParallel: 1,
                meta: {
                    idempotencyKey: `rf-${Date.now()}`,
                    dryRun: true,
                    reason: 'RF preview',
                },
            },
        };
        const rsp = await fetch('/api/graphql', {
            method: 'POST',
            headers: { 'content-type': 'application/json' },
            body: JSON.stringify({ query, variables }),
        });
        const json = await rsp.json();
        setResult(json.data?.startRun || json.errors);
    };
    return (<div style={{ padding: 24 }} role="application" aria-label="Workflow editor canvas">
      <h2>Workflow Editor</h2>
      <div style={{ height: 420, border: '1px solid #ddd', borderRadius: 8 }} tabIndex={0} aria-label="Graph canvas">
        <reactflow_1.default nodes={nodes} edges={edges} onNodesChange={onNodesChange} onEdgesChange={onEdgesChange} onConnect={onConnect} fitView>
          <reactflow_1.MiniMap />
          <reactflow_1.Controls />
          <reactflow_1.Background gap={16}/>
        </reactflow_1.default>
      </div>
      <div style={{ marginTop: 12, display: 'flex', gap: 8 }}>
        <button onClick={previewRun}>Preview Run (dry-run)</button>
      </div>
      {result && (<pre style={{ marginTop: 12, background: '#f6f8fa', padding: 12 }}>
          {JSON.stringify(result, null, 2)}
        </pre>)}
    </div>);
}

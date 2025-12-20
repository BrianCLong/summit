// @ts-nocheck
import React from 'react';
import ReactFlow, {
  Background,
  Controls,
  MiniMap,
  addEdge,
  useEdgesState,
  useNodesState,
  Connection,
} from 'reactflow';
import 'reactflow/dist/style.css';

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

export default function WorkflowEditor() {
  const [nodes, , onNodesChange] = useNodesState(initialNodes);
  const [edges, setEdges, onEdgesChange] = useEdgesState(initialEdges);
  const [result, setResult] = React.useState<object | null>(null);
  const onConnect = React.useCallback(
    (params: Connection) => setEdges((eds: any) => addEdge(params, eds)),
    [setEdges],
  );

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

  return (
    <div
      style={{ padding: 24 }}
      role="application"
      aria-label="Workflow editor canvas"
    >
      <h2>Workflow Editor</h2>
      <div
        style={{ height: 420, border: '1px solid #ddd', borderRadius: 8 }}
        tabIndex={0}
        aria-label="Graph canvas"
      >
        <ReactFlow
          nodes={nodes}
          edges={edges}
          onNodesChange={onNodesChange}
          onEdgesChange={onEdgesChange}
          onConnect={onConnect}
          fitView
        >
          <MiniMap />
          <Controls />
          <Background gap={16} />
        </ReactFlow>
      </div>
      <div style={{ marginTop: 12, display: 'flex', gap: 8 }}>
        <button onClick={previewRun}>Preview Run (dry-run)</button>
      </div>
      {result && (
        <pre style={{ marginTop: 12, background: '#f6f8fa', padding: 12 }}>
          {JSON.stringify(result, null, 2)}
        </pre>
      )}
    </div>
  );
}

// @ts-nocheck
import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { useSearchParams } from 'react-router-dom';
import ReactFlow, {
  Node,
  Edge,
  Controls,
  Background,
  useNodesState,
  useEdgesState,
  Panel,
  MarkerType,
  Position,
} from 'reactflow';
import 'reactflow/dist/style.css';

interface RunStep {
  id: string;
  name: string;
  state: 'pending' | 'running' | 'completed' | 'failed' | 'skipped';
  parents: string[];
  traceId?: string;
  duration?: number;
  startTime?: string;
  endTime?: string;
  logs?: string[];
}

interface RunData {
  id: string;
  name: string;
  status: 'pending' | 'running' | 'completed' | 'failed' | 'cancelled';
  steps: RunStep[];
  startTime?: string;
  endTime?: string;
  duration?: number;
}

const getNodeColor = (state: string) => {
  switch (state) {
    case 'pending':
      return { bg: '#f3f4f6', border: '#d1d5db', text: '#374151' };
    case 'running':
      return { bg: '#dbeafe', border: '#3b82f6', text: '#1e40af' };
    case 'completed':
      return { bg: '#dcfce7', border: '#22c55e', text: '#166534' };
    case 'failed':
      return { bg: '#fecaca', border: '#ef4444', text: '#991b1b' };
    case 'skipped':
      return { bg: '#fef3c7', border: '#f59e0b', text: '#92400e' };
    default:
      return { bg: '#f3f4f6', border: '#d1d5db', text: '#374151' };
  }
};

const getStatusIcon = (state: string) => {
  switch (state) {
    case 'pending':
      return '⏳';
    case 'running':
      return '🏃‍♂️';
    case 'completed':
      return '✅';
    case 'failed':
      return '❌';
    case 'skipped':
      return '⏭️';
    default:
      return '❓';
  }
};

const CustomNode = ({ data }: { data: any }) => {
  const colors = getNodeColor(data.state);
  const icon = getStatusIcon(data.state);

  return (
    <div
      className="px-4 py-2 shadow-md rounded-md border-2 min-w-[150px]"
      style={{
        backgroundColor: colors.bg,
        borderColor: colors.border,
        color: colors.text,
      }}
    >
      <div className="flex items-center justify-between">
        <div className="font-bold text-sm">{data.name}</div>
        <div className="text-lg">{icon}</div>
      </div>

      <div className="text-xs mt-1">
        <div>State: {data.state}</div>
        {data.duration && (
          <div>Duration: {Math.round(data.duration / 1000)}s</div>
        )}
      </div>

      {data.traceId && (
        <div className="mt-2">
          <a
            href={data.traceUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="text-xs bg-blue-100 text-blue-700 px-2 py-1 rounded hover:bg-blue-200 inline-block"
            onClick={(e) => e.stopPropagation()}
          >
            Open in Traces
          </a>
        </div>
      )}
    </div>
  );
};

const nodeTypes = {
  custom: CustomNode,
};

export default function RunViewer() {
  const [searchParams] = useSearchParams();
  const runId = searchParams.get('runId');

  const [runData, setRunData] = useState<RunData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string>('');
  const [nodes, setNodes, onNodesChange] = useNodesState([]);
  const [edges, setEdges, onEdgesChange] = useEdgesState([]);

  // Fetch run data with polling
  const fetchRunData = useCallback(async () => {
    if (!runId) {
      setError('No runId provided in query parameters');
      setLoading(false);
      return;
    }

    try {
      const response = await fetch(`/api/maestro/v1/runs/${runId}`);
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      const data = await response.json();
      setRunData(data);
      setError('');
    } catch (err) {
      console.error('Failed to fetch run data:', err);
      setError(err instanceof Error ? err.message : 'Failed to fetch run data');
    } finally {
      setLoading(false);
    }
  }, [runId]);

  // Initial fetch and polling setup
  useEffect(() => {
    fetchRunData();

    // Set up polling every 5 seconds if run is still active
    const pollInterval = setInterval(() => {
      if (runData?.status === 'running' || runData?.status === 'pending') {
        fetchRunData();
      }
    }, 5000);

    return () => clearInterval(pollInterval);
  }, [fetchRunData, runData?.status]);

  // Generate nodes and edges from run data
  const { flowNodes, flowEdges } = useMemo(() => {
    if (!runData || !runData.steps) {
      return { flowNodes: [], flowEdges: [] };
    }

    // Create a map for quick lookup
    const stepMap = new Map(runData.steps.map((step) => [step.id, step]));

    // Calculate layout positions using a simple hierarchical layout
    const levels = new Map<string, number>();
    const visited = new Set<string>();

    const calculateLevel = (stepId: string): number => {
      if (visited.has(stepId)) return levels.get(stepId) || 0;
      visited.add(stepId);

      const step = stepMap.get(stepId);
      if (!step || step.parents.length === 0) {
        levels.set(stepId, 0);
        return 0;
      }

      const parentLevels = step.parents.map((parentId) =>
        calculateLevel(parentId),
      );
      const level = Math.max(...parentLevels) + 1;
      levels.set(stepId, level);
      return level;
    };

    // Calculate levels for all steps
    runData.steps.forEach((step) => calculateLevel(step.id));

    // Group steps by level
    const levelGroups = new Map<number, string[]>();
    levels.forEach((level, stepId) => {
      if (!levelGroups.has(level)) {
        levelGroups.set(level, []);
      }
      levelGroups.get(level)!.push(stepId);
    });

    // Generate trace URL helper
    const generateTraceUrl = (traceId: string) => {
      const tempoUrl = import.meta.env.VITE_OBS_TEMPO_URL;
      if (tempoUrl && traceId) {
        return `${tempoUrl}/trace/${traceId}`;
      }
      return null;
    };

    // Create nodes with positions
    const flowNodes: Node[] = runData.steps.map((step, index) => {
      const level = levels.get(step.id) || 0;
      const levelSteps = levelGroups.get(level) || [];
      const indexInLevel = levelSteps.indexOf(step.id);

      const x = level * 200 + 100;
      const y = indexInLevel * 120 + 100;

      return {
        id: step.id,
        type: 'custom',
        position: { x, y },
        data: {
          name: step.name,
          state: step.state,
          duration: step.duration,
          traceId: step.traceId,
          traceUrl: step.traceId ? generateTraceUrl(step.traceId) : null,
        },
        sourcePosition: Position.Right,
        targetPosition: Position.Left,
      };
    });

    // Create edges
    const flowEdges: Edge[] = [];
    runData.steps.forEach((step) => {
      step.parents.forEach((parentId) => {
        flowEdges.push({
          id: `${parentId}-${step.id}`,
          source: parentId,
          target: step.id,
          markerEnd: {
            type: MarkerType.ArrowClosed,
            color: '#6b7280',
          },
          style: {
            stroke: '#6b7280',
            strokeWidth: 2,
          },
        });
      });
    });

    return { flowNodes, flowEdges };
  }, [runData]);

  // Update nodes and edges when data changes
  useEffect(() => {
    setNodes(flowNodes);
    setEdges(flowEdges);
  }, [flowNodes, flowEdges, setNodes, setEdges]);

  if (!runId) {
    return (
      <div className="p-6">
        <h1 className="text-2xl font-bold mb-4">Run Viewer</h1>
        <div className="bg-red-50 border border-red-200 rounded-md p-4">
          <p className="text-red-800">
            No runId provided. Please include ?runId=&lt;run-id&gt; in the URL.
          </p>
        </div>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="p-6">
        <h1 className="text-2xl font-bold mb-4">Run Viewer</h1>
        <div className="flex items-center justify-center h-64">
          <div className="text-lg">Loading run data...</div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-6">
        <h1 className="text-2xl font-bold mb-4">Run Viewer</h1>
        <div className="bg-red-50 border border-red-200 rounded-md p-4">
          <p className="text-red-800 font-semibold">Error loading run data:</p>
          <p className="text-red-600 mt-1">{error}</p>
          <button
            onClick={fetchRunData}
            className="mt-3 px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700"
          >
            Retry
          </button>
        </div>
      </div>
    );
  }

  if (!runData) {
    return (
      <div className="p-6">
        <h1 className="text-2xl font-bold mb-4">Run Viewer</h1>
        <div className="bg-yellow-50 border border-yellow-200 rounded-md p-4">
          <p className="text-yellow-800">Run not found.</p>
        </div>
      </div>
    );
  }

  const statusColors = getNodeColor(runData.status);

  return (
    <div className="h-screen flex flex-col">
      {/* Header */}
      <div className="p-4 border-b bg-white">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold">
              {runData.name || `Run ${runId}`}
            </h1>
            <div className="flex items-center gap-4 mt-1 text-sm text-gray-600">
              <span>
                ID: <code className="bg-gray-100 px-1 rounded">{runId}</code>
              </span>
              <span
                className="px-2 py-1 rounded text-xs font-semibold"
                style={{
                  backgroundColor: statusColors.bg,
                  color: statusColors.text,
                  borderColor: statusColors.border,
                }}
              >
                {runData.status.toUpperCase()}
              </span>
              {runData.duration && (
                <span>Duration: {Math.round(runData.duration / 1000)}s</span>
              )}
            </div>
          </div>

          <div className="flex gap-2">
            <button
              onClick={fetchRunData}
              className="px-3 py-1 text-sm bg-blue-100 text-blue-700 rounded hover:bg-blue-200"
            >
              Refresh
            </button>
            {runData.status === 'running' && (
              <div className="px-3 py-1 text-sm bg-green-100 text-green-700 rounded">
                Auto-refreshing (5s)
              </div>
            )}
          </div>
        </div>
      </div>

      {/* DAG Visualization */}
      <div className="flex-1" role="region" aria-label="Run graph">
        <ReactFlow
          nodes={nodes}
          edges={edges}
          onNodesChange={onNodesChange}
          onEdgesChange={onEdgesChange}
          nodeTypes={nodeTypes}
          fitView
          minZoom={0.1}
          maxZoom={2}
          defaultEdgeOptions={{
            markerEnd: { type: MarkerType.ArrowClosed },
          }}
        >
          <Background />
          <Controls />

          <Panel position="top-right" className="bg-white p-3 rounded shadow">
            <h3 className="font-semibold text-sm mb-2">Legend</h3>
            <div className="space-y-1 text-xs">
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 bg-gray-100 border border-gray-300 rounded"></div>
                <span>Pending</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 bg-blue-100 border border-blue-400 rounded"></div>
                <span>Running</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 bg-green-100 border border-green-400 rounded"></div>
                <span>Completed</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 bg-red-100 border border-red-400 rounded"></div>
                <span>Failed</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 bg-yellow-100 border border-yellow-400 rounded"></div>
                <span>Skipped</span>
              </div>
            </div>
          </Panel>
        </ReactFlow>
      </div>

      {/* Stats Footer */}
      <div className="p-2 bg-gray-50 border-t text-sm text-gray-600">
        <div className="flex justify-between">
          <span>Steps: {runData.steps.length}</span>
          <div className="flex gap-4">
            <span>
              Completed:{' '}
              {runData.steps.filter((s) => s.state === 'completed').length}
            </span>
            <span>
              Running:{' '}
              {runData.steps.filter((s) => s.state === 'running').length}
            </span>
            <span>
              Failed: {runData.steps.filter((s) => s.state === 'failed').length}
            </span>
            <span>
              Pending:{' '}
              {runData.steps.filter((s) => s.state === 'pending').length}
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}

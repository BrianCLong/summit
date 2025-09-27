import React from 'react';
import { Box } from '@mui/material';
import ReactFlow, { Background, Controls, MarkerType, ReactFlowProvider } from 'reactflow';
import type { LineageSnapshot, DiffStatus } from './types';
import './eltm.css';
import 'reactflow/dist/style.css';

interface LineageGraphProps {
  snapshot: LineageSnapshot;
  nodeStatuses?: Record<string, DiffStatus>;
  edgeStatuses?: Record<string, DiffStatus>;
  ariaLabel: string;
}

type Position = { x: number; y: number };

type LayoutMap = Record<string, Position>;

const STATUS_COLOR: Record<DiffStatus, string> = {
  unchanged: '#90a4ae',
  added: '#2e7d32',
  removed: '#c62828',
  changed: '#ed6c02',
};

const computeLayout = (snapshot: LineageSnapshot): LayoutMap => {
  const nonGovernanceEdges = snapshot.edges.filter((edge) => edge.relationship !== 'governs');
  const incoming = new Map<string, number>();
  const adjacency = new Map<string, string[]>();

  for (const node of snapshot.nodes) {
    if (node.type !== 'policy') {
      incoming.set(node.id, 0);
    }
  }

  for (const edge of nonGovernanceEdges) {
    if (!incoming.has(edge.target)) continue;
    incoming.set(edge.target, (incoming.get(edge.target) ?? 0) + 1);
    const list = adjacency.get(edge.source) ?? [];
    list.push(edge.target);
    adjacency.set(edge.source, list);
  }

  const levels = new Map<string, number>();
  const queue: string[] = [];
  for (const [nodeId, count] of incoming.entries()) {
    if (count === 0) {
      queue.push(nodeId);
      levels.set(nodeId, 0);
    }
  }

  while (queue.length) {
    const current = queue.shift()!;
    const currentLevel = levels.get(current) ?? 0;
    for (const next of adjacency.get(current) ?? []) {
      const nextLevel = Math.max(currentLevel + 1, levels.get(next) ?? 0);
      levels.set(next, nextLevel);
      const remaining = (incoming.get(next) ?? 0) - 1;
      incoming.set(next, remaining);
      if (remaining === 0) {
        queue.push(next);
      }
    }
  }

  for (const node of snapshot.nodes) {
    if (!levels.has(node.id) && node.type !== 'policy') {
      levels.set(node.id, 0);
    }
  }

  for (const edge of snapshot.edges) {
    if (edge.relationship === 'governs') {
      const targetLevel = levels.get(edge.target) ?? 0;
      levels.set(edge.source, targetLevel - 0.5);
    }
  }

  const levelGroups = new Map<number, string[]>();
  for (const node of snapshot.nodes) {
    const level = levels.get(node.id) ?? 0;
    const group = levelGroups.get(level) ?? [];
    group.push(node.id);
    levelGroups.set(level, group);
  }

  const positions: LayoutMap = {};
  const verticalSpacing = 120;
  const horizontalSpacing = 240;

  for (const [level, nodeIds] of levelGroups.entries()) {
    nodeIds.sort();
    nodeIds.forEach((nodeId, index) => {
      positions[nodeId] = {
        x: level * horizontalSpacing,
        y: index * verticalSpacing,
      };
    });
  }

  return positions;
};

const statusClass = (prefix: string, status: DiffStatus | undefined) => {
  const effective = status ?? 'unchanged';
  return `${prefix}-${effective}`;
};

const GraphInner: React.FC<LineageGraphProps> = ({ snapshot, nodeStatuses, edgeStatuses, ariaLabel }) => {
  const layout = React.useMemo(() => computeLayout(snapshot), [snapshot]);

  const nodes = React.useMemo(
    () =>
      snapshot.nodes.map((node) => {
        const position = layout[node.id] ?? { x: 0, y: 0 };
        const diffStatus = nodeStatuses?.[node.id] ?? 'unchanged';
        return {
          id: node.id,
          position,
          data: {
            label: (
              <div
                className={`eltm-node eltm-node-type-${node.type} ${statusClass('eltm-node-status', diffStatus)}`}
              >
                <div className="eltm-node-title">{node.name}</div>
                <div className="eltm-node-subtitle">
                  {node.type} · {node.version}
                </div>
                {node.commitSha && <div className="eltm-node-meta">commit {node.commitSha}</div>}
              </div>
            ),
          },
          draggable: false,
          selectable: false,
        };
      }),
    [layout, nodeStatuses, snapshot.nodes],
  );

  const edges = React.useMemo(
    () =>
      snapshot.edges.map((edge) => {
        const status = edgeStatuses?.[edge.id] ?? 'unchanged';
        return {
          id: edge.id,
          source: edge.source,
          target: edge.target,
          type: 'smoothstep',
          label: edge.relationship === 'governs' ? 'governs' : undefined,
          animated: status === 'added',
          style: {
            stroke: STATUS_COLOR[status],
            strokeWidth: status === 'unchanged' ? 2 : 3,
          },
          markerEnd:
            status === 'removed'
              ? undefined
              : {
                  type: MarkerType.ArrowClosed,
                  color: STATUS_COLOR[status],
                },
          selectable: false,
          className: `eltm-edge-status-${status}`,
        };
      }),
    [edgeStatuses, snapshot.edges],
  );

  return (
    <Box className="eltm-graph-container" aria-label={ariaLabel} role="group">
      <Box
        component="dl"
        sx={{
          position: 'absolute',
          width: 1,
          height: 1,
          overflow: 'hidden',
          clip: 'rect(0 0 0 0)',
          whiteSpace: 'nowrap',
        }}
      >
        {snapshot.nodes.map((node) => (
          <React.Fragment key={node.id}>
            <dt>{node.name}</dt>
            <dd>{`${node.type} version ${node.version}${node.commitSha ? ` commit ${node.commitSha}` : ''}`}</dd>
          </React.Fragment>
        ))}
      </Box>
      <ReactFlowProvider>
        <ReactFlow
          nodes={nodes}
          edges={edges}
          nodesDraggable={false}
          nodesConnectable={false}
          elementsSelectable={false}
          fitView
          fitViewOptions={{ padding: 0.2 }}
          minZoom={0.6}
          maxZoom={1.4}
          proOptions={{ hideAttribution: true }}
        >
          <Background gap={24} size={1} color="#eceff1" />
          <Controls showInteractive={false} />
        </ReactFlow>
      </ReactFlowProvider>
    </Box>
  );
};

const LineageGraph: React.FC<LineageGraphProps> = (props) => <GraphInner {...props} />;

export default LineageGraph;

import { useMemo } from 'react';
import { Box, Chip, Typography } from '@mui/material';
import type { WorkflowNode } from './types';

const STATUS_COLORS: Record<string, string> = {
  QUEUED: '#9e9e9e',
  RUNNING: '#1e88e5',
  PAUSED: '#fbc02d',
  COMPLETED: '#2e7d32',
  FAILED: '#c62828',
};

const CANVAS_WIDTH = 640;
const CANVAS_HEIGHT = 240;
const NODE_RADIUS = 18;

interface WorkflowGraphProps {
  nodes: WorkflowNode[];
}

interface PositionedNode extends WorkflowNode {
  x: number;
  y: number;
}

export function WorkflowGraph({ nodes }: WorkflowGraphProps) {
  const positionedNodes = useMemo<PositionedNode[]>(() => {
    if (!nodes.length) {
      return [];
    }
    const horizontalSpacing =
      nodes.length > 1
        ? (CANVAS_WIDTH - NODE_RADIUS * 4) / (nodes.length - 1)
        : 0;
    return nodes.map((node, index) => ({
      ...node,
      x: NODE_RADIUS * 2 + horizontalSpacing * index,
      y: CANVAS_HEIGHT / 2,
    }));
  }, [nodes]);

  if (!nodes.length) {
    return (
      <Box textAlign="center" py={8}>
        <Typography variant="body2" color="text.secondary">
          No workflow steps reported yet.
        </Typography>
      </Box>
    );
  }

  return (
    <Box>
      <Typography variant="h6" gutterBottom>
        Execution Graph
      </Typography>
      <Box
        component="svg"
        viewBox={`0 0 ${CANVAS_WIDTH} ${CANVAS_HEIGHT}`}
        width="100%"
        height={CANVAS_HEIGHT}
        role="img"
        aria-label="Workflow execution graph"
      >
        {positionedNodes.map((node, index) => {
          if (index === 0) {
            return null;
          }
          const prev = positionedNodes[index - 1];
          return (
            <line
              key={`${node.id}-line`}
              x1={prev.x}
              y1={prev.y}
              x2={node.x}
              y2={node.y}
              stroke="#bdbdbd"
              strokeWidth={3}
            />
          );
        })}
        {positionedNodes.map((node) => (
          <g key={node.id}>
            <circle
              cx={node.x}
              cy={node.y}
              r={NODE_RADIUS}
              fill={STATUS_COLORS[node.status] ?? '#616161'}
              stroke="#212121"
              strokeWidth={2}
            />
            <text
              x={node.x}
              y={node.y + NODE_RADIUS + 24}
              textAnchor="middle"
              fill="#424242"
              fontSize="14"
            >
              {node.label}
            </text>
            <text
              x={node.x}
              y={node.y - NODE_RADIUS - 12}
              textAnchor="middle"
              fill="#424242"
              fontSize="12"
            >
              {node.status}
            </text>
          </g>
        ))}
      </Box>
      <Box mt={2} display="flex" gap={1} flexWrap="wrap">
        {Object.entries(STATUS_COLORS).map(([status, color]) => (
          <Chip
            key={status}
            size="small"
            label={status}
            sx={{
              backgroundColor: color,
              color: '#fff',
            }}
          />
        ))}
      </Box>
    </Box>
  );
}

import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  Alert,
  Box,
  Button,
  Divider,
  IconButton,
  MenuItem,
  Paper,
  Stack,
  TextField,
  Tooltip,
  Typography,
} from '@mui/material';
import { Add, Clear, Delete, FilterList, Save, Share } from '@mui/icons-material';
import {
  Background,
  Connection,
  Controls,
  Edge,
  Handle,
  MiniMap,
  Node,
  NodeProps,
  Position,
  ReactFlow,
  ReactFlowProvider,
  addEdge,
  useEdgesState,
  useNodesState,
} from 'reactflow';
import 'reactflow/dist/style.css';
import { gql, useMutation } from '@apollo/client';
import {
  GraphQuery,
  GraphQueryEdge,
  GraphQueryNode,
  GraphQueryValidationResult,
  QueryChip,
} from '@/types/graphQuery';

const FIELDS = [
  { label: 'Title', value: 'title' },
  { label: 'Content', value: 'content' },
  { label: 'Author', value: 'author' },
  { label: 'Type', value: 'type' },
  { label: 'Created', value: 'createdAt' },
  { label: 'Tags', value: 'tags' },
  { label: 'Status', value: 'status' },
];

const OPERATORS = ['contains', 'equals', 'starts with', 'ends with'];

const LOGICAL_OPERATORS: Array<'AND' | 'OR'> = ['AND', 'OR'];

export const VALIDATE_GRAPH_QUERY = gql`
  mutation ValidateGraphQuery($query: GraphQueryInput!) {
    validateGraphQuery(query: $query) {
      valid
      message
      errors
      suggestions
      normalized
    }
  }
`;

interface ValidateGraphQueryResponse {
  validateGraphQuery: GraphQueryValidationResult;
}

interface ValidateGraphQueryVariables {
  query: GraphQuery;
}

interface GraphQueryBuilderProps {
  initialQuery?: GraphQuery;
  query?: GraphQuery;
  onQueryChange?: (query: GraphQuery) => void;
  onChipsChange?: (chips: QueryChip[]) => void;
  onSave?: (name: string, query: GraphQuery) => void;
  onShare?: (query: GraphQuery) => void;
  readOnly?: boolean;
}

export interface QueryChipBuilderProps {
  chips: QueryChip[];
  onChipsChange: (chips: QueryChip[]) => void;
  onSave?: (name: string) => void;
  onShare?: () => void;
}

type FlowNodeData = GraphQueryNode & { label: string };

type FlowNode = Node<FlowNodeData>;

type FlowEdge = Edge<{ logicalOperator: 'AND' | 'OR' }>;

function formatLabel(data: GraphQueryNode) {
  const { field, operator, value } = data;
  return `${field || 'field'} ${operator || 'operator'} ${value || 'value'}`;
}

function toFlowNodes(query: GraphQuery): FlowNode[] {
  if (!query.nodes.length) {
    return [];
  }

  return query.nodes.map((node, index) => ({
    id: node.id,
    type: 'conditionNode',
    position: {
      x: (index % 3) * 240,
      y: Math.floor(index / 3) * 160,
    },
    data: {
      ...node,
      label: formatLabel(node),
    },
  }));
}

function toFlowEdges(query: GraphQuery): FlowEdge[] {
  if (!query.edges.length) {
    return [];
  }

  return query.edges.map((edge) => ({
    id: edge.id,
    source: edge.source,
    target: edge.target,
    type: 'smoothstep',
    animated: false,
    label: edge.logicalOperator,
    data: { logicalOperator: edge.logicalOperator },
  }));
}

function toGraphQuery(nodes: FlowNode[], edges: FlowEdge[]): GraphQuery {
  const graphNodes: GraphQueryNode[] = nodes.map((node) => ({
    id: node.id,
    field: node.data.field,
    operator: node.data.operator,
    value: node.data.value,
    type: node.data.type,
    description: node.data.description,
  }));

  const graphEdges: GraphQueryEdge[] = edges.map((edge) => ({
    id: edge.id,
    source: edge.source,
    target: edge.target,
    logicalOperator: edge.data?.logicalOperator || 'AND',
  }));

  const incomingByNode = new Map<string, number>();
  graphNodes.forEach((node) => incomingByNode.set(node.id, 0));
  graphEdges.forEach((edge) => {
    incomingByNode.set(edge.target, (incomingByNode.get(edge.target) || 0) + 1);
  });

  const rootId = graphNodes.find((node) => (incomingByNode.get(node.id) || 0) === 0)?.id;

  return {
    nodes: graphNodes,
    edges: graphEdges,
    rootId,
  };
}

function toChips(query: GraphQuery): QueryChip[] {
  return query.nodes.map((node) => ({
    id: node.id,
    field: node.field,
    operator: node.operator,
    value: node.value,
    type: 'filter',
  }));
}

const ConditionNode = ({ data, selected }: NodeProps<FlowNodeData>) => (
  <Box
    data-testid="graph-query-node"
    sx={{
      p: 1.5,
      borderRadius: 2,
      bgcolor: selected ? 'primary.light' : 'background.paper',
      border: '1px solid',
      borderColor: selected ? 'primary.main' : 'divider',
      minWidth: 180,
      boxShadow: selected ? 3 : 1,
      transition: 'box-shadow 0.2s ease',
    }}
  >
    <Handle type="target" position={Position.Top} />
    <Typography variant="subtitle2" gutterBottom>
      {data.field || 'Select field'}
    </Typography>
    <Typography variant="body2" color="text.secondary">
      {`${data.operator || 'operator'} ${data.value || ''}`}
    </Typography>
    <Handle type="source" position={Position.Bottom} />
  </Box>
);

ConditionNode.displayName = 'ConditionNode';

const nodeTypes = { conditionNode: ConditionNode };

function GraphQueryBuilderInner(props: GraphQueryBuilderProps) {
  const {
    initialQuery,
    query,
    onQueryChange,
    onChipsChange,
    onSave,
    onShare,
    readOnly,
  } = props;

  const initialState = useMemo(() => {
    const seed = query || initialQuery || { nodes: [], edges: [] };
    return {
      nodes: toFlowNodes(seed),
      edges: toFlowEdges(seed),
    };
  }, [initialQuery, query]);

  const [nodes, setNodes, onNodesChange] = useNodesState(initialState.nodes);
  const [edges, setEdges, onEdgesChange] = useEdgesState(initialState.edges);
  const [selectedNodeId, setSelectedNodeId] = useState<string | null>(null);
  const [selectedEdgeId, setSelectedEdgeId] = useState<string | null>(null);
  const [newNode, setNewNode] = useState<Partial<GraphQueryNode>>({
    field: '',
    operator: 'contains',
    value: '',
    type: 'condition',
  });
  const [validationState, setValidationState] = useState<
    | { status: 'idle' }
    | { status: 'loading' }
    | { status: 'valid'; result: GraphQueryValidationResult }
    | { status: 'invalid'; result: GraphQueryValidationResult }
    | { status: 'error'; message: string }
  >({ status: 'idle' });

  const [validateGraphQuery] = useMutation<
    ValidateGraphQueryResponse,
    ValidateGraphQueryVariables
  >(VALIDATE_GRAPH_QUERY);

  const flowNodeById = useMemo(() => {
    const map = new Map<string, FlowNode>();
    nodes.forEach((node) => map.set(node.id, node));
    return map;
  }, [nodes]);

  const selectedNode = selectedNodeId ? flowNodeById.get(selectedNodeId) || null : null;
  const selectedEdge = useMemo(
    () => (selectedEdgeId ? edges.find((edge) => edge.id === selectedEdgeId) || null : null),
    [edges, selectedEdgeId],
  );

  const graphQuery = useMemo(() => toGraphQuery(nodes, edges), [nodes, edges]);
  const serializedGraphQuery = useMemo(() => JSON.stringify(graphQuery), [graphQuery]);

  useEffect(() => {
    if (!query) {
      return;
    }

    const normalizedIncoming = JSON.stringify(query);
    if (normalizedIncoming === serializedGraphQuery) {
      return;
    }

    setNodes(toFlowNodes(query));
    setEdges(toFlowEdges(query));
  }, [query, serializedGraphQuery, setEdges, setNodes]);

  useEffect(() => {
    onQueryChange?.(graphQuery);
    onChipsChange?.(toChips(graphQuery));
  }, [graphQuery, onChipsChange, onQueryChange]);

  useEffect(() => {
    if (!graphQuery.nodes.length) {
      setValidationState({ status: 'idle' });
      return;
    }

    let isCancelled = false;
    const timeout = window.setTimeout(() => {
      setValidationState({ status: 'loading' });
      validateGraphQuery({ variables: { query: graphQuery } })
        .then((response) => {
          if (isCancelled) return;
          const result = response.data?.validateGraphQuery;
          if (result?.valid) {
            setValidationState({ status: 'valid', result });
          } else if (result) {
            setValidationState({ status: 'invalid', result });
          } else {
            setValidationState({
              status: 'error',
              message: 'No validation response received from server.',
            });
          }
        })
        .catch((error) => {
          if (isCancelled) return;
          setValidationState({ status: 'error', message: error.message });
        });
    }, 450);

    return () => {
      isCancelled = true;
      window.clearTimeout(timeout);
    };
  }, [graphQuery, validateGraphQuery]);

  const handleAddNode = useCallback(() => {
    if (!newNode.field || !newNode.operator || !newNode.value) {
      return;
    }

    const id = `node-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;
    const nodeData: FlowNodeData = {
      id,
      field: newNode.field,
      operator: newNode.operator,
      value: newNode.value,
      type: newNode.type || 'condition',
      label: formatLabel({
        id,
        field: newNode.field,
        operator: newNode.operator,
        value: newNode.value,
        type: newNode.type || 'condition',
      }),
    };

    setNodes((current) => [
      ...current,
      {
        id,
        type: 'conditionNode',
        position: {
          x: (current.length % 3) * 240,
          y: Math.floor(current.length / 3) * 160,
        },
        data: nodeData,
      },
    ]);
    setNewNode({ field: '', operator: 'contains', value: '', type: 'condition' });
    setSelectedNodeId(id);
  }, [newNode, setNodes]);

  const handleConnect = useCallback(
    (connection: Connection) => {
      if (!connection.source || !connection.target) {
        return;
      }

      const id = `edge-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;
      setEdges((eds) =>
        addEdge(
          {
            ...connection,
            id,
            label: 'AND',
            data: { logicalOperator: 'AND' },
            type: 'smoothstep',
          },
          eds,
        ),
      );
      setSelectedEdgeId(id);
    },
    [setEdges],
  );

  const updateNodeData = useCallback(
    (field: keyof GraphQueryNode, value: string) => {
      if (!selectedNodeId) {
        return;
      }

      setNodes((current) =>
        current.map((node) => {
          if (node.id !== selectedNodeId) {
            return node;
          }

          const updatedData: FlowNodeData = {
            ...node.data,
            [field]: value,
          } as FlowNodeData;
          return {
            ...node,
            data: {
              ...updatedData,
              label: formatLabel(updatedData),
            },
          };
        }),
      );
    },
    [selectedNodeId, setNodes],
  );

  const handleRemoveNode = useCallback(() => {
    if (!selectedNodeId) {
      return;
    }

    setNodes((current) => current.filter((node) => node.id !== selectedNodeId));
    setEdges((current) =>
      current.filter((edge) => edge.source !== selectedNodeId && edge.target !== selectedNodeId),
    );
    setSelectedNodeId(null);
  }, [selectedNodeId, setEdges, setNodes]);

  const handleEdgeOperatorChange = useCallback(
    (operator: 'AND' | 'OR') => {
      if (!selectedEdgeId) {
        return;
      }

      setEdges((current) =>
        current.map((edge) =>
          edge.id === selectedEdgeId
            ? { ...edge, label: operator, data: { logicalOperator: operator } }
            : edge,
        ),
      );
    },
    [selectedEdgeId, setEdges],
  );

  const handleClear = useCallback(() => {
    setNodes([]);
    setEdges([]);
    setSelectedNodeId(null);
    setSelectedEdgeId(null);
    setValidationState({ status: 'idle' });
  }, [setEdges, setNodes]);

  const handleSave = useCallback(() => {
    if (!onSave) {
      return;
    }

    const name = window.prompt('Name this graph query', 'My graph query');
    if (name) {
      onSave(name, graphQuery);
    }
  }, [graphQuery, onSave]);

  const handleShare = useCallback(() => {
    onShare?.(graphQuery);
  }, [graphQuery, onShare]);

  return (
    <Paper data-testid="graph-query-builder" elevation={1} sx={{ p: 2, borderRadius: 3 }}>
      <Stack direction="row" spacing={1.5} alignItems="center" sx={{ mb: 2 }}>
        <FilterList color="primary" />
        <Typography variant="h6">Graph Query Builder</Typography>
        <Box sx={{ ml: 'auto', display: 'flex', gap: 1 }}>
          {onSave && (
            <Tooltip title="Save query">
              <span>
                <IconButton size="small" onClick={handleSave} disabled={readOnly}>
                  <Save />
                </IconButton>
              </span>
            </Tooltip>
          )}
          {onShare && (
            <Tooltip title="Share query">
              <span>
                <IconButton size="small" onClick={handleShare}>
                  <Share />
                </IconButton>
              </span>
            </Tooltip>
          )}
          <Tooltip title="Clear canvas">
            <span>
              <IconButton size="small" onClick={handleClear} disabled={readOnly}>
                <Clear />
              </IconButton>
            </span>
          </Tooltip>
        </Box>
      </Stack>

      <Divider sx={{ mb: 2 }} />

      <Stack direction={{ xs: 'column', md: 'row' }} spacing={3}>
        <Box sx={{ flex: 1, height: 420, minHeight: 360 }}>
          <ReactFlow
            nodes={nodes}
            edges={edges}
            nodeTypes={nodeTypes}
            onNodesChange={onNodesChange}
            onEdgesChange={onEdgesChange}
            onConnect={handleConnect}
            onSelectionChange={(selection) => {
              const node = selection?.nodes?.[0];
              const edge = selection?.edges?.[0];
              setSelectedNodeId(node?.id ?? null);
              setSelectedEdgeId(edge?.id ?? null);
            }}
            fitView
            fitViewOptions={{ padding: 0.2 }}
            proOptions={{ hideAttribution: true }}
          >
            <Controls showInteractive={!readOnly} />
            <MiniMap pannable zoomable />
            <Background gap={16} />
          </ReactFlow>
        </Box>

        <Box sx={{ width: { xs: '100%', md: 320 }, display: 'flex', flexDirection: 'column', gap: 2 }}>
          <Box>
            <Typography variant="subtitle2" gutterBottom>
              Add condition
            </Typography>
            <Stack spacing={1.5}>
              <TextField
                select
                label="New node field"
                value={newNode.field}
                onChange={(event) =>
                  setNewNode((previous) => ({ ...previous, field: event.target.value }))
                }
                disabled={readOnly}
              >
                {FIELDS.map((field) => (
                  <MenuItem key={field.value} value={field.value}>
                    {field.label}
                  </MenuItem>
                ))}
              </TextField>
              <TextField
                select
                label="New node operator"
                value={newNode.operator}
                onChange={(event) =>
                  setNewNode((previous) => ({ ...previous, operator: event.target.value }))
                }
                disabled={readOnly}
              >
                {OPERATORS.map((operator) => (
                  <MenuItem key={operator} value={operator}>
                    {operator}
                  </MenuItem>
                ))}
              </TextField>
              <TextField
                label="New node value"
                value={newNode.value}
                onChange={(event) =>
                  setNewNode((previous) => ({ ...previous, value: event.target.value }))
                }
                disabled={readOnly}
              />
              <Button
                data-testid="add-condition"
                variant="contained"
                startIcon={<Add />}
                disabled={
                  readOnly || !newNode.field || !newNode.operator || !newNode.value
                }
                onClick={handleAddNode}
              >
                Add condition node
              </Button>
            </Stack>
          </Box>

          {selectedNode && (
            <Box>
              <Typography variant="subtitle2" gutterBottom>
                Selected node
              </Typography>
              <Stack spacing={1.5}>
                <TextField
                  select
                  label="Field"
                  value={selectedNode.data.field}
                  onChange={(event) => updateNodeData('field', event.target.value)}
                  disabled={readOnly}
                >
                  {FIELDS.map((field) => (
                    <MenuItem key={field.value} value={field.value}>
                      {field.label}
                    </MenuItem>
                  ))}
                </TextField>
                <TextField
                  select
                  label="Operator"
                  value={selectedNode.data.operator}
                  onChange={(event) => updateNodeData('operator', event.target.value)}
                  disabled={readOnly}
                >
                  {OPERATORS.map((operator) => (
                    <MenuItem key={operator} value={operator}>
                      {operator}
                    </MenuItem>
                  ))}
                </TextField>
                <TextField
                  label="Value"
                  value={selectedNode.data.value}
                  onChange={(event) => updateNodeData('value', event.target.value)}
                  disabled={readOnly}
                />
                <Button
                  color="error"
                  startIcon={<Delete />}
                  onClick={handleRemoveNode}
                  disabled={readOnly}
                >
                  Delete node
                </Button>
              </Stack>
            </Box>
          )}

          {selectedEdge && (
            <Box>
              <Typography variant="subtitle2" gutterBottom>
                Selected edge
              </Typography>
              <TextField
                select
                label="Logical operator"
                value={selectedEdge.data?.logicalOperator || 'AND'}
                onChange={(event) =>
                  handleEdgeOperatorChange(event.target.value as 'AND' | 'OR')
                }
                disabled={readOnly}
              >
                {LOGICAL_OPERATORS.map((operator) => (
                  <MenuItem key={operator} value={operator}>
                    {operator}
                  </MenuItem>
                ))}
              </TextField>
            </Box>
          )}

          <Box>
            <Typography variant="subtitle2" gutterBottom>
              Validation
            </Typography>
            {validationState.status === 'idle' && (
              <Alert severity="info">Add nodes to validate your query.</Alert>
            )}
            {validationState.status === 'loading' && (
              <Alert severity="info">Validating query…</Alert>
            )}
            {validationState.status === 'valid' && (
              <Alert severity="success">
                {validationState.result.message || 'Query is valid.'}
              </Alert>
            )}
            {validationState.status === 'invalid' && (
              <Alert severity="warning">
                {validationState.result.message || 'Query needs attention.'}
                {validationState.result.errors && validationState.result.errors.length > 0 && (
                  <ul style={{ marginTop: 8, paddingLeft: 16 }}>
                    {validationState.result.errors.map((error) => (
                      <li key={error}>{error}</li>
                    ))}
                  </ul>
                )}
              </Alert>
            )}
            {validationState.status === 'error' && (
              <Alert severity="error">{validationState.message}</Alert>
            )}
          </Box>
        </Box>
      </Stack>
    </Paper>
  );
}

export function GraphQueryBuilder(props: GraphQueryBuilderProps) {
  return (
    <ReactFlowProvider>
      <GraphQueryBuilderInner {...props} />
    </ReactFlowProvider>
  );
}

export function QueryChipBuilder({ chips, onChipsChange, onSave, onShare }: QueryChipBuilderProps) {
  const initialQuery = useMemo<GraphQuery>(() => ({
    nodes: chips.map((chip, index) => ({
      id: chip.id || `chip-${index}`,
      field: chip.field,
      operator: chip.operator,
      value: chip.value,
      type: 'condition',
    })),
    edges: [],
  }), [chips]);

  const handleQueryChange = useCallback(
    (nextQuery: GraphQuery) => {
      onChipsChange(toChips(nextQuery));
    },
    [onChipsChange],
  );

  return (
    <GraphQueryBuilder
      initialQuery={initialQuery}
      onQueryChange={handleQueryChange}
      onSave={onSave ? (name, _query) => onSave(name) : undefined}
      onShare={onShare ? (_query) => onShare() : undefined}
    />
  );
}

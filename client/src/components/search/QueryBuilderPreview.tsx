import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { gql, useSubscription } from '@apollo/client';
import {
  Alert,
  Box,
  Chip,
  Divider,
  Grid,
  LinearProgress,
  List,
  ListItem,
  ListItemText,
  Paper,
  Stack,
  TextField,
  Tooltip,
  Typography,
} from '@mui/material';
import { FilterList, PlayArrow } from '@mui/icons-material';
import { QueryChip, QueryChipBuilder } from './QueryChipBuilder';

export const GRAPH_QUERY_PREVIEW_SUBSCRIPTION = gql`
  subscription GraphQueryPreview($cypher: String!, $parameters: JSON, $limit: Int!) {
    graphQueryPreview(cypher: $cypher, parameters: $parameters, limit: $limit) {
      eventId
      partial
      progress {
        completed
        total
        percentage
      }
      statistics {
        nodeCount
        edgeCount
      }
      nodes {
        id
        label
        type
        properties
      }
      edges {
        id
        type
        source
        target
        properties
      }
      errors {
        message
      }
    }
  }
`;

type GraphPreviewNode = {
  id: string;
  label?: string | null;
  type?: string | null;
  properties?: Record<string, unknown> | null;
};

type GraphPreviewEdge = {
  id?: string | null;
  type?: string | null;
  source: string;
  target: string;
  properties?: Record<string, unknown> | null;
};

type GraphPreviewProgress = {
  completed?: number | null;
  total?: number | null;
  percentage?: number | null;
};

type GraphPreviewStatistics = {
  nodeCount?: number | null;
  edgeCount?: number | null;
};

type GraphQueryPreviewEvent = {
  eventId?: string | null;
  partial?: boolean | null;
  progress?: GraphPreviewProgress | null;
  statistics?: GraphPreviewStatistics | null;
  nodes?: GraphPreviewNode[] | null;
  edges?: GraphPreviewEdge[] | null;
  errors?: { message?: string | null }[] | null;
};

type GraphQueryPreviewData = {
  graphQueryPreview?: GraphQueryPreviewEvent | null;
};

type GraphQueryPreviewVariables = {
  cypher: string;
  parameters?: Record<string, unknown> | null;
  limit: number;
};

type QueryBuilderPreviewProps = {
  /** Optional initial chips when rendering in Storybook or tests */
  initialChips?: QueryChip[];
  /** Allow parent components to consume accumulated preview data */
  onPreviewUpdate?: (data: { nodes: GraphPreviewNode[]; edges: GraphPreviewEdge[] }) => void;
  /** Optional parameters forwarded to the subscription */
  parameters?: Record<string, unknown> | null;
};

type PreviewState = {
  nodes: GraphPreviewNode[];
  edges: GraphPreviewEdge[];
  progress?: GraphPreviewProgress | null;
  statistics?: GraphPreviewStatistics | null;
  partial?: boolean | null;
  lastEventId?: string | null;
  errors: string[];
};

const INITIAL_PREVIEW_STATE: PreviewState = {
  nodes: [],
  edges: [],
  progress: null,
  statistics: null,
  partial: null,
  lastEventId: null,
  errors: [],
};

function sanitizeIdentifier(value: string): string {
  return value.replace(/[^a-zA-Z0-9_]/g, '_');
}

function formatCypherValue(rawValue: string): string {
  const trimmed = rawValue.trim();

  if (/^(true|false)$/i.test(trimmed)) {
    return trimmed.toLowerCase();
  }

  const numeric = Number(trimmed);
  if (!Number.isNaN(numeric) && trimmed !== '') {
    return numeric.toString();
  }

  const escaped = trimmed.replace(/'/g, "\\'");
  return `'${escaped}'`;
}

function buildCypherFromChips(chips: QueryChip[], limit: number): string {
  if (chips.length === 0) {
    return '';
  }

  const alias = 'n';
  const clauses = chips.map((chip) => {
    const field = `${alias}.${sanitizeIdentifier(chip.field)}`;
    const value = chip.value ?? '';
    const formatted = formatCypherValue(value);

    switch (chip.operator) {
      case 'contains':
        return `toLower(${field}) CONTAINS toLower(${formatted})`;
      case 'starts with':
        return `toLower(${field}) STARTS WITH toLower(${formatted})`;
      case 'ends with':
        return `toLower(${field}) ENDS WITH toLower(${formatted})`;
      case 'greater than':
        return `${field} > ${formatted}`;
      case 'less than':
        return `${field} < ${formatted}`;
      case 'between': {
        const parts = value
          .split(/\s*(?:,|\.\.|-)\s*/)
          .map((segment) => segment.trim())
          .filter(Boolean);
        if (parts.length === 2) {
          const [start, end] = parts.map(formatCypherValue);
          return `${field} >= ${start} AND ${field} <= ${end}`;
        }
        return `${field} = ${formatted}`;
      }
      case 'exists':
        return `${field} IS NOT NULL`;
      case 'in':
        return `${field} IN [${value
          .split(',')
          .map((part) => formatCypherValue(part))
          .join(', ')}]`;
      case 'not in':
        return `${field} NOT IN [${value
          .split(',')
          .map((part) => formatCypherValue(part))
          .join(', ')}]`;
      case 'equals':
      default:
        return `${field} = ${formatted}`;
    }
  });

  const whereClause = clauses.join(' AND ');
  return `MATCH (${alias}) WHERE ${whereClause} RETURN ${alias} LIMIT ${Math.max(limit, 1)}`;
}

function useDebouncedValue<T>(value: T, delayMs: number): T {
  const [debounced, setDebounced] = useState<T>(value);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      setDebounced(value);
    }, delayMs);

    return () => window.clearTimeout(timer);
  }, [value, delayMs]);

  return debounced;
}

export function QueryBuilderPreview({
  initialChips = [],
  onPreviewUpdate,
  parameters = null,
}: QueryBuilderPreviewProps) {
  const [chips, setChips] = useState<QueryChip[]>(initialChips);
  const [limit, setLimit] = useState<number>(25);
  const [previewState, setPreviewState] = useState<PreviewState>(INITIAL_PREVIEW_STATE);

  const cypher = useMemo(() => buildCypherFromChips(chips, limit), [chips, limit]);
  const debouncedCypher = useDebouncedValue(cypher, 350);

  useEffect(() => {
    setPreviewState(INITIAL_PREVIEW_STATE);
  }, [debouncedCypher]);

  const handlePreviewUpdate = useCallback(
    (event: GraphQueryPreviewEvent | null | undefined) => {
      if (!event) return;

      setPreviewState((prev) => {
        if (event.eventId && event.eventId === prev.lastEventId) {
          return prev;
        }

        const nodeMap = new Map<string, GraphPreviewNode>();
        prev.nodes.forEach((node) => nodeMap.set(node.id, node));
        event.nodes?.forEach((node) => {
          if (!node?.id) return;
          const existing = nodeMap.get(node.id);
          nodeMap.set(node.id, { ...existing, ...node });
        });

        const edgeMap = new Map<string, GraphPreviewEdge>();
        prev.edges.forEach((edge) => {
          const key = edge.id ?? `${edge.source}-${edge.target}`;
          edgeMap.set(key, edge);
        });
        event.edges?.forEach((edge) => {
          if (!edge?.source || !edge?.target) return;
          const key = edge.id ?? `${edge.source}-${edge.target}`;
          const existing = edgeMap.get(key);
          edgeMap.set(key, { ...existing, ...edge });
        });

        const errors = event.errors?.map((err) => err?.message).filter(Boolean) as string[] | undefined;

        return {
          nodes: Array.from(nodeMap.values()),
          edges: Array.from(edgeMap.values()),
          progress: event.progress ?? prev.progress,
          statistics: event.statistics ?? prev.statistics,
          partial: event.partial ?? prev.partial,
          lastEventId: event.eventId ?? prev.lastEventId,
          errors: errors ?? prev.errors,
        };
      });
    },
    [],
  );

  const { loading, error } = useSubscription<GraphQueryPreviewData, GraphQueryPreviewVariables>(
    GRAPH_QUERY_PREVIEW_SUBSCRIPTION,
    {
      variables: {
        cypher: debouncedCypher,
        parameters,
        limit,
      },
      skip: !debouncedCypher,
      shouldResubscribe: true,
      onSubscriptionData: ({ subscriptionData }) => {
        handlePreviewUpdate(subscriptionData.data?.graphQueryPreview);
      },
      fetchPolicy: 'no-cache',
    },
  );

  useEffect(() => {
    if (onPreviewUpdate) {
      onPreviewUpdate({ nodes: previewState.nodes, edges: previewState.edges });
    }
  }, [previewState.nodes, previewState.edges, onPreviewUpdate]);

  const statusMessage = useMemo(() => {
    if (!debouncedCypher) {
      return 'Add filters to generate a live preview.';
    }

    if (loading) {
      return 'Listening for preview updates…';
    }

    if (previewState.partial) {
      return 'Receiving partial graph results…';
    }

    if (previewState.nodes.length > 0 || previewState.edges.length > 0) {
      return 'Preview up to date.';
    }

    return 'No preview data received yet.';
  }, [debouncedCypher, loading, previewState.partial, previewState.nodes.length, previewState.edges.length]);

  const limitedNodes = useMemo(() => previewState.nodes.slice(0, 5), [previewState.nodes]);
  const limitedEdges = useMemo(() => previewState.edges.slice(0, 5), [previewState.edges]);

  return (
    <Paper elevation={2} sx={{ p: 2 }} data-testid="query-builder-preview">
      <Stack direction="row" spacing={1} alignItems="center" sx={{ mb: 2 }}>
        <FilterList color="primary" aria-hidden />
        <Typography variant="subtitle1" component="h2">
          Real-time Query Preview
        </Typography>
        {previewState.partial && (
          <Chip size="small" label="Streaming" color="primary" icon={<PlayArrow fontSize="small" />} />
        )}
      </Stack>

      <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
        Build your filters and watch partial graph results stream in from Neo4j.
      </Typography>

      <QueryChipBuilder chips={chips} onChipsChange={setChips} />

      <Grid container spacing={1} sx={{ mt: 1 }} alignItems="center">
        <Grid item xs={12} sm={6} md={4}>
          <TextField
            label="Preview limit"
            type="number"
            size="small"
            value={limit}
            inputProps={{ min: 1, max: 500, 'aria-label': 'Preview limit' }}
            onChange={(event) => {
              const next = Number(event.target.value);
              setLimit(Number.isFinite(next) && next > 0 ? Math.min(next, 500) : 25);
            }}
          />
        </Grid>
        {debouncedCypher && (
          <Grid item xs={12} sm={6} md={8}>
            <Tooltip title="Cypher query used for the preview">
              <Box
                sx={{
                  bgcolor: 'grey.100',
                  borderRadius: 1,
                  px: 1.5,
                  py: 1,
                  fontFamily: 'monospace',
                  fontSize: 12,
                  maxHeight: 96,
                  overflow: 'auto',
                }}
                aria-live="polite"
                role="note"
                data-testid="query-preview-query"
              >
                {debouncedCypher}
              </Box>
            </Tooltip>
          </Grid>
        )}
      </Grid>

      <Box
        mt={2}
        role="status"
        aria-live="polite"
        data-testid="query-preview-status"
        sx={{ color: 'text.secondary', fontSize: 13 }}
      >
        {statusMessage}
      </Box>

      {loading && debouncedCypher && <LinearProgress sx={{ mt: 1 }} aria-hidden data-testid="query-preview-loading" />}

      {error && (
        <Alert severity="error" sx={{ mt: 2 }} role="alert">
          Unable to stream preview data. {error.message}
        </Alert>
      )}

      {previewState.errors.length > 0 && (
        <Alert severity="warning" sx={{ mt: 2 }} role="alert">
          {previewState.errors.join(' ')}
        </Alert>
      )}

      {(limitedNodes.length > 0 || limitedEdges.length > 0) && (
        <Box sx={{ mt: 3 }}>
          <Typography variant="subtitle2" gutterBottom>
            Partial graph snapshot
          </Typography>
          <Divider sx={{ mb: 1 }} />
          <Grid container spacing={2}>
            {limitedNodes.length > 0 && (
              <Grid item xs={12} md={6}>
                <Typography variant="caption" sx={{ textTransform: 'uppercase', letterSpacing: 0.5 }}>
                  Nodes
                </Typography>
                <List dense data-testid="query-preview-nodes">
                  {limitedNodes.map((node) => (
                    <ListItem key={node.id} disableGutters>
                      <ListItemText
                        primary={node.label ?? node.id}
                        secondary={node.type ? `Type: ${node.type}` : undefined}
                      />
                    </ListItem>
                  ))}
                </List>
              </Grid>
            )}

            {limitedEdges.length > 0 && (
              <Grid item xs={12} md={6}>
                <Typography variant="caption" sx={{ textTransform: 'uppercase', letterSpacing: 0.5 }}>
                  Edges
                </Typography>
                <List dense data-testid="query-preview-edges">
                  {limitedEdges.map((edge) => (
                    <ListItem key={edge.id ?? `${edge.source}-${edge.target}`} disableGutters>
                      <ListItemText
                        primary={edge.type ?? 'relationship'}
                        secondary={`${edge.source} → ${edge.target}`}
                      />
                    </ListItem>
                  ))}
                </List>
              </Grid>
            )}
          </Grid>
        </Box>
      )}
    </Paper>
  );
}

export default QueryBuilderPreview;

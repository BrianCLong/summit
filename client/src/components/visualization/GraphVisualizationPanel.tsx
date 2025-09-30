import React, { useEffect, useMemo, useRef, useState } from 'react';
import cytoscape, { Core, ElementsDefinition } from 'cytoscape';
import { useMutation, useQuery } from '@apollo/client';
import {
  Alert,
  Box,
  CircularProgress,
  Paper,
  Typography,
} from '@mui/material';
import GraphLayoutPreferencesForm, {
  GraphLayoutPreference,
  GraphLayoutOption,
  buildLayoutOptions,
} from './GraphLayoutPreferencesForm';
import { GET_GRAPH_DATA } from '../../graphql/graphData.gql.js';
import {
  GET_GRAPH_LAYOUT_PREFERENCE,
  SAVE_GRAPH_LAYOUT_PREFERENCE,
} from '../../graphql/graphPreferences.gql.js';

interface GraphVisualizationPanelProps {
  investigationId?: string;
  onPreferenceApplied?: (preference: GraphLayoutPreference) => void;
}

const DEFAULT_PREFERENCE: GraphLayoutPreference = {
  layout: 'force',
  physicsEnabled: true,
  options: { orientation: 'vertical' },
};

const FALLBACK_ELEMENTS: ElementsDefinition = {
  nodes: [
    { data: { id: 'a', label: 'Intel Analyst', type: 'PERSON' } },
    { data: { id: 'b', label: 'Target Account', type: 'ACCOUNT' } },
    { data: { id: 'c', label: 'Known Associate', type: 'PERSON' } },
    { data: { id: 'd', label: 'Financial Entity', type: 'ORGANIZATION' } },
    { data: { id: 'e', label: 'Location', type: 'LOCATION' } },
  ],
  edges: [
    { data: { id: 'ab', source: 'a', target: 'b', label: 'Investigates' } },
    { data: { id: 'bc', source: 'b', target: 'c', label: 'Communicates' } },
    { data: { id: 'cd', source: 'c', target: 'd', label: 'Funds' } },
    { data: { id: 'de', source: 'd', target: 'e', label: 'Operates In' } },
    { data: { id: 'ae', source: 'a', target: 'e', label: 'Monitors' } },
  ],
};

const NODE_TYPE_COLORS: Record<string, string> = {
  PERSON: '#1a73e8',
  ORGANIZATION: '#d81b60',
  LOCATION: '#009688',
  EVENT: '#f9a825',
  ACCOUNT: '#6a1b9a',
};

const normalizePreference = (raw?: Partial<GraphLayoutPreference>): GraphLayoutPreference => ({
  layout: (raw?.layout as GraphLayoutOption) || DEFAULT_PREFERENCE.layout,
  physicsEnabled:
    typeof raw?.physicsEnabled === 'boolean'
      ? raw.physicsEnabled
      : DEFAULT_PREFERENCE.physicsEnabled,
  options: { ...DEFAULT_PREFERENCE.options, ...(raw?.options || {}) },
});

const buildGraphElements = (graphData?: any): ElementsDefinition => {
  if (!graphData || !Array.isArray(graphData.nodes) || graphData.nodes.length === 0) {
    return {
      nodes: [...FALLBACK_ELEMENTS.nodes],
      edges: [...FALLBACK_ELEMENTS.edges],
    };
  }

  const nodes = graphData.nodes
    .map((node: any) => {
      const id = node.id || node.entityId;
      if (!id) {
        return null;
      }
      const label = node.label || node.name || node.type || id;
      const type = node.type || 'UNKNOWN';
      return {
        data: {
          id: String(id),
          label: String(label),
          type: String(type).toUpperCase(),
        },
      };
    })
    .filter(Boolean) as ElementsDefinition['nodes'];

  const validNodeIds = new Set(nodes.map((n) => n.data?.id));

  const edges = (graphData.edges || [])
    .map((edge: any) => {
      const source = edge.fromEntityId || edge.source;
      const target = edge.toEntityId || edge.target;
      if (!source || !target) {
        return null;
      }

      const id = edge.id || `${source}-${target}`;
      const label = edge.label || edge.type || '';
      return {
        data: {
          id: String(id),
          source: String(source),
          target: String(target),
          label: label ? String(label) : undefined,
        },
      };
    })
    .filter((edge) => edge && validNodeIds.has(edge.data?.source) && validNodeIds.has(edge.data?.target)) as ElementsDefinition['edges'];

  if (nodes.length === 0) {
    return {
      nodes: [...FALLBACK_ELEMENTS.nodes],
      edges: [...FALLBACK_ELEMENTS.edges],
    };
  }

  return { nodes, edges };
};

const GraphVisualizationPanel: React.FC<GraphVisualizationPanelProps> = ({
  investigationId,
  onPreferenceApplied,
}) => {
  const graphContainerRef = useRef<HTMLDivElement | null>(null);
  const cyRef = useRef<Core | null>(null);

  const [preference, setPreference] = useState<GraphLayoutPreference>(DEFAULT_PREFERENCE);
  const [mutationError, setMutationError] = useState<string | null>(null);

  const {
    data: preferenceData,
    loading: preferenceLoading,
    error: preferenceError,
  } = useQuery(GET_GRAPH_LAYOUT_PREFERENCE);

  const {
    data: graphData,
    loading: graphLoading,
    error: graphError,
  } = useQuery(GET_GRAPH_DATA, {
    variables: { investigationId: investigationId ?? 'demo-investigation' },
    skip: !investigationId,
  });

  const [savePreference, { loading: savingPreference }] = useMutation(
    SAVE_GRAPH_LAYOUT_PREFERENCE,
  );

  useEffect(() => {
    if (preferenceData?.graphLayoutPreference) {
      setPreference(normalizePreference(preferenceData.graphLayoutPreference));
    }
  }, [preferenceData]);

  const elements = useMemo(
    () => buildGraphElements(graphData?.graphData),
    [graphData],
  );

  const layoutRootId = useMemo(() => {
    const firstNode = elements.nodes?.[0];
    return firstNode?.data?.id ? String(firstNode.data.id) : undefined;
  }, [elements]);

  useEffect(() => {
    if (!graphContainerRef.current) {
      return;
    }

    if (!cyRef.current) {
      cyRef.current = cytoscape({
        container: graphContainerRef.current,
        elements,
        style: [
          {
            selector: 'node',
            style: {
              'background-color': '#1a73e8',
              label: 'data(label)',
              color: '#fff',
              'font-size': 12,
              'text-outline-width': 2,
              'text-outline-color': '#1a73e8',
              'text-valign': 'bottom',
              'text-margin-y': 4,
            },
          },
          ...Object.entries(NODE_TYPE_COLORS).map(([type, color]) => ({
            selector: `node[type = "${type}"]`,
            style: {
              'background-color': color,
              'text-outline-color': color,
            },
          })),
          {
            selector: 'edge',
            style: {
              width: 2,
              'line-color': '#9e9e9e',
              'target-arrow-shape': 'triangle',
              'target-arrow-color': '#9e9e9e',
              'curve-style': 'bezier',
              label: 'data(label)',
              'font-size': 10,
              color: '#37474f',
              'text-background-color': '#ffffff',
              'text-background-opacity': 0.7,
              'text-background-padding': 2,
            },
          },
        ],
        layout: buildLayoutOptions(preference, { rootId: layoutRootId }),
        wheelSensitivity: 0.2,
      });
    } else {
      cyRef.current.json({ elements });
    }

    cyRef.current.resize();
    cyRef.current.center();
  }, [elements, layoutRootId]);

  useEffect(() => {
    if (!cyRef.current) {
      return;
    }

    cyRef.current.layout(buildLayoutOptions(preference, { rootId: layoutRootId })).run();
  }, [preference, layoutRootId]);

  useEffect(() => {
    return () => {
      cyRef.current?.destroy();
      cyRef.current = null;
    };
  }, []);

  const handlePreferenceChange = async (next: GraphLayoutPreference) => {
    const previous = preference;
    setPreference(next);
    setMutationError(null);

    try {
      const { data } = await savePreference({
        variables: {
          input: {
            layout: next.layout,
            physicsEnabled: next.physicsEnabled,
            options: next.options || {},
          },
        },
      });

      const saved = data?.saveGraphLayoutPreference;
      if (saved) {
        const normalized = normalizePreference(saved);
        setPreference(normalized);
        onPreferenceApplied?.(normalized);
      } else {
        onPreferenceApplied?.(next);
      }
    } catch (error) {
      setPreference(previous);
      setMutationError((error as Error).message);
    }
  };

  const showDemoNotice = !investigationId;
  const isSaving = savingPreference || preferenceLoading;

  return (
    <Box data-testid="graph-visualization-panel" display="flex" flexDirection="column" gap={3}>
      {(preferenceError || graphError || mutationError) && (
        <Alert severity="error" role="alert">
          {mutationError || preferenceError?.message || graphError?.message}
        </Alert>
      )}

      <Box display="flex" flexDirection={{ xs: 'column', xl: 'row' }} gap={3}>
        <Paper
          variant="outlined"
          sx={{ flex: 2, minHeight: 420, position: 'relative', overflow: 'hidden' }}
        >
          <Box px={3} py={2} display="flex" justifyContent="space-between" alignItems="center">
            <div>
              <Typography variant="h6">Graph visualization</Typography>
              <Typography variant="body2" color="text.secondary">
                {showDemoNotice
                  ? 'Showing demo data until an investigation is selected.'
                  : 'Layout updates immediately as you adjust preferences.'}
              </Typography>
            </div>
          </Box>
          <Box
            ref={graphContainerRef}
            data-testid="graph-visualization-canvas"
            sx={{
              position: 'relative',
              height: 360,
              mx: 3,
              mb: 3,
              border: '1px solid var(--hairline, #e0e0e0)',
              borderRadius: 2,
              overflow: 'hidden',
              backgroundColor: '#ffffff',
            }}
          />
          {graphLoading && (
            <Box
              position="absolute"
              top={0}
              left={0}
              right={0}
              bottom={0}
              display="flex"
              alignItems="center"
              justifyContent="center"
            >
              <CircularProgress size={32} aria-label="Loading graph" />
            </Box>
          )}
        </Paper>

        <Box flex={1} minWidth={280}>
          <GraphLayoutPreferencesForm
            preference={preference}
            onPreferenceChange={handlePreferenceChange}
            isSaving={isSaving}
          />
        </Box>
      </Box>
    </Box>
  );
};

export default GraphVisualizationPanel;

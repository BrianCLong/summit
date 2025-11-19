import React, { useState, useCallback } from 'react';
import {
  Paper,
  Typography,
  Box,
  TextField,
  Button,
  Chip,
  List,
  ListItemButton,
  ListItemText,
  LinearProgress,
  IconButton,
  Divider,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Alert,
  Tooltip,
} from '@mui/material';
import {
  Timeline,
  Cancel,
  Visibility,
  TrendingUp,
  FilterList,
  PlayArrow,
} from '@mui/icons-material';
import {
  useMockKShortestPathsLazyQuery,
  type MockKShortestPathsQuery,
} from '../../generated/graphql';

interface GraphNodeLite {
  id: string;
  label: string;
}

interface KShortestPath {
  id: string;
  length: number;
  score?: number;
  nodes: GraphNodeLite[];
  significance?: boolean;
}

interface PathMetadata {
  pathsFound: number;
  searchTime: number;
  nodesExplored: number;
  maxDepthReached: number;
}

interface KShortestPathsPanelProps {
  selectedNodes: string[];
  onPathSelect: (path: KShortestPath) => void;
  onPathHighlight: (path: KShortestPath) => void;
}

const MAX_K = 5;
const MAX_DEPTH = 6;

const createMockPaths = (
  nodes: Array<{ id: string; label: string }> = [],
  sourceId: string,
  targetId: string,
  kValue: number,
  maxDepthValue: number,
  pathType: string,
): KShortestPath[] => {
  const availableNodes =
    nodes.length > 0
      ? nodes
      : Array.from({ length: 10 }, (_, idx) => ({
          id: `node-${idx}`,
          label: `Node ${idx}`,
        }));

  const generatePath = (index: number): KShortestPath => {
    const hopCount = Math.min(
      maxDepthValue,
      Math.max(2, Math.floor(Math.random() * maxDepthValue) + 2),
    );
    const intermediates: GraphNodeLite[] = [];
    for (let i = 0; i < hopCount - 2; i++) {
      const randomNode =
        availableNodes[Math.floor(Math.random() * availableNodes.length)];
      intermediates.push({ id: randomNode.id, label: randomNode.label });
    }

    const pathNodes: GraphNodeLite[] = [
      { id: sourceId, label: sourceId },
      ...intermediates,
      { id: targetId, label: targetId },
    ];

    return {
      id: `mock-path-${Date.now()}-${index}`,
      nodes: pathNodes,
      length: pathNodes.length - 1,
      score: Math.random() * 10,
      significance: pathType !== 'all' ? Math.random() > 0.5 : undefined,
    };
  };

  return Array.from({ length: Math.min(kValue, MAX_K) }, (_, idx) =>
    generatePath(idx),
  );
};

export function KShortestPathsPanel({
  selectedNodes,
  onPathSelect,
  onPathHighlight,
}: KShortestPathsPanelProps) {
  const [sourceId, setSourceId] = useState('');
  const [targetId, setTargetId] = useState('');
  const [k, setK] = useState(3);
  const [maxDepth, setMaxDepth] = useState(4);
  const [pathType, setPathType] = useState('all');
  const [operationId, setOperationId] = useState<string | null>(null);
  const [paths, setPaths] = useState<KShortestPath[]>([]);
  const [metadata, setMetadata] = useState<PathMetadata | null>(null);
  const [localError, setLocalError] = useState<string | null>(null);

  const [findPaths, { loading, error }] = useMockKShortestPathsLazyQuery();

  const canSearch = sourceId && targetId && sourceId !== targetId;

  const handleSearch = useCallback(() => {
    if (!canSearch) return;

    const newOperationId = `path-${Date.now()}-${Math.random().toString(36).slice(2)}`;
    setOperationId(newOperationId);
    setLocalError(null);
    setPaths([]);
    setMetadata(null);

    findPaths({
      variables: {
        sourceId,
        targetId,
      },
    })
      .then((result) => {
        const graphData = result.data?.graphData;
        const generatedPaths = createMockPaths(
          graphData?.nodes ?? [],
          sourceId,
          targetId,
          k,
          maxDepth,
          pathType,
        );
        setPaths(generatedPaths);
        setMetadata({
          pathsFound: generatedPaths.length,
          searchTime: Math.floor(Math.random() * 200) + 50,
          nodesExplored: Math.min(
            graphData?.nodes.length ?? generatedPaths.length * 2,
            maxDepth * generatedPaths.length,
          ),
          maxDepthReached: Math.min(
            maxDepth,
            generatedPaths.reduce(
              (max, path) => Math.max(max, path.nodes.length - 1),
              0,
            ),
          ),
        });
      })
      .catch((err: unknown) => {
        setLocalError(
          err instanceof Error ? err.message : 'Failed to compute paths.',
        );
      });
  }, [canSearch, findPaths, maxDepth, pathType, sourceId, targetId, k]);

  const handleCancel = useCallback(() => {
    setOperationId(null);
  }, []);

  // Auto-fill from selected nodes
  const handleSelectFromGraph = useCallback(() => {
    if (selectedNodes.length >= 2) {
      setSourceId(selectedNodes[0]);
      setTargetId(selectedNodes[1]);
    }
  }, [selectedNodes]);

  return (
    <Paper elevation={1} sx={{ p: 2, maxHeight: 600, overflow: 'auto' }}>
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 2 }}>
        <Timeline color="primary" />
        <Typography variant="h6">Path Finding</Typography>

        {selectedNodes.length >= 2 && (
          <Tooltip title="Use selected nodes">
            <Button
              size="small"
              onClick={handleSelectFromGraph}
              startIcon={<FilterList />}
            >
              From Selection
            </Button>
          </Tooltip>
        )}
      </Box>

      {/* Search Form */}
      <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, mb: 2 }}>
        <Box sx={{ display: 'flex', gap: 2 }}>
          <TextField
            label="Source Node ID"
            value={sourceId}
            onChange={(e) => setSourceId(e.target.value)}
            size="small"
            fullWidth
            placeholder="node-123"
          />
          <TextField
            label="Target Node ID"
            value={targetId}
            onChange={(e) => setTargetId(e.target.value)}
            size="small"
            fullWidth
            placeholder="node-456"
          />
        </Box>

        <Box sx={{ display: 'flex', gap: 2 }}>
          <TextField
            label="Max Paths (k)"
            type="number"
            value={k}
            onChange={(e) =>
              setK(Math.min(MAX_K, Math.max(1, parseInt(e.target.value) || 1)))
            }
            size="small"
            inputProps={{ min: 1, max: MAX_K }}
          />

          <TextField
            label="Max Depth"
            type="number"
            value={maxDepth}
            onChange={(e) =>
              setMaxDepth(
                Math.min(MAX_DEPTH, Math.max(1, parseInt(e.target.value) || 1)),
              )
            }
            size="small"
            inputProps={{ min: 1, max: MAX_DEPTH }}
          />

          <FormControl size="small" sx={{ minWidth: 120 }}>
            <InputLabel>Path Type</InputLabel>
            <Select
              value={pathType}
              onChange={(e) => setPathType(e.target.value)}
              label="Path Type"
            >
              <MenuItem value="all">All Types</MenuItem>
              <MenuItem value="shortest">Shortest</MenuItem>
              <MenuItem value="strongest">Strongest</MenuItem>
              <MenuItem value="diverse">Diverse</MenuItem>
            </Select>
          </FormControl>
        </Box>

        <Box sx={{ display: 'flex', gap: 1 }}>
          {!loading ? (
            <Button
              variant="contained"
              startIcon={<PlayArrow />}
              onClick={handleSearch}
              disabled={!canSearch}
            >
              Find Paths
            </Button>
          ) : (
              <Button
                variant="outlined"
                color="secondary"
                startIcon={<Cancel />}
                onClick={handleCancel}
              >
                Cancel Search
              </Button>
          )}

          <Box sx={{ display: 'flex', gap: 0.5, alignItems: 'center' }}>
            <Chip size="small" label={`k≤${k}`} variant="outlined" />
            <Chip size="small" label={`depth≤${maxDepth}`} variant="outlined" />
          </Box>
        </Box>
      </Box>

      {/* Loading State */}
      {loading && (
        <Box sx={{ mb: 2 }}>
          <LinearProgress />
          <Typography variant="caption" color="text.secondary" sx={{ mt: 1 }}>
            Exploring graph paths... This may take a few seconds.
          </Typography>
        </Box>
      )}

      {/* Error State */}
      {(error || localError) && (
        <Alert severity="error" sx={{ mb: 2 }}>
          Path finding failed: {error?.message ?? localError}
        </Alert>
      )}

      {/* Results Metadata */}
      {metadata && (
        <Box sx={{ mb: 2, p: 1.5, bgcolor: 'grey.50', borderRadius: 1 }}>
          <Typography variant="caption" color="text.secondary">
            Found {metadata.pathsFound} path
            {metadata.pathsFound !== 1 ? 's' : ''} in {metadata.searchTime}ms •
            Explored {metadata.nodesExplored} nodes • Max depth reached:{' '}
            {metadata.maxDepthReached}
          </Typography>
        </Box>
      )}

      {/* Path Results */}
      {paths.length > 0 && (
        <Box>
          <Typography variant="subtitle2" sx={{ mb: 1 }}>
            Paths Found ({paths.length})
          </Typography>

          <List dense>
            {paths.map((path, index) => (
              <React.Fragment key={path.id}>
                <ListItemButton
                  component="li"
                  onClick={() => onPathSelect(path)}
                  onMouseEnter={() => onPathHighlight(path)}
                  sx={{ borderRadius: 1, mb: 0.5 }}
                >
                  <ListItemText
                    primary={
                      <Box
                        sx={{ display: 'flex', alignItems: 'center', gap: 1 }}
                      >
                        <Typography variant="subtitle2">
                          Path {index + 1}
                        </Typography>
                        <Chip
                          size="small"
                          label={`${path.length} hops`}
                          color="primary"
                          variant="outlined"
                        />
                        <Chip
                          size="small"
                          label={`Score: ${path.score?.toFixed(2) || 'N/A'}`}
                          color="secondary"
                          variant="outlined"
                        />
                        {path.significance && (
                          <Chip
                            size="small"
                            label="Significant"
                            color="warning"
                          />
                        )}
                      </Box>
                    }
                    secondary={
                      <Typography variant="caption" color="text.secondary">
                        {path.nodes.map((node) => node.label).join(' → ')}
                      </Typography>
                    }
                  />

                  <IconButton size="small" onClick={() => onPathSelect(path)}>
                    <Visibility fontSize="small" />
                  </IconButton>
                </ListItemButton>

                {index < paths.length - 1 && <Divider />}
              </React.Fragment>
            ))}
          </List>
        </Box>
      )}

      {paths.length === 0 &&
        !loading &&
        !error &&
        !localError &&
        sourceId &&
        targetId && (
        <Alert severity="info">
          No paths found between the selected nodes within the specified
          constraints. Try increasing the maximum depth or adjusting the path
          type filter.
        </Alert>
      )}
    </Paper>
  );
}

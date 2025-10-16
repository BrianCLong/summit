import React, { useState, useCallback } from 'react';
import {
  Paper,
  Typography,
  Box,
  TextField,
  Button,
  Chip,
  List,
  ListItem,
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
// Temporarily mock missing GraphQL hooks
const useKShortestPathsLazyQuery = () => [() => {}, { data: null, loading: false, error: null }];
const useCancelPathFindingMutation = () => [() => {}];

interface KShortestPathsPanelProps {
  selectedNodes: string[];
  onPathSelect: (path: any) => void;
  onPathHighlight: (path: any) => void;
}

const MAX_K = 5;
const MAX_DEPTH = 6;

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

  const [findPaths, { data, loading, error }] = useKShortestPathsLazyQuery();
  const [cancelPathFinding] = useCancelPathFindingMutation();

  const paths = data?.kShortestPaths?.paths || [];
  const metadata = data?.kShortestPaths?.metadata;

  const canSearch = sourceId && targetId && sourceId !== targetId;

  const handleSearch = useCallback(() => {
    if (!canSearch) return;

    const newOperationId = `path-${Date.now()}-${Math.random().toString(36).slice(2)}`;
    setOperationId(newOperationId);

    findPaths({
      variables: {
        sourceId,
        targetId,
        k,
        maxDepth,
        filters: {
          type: pathType === 'all' ? undefined : pathType,
        },
      },
    });
  }, [sourceId, targetId, k, maxDepth, pathType, canSearch, findPaths]);

  const handleCancel = useCallback(async () => {
    if (!operationId) return;

    try {
      await cancelPathFinding({
        variables: { operationId },
      });
      setOperationId(null);
    } catch (error) {
      console.error('Failed to cancel path finding:', error);
    }
  }, [operationId, cancelPathFinding]);

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
      {error && (
        <Alert severity="error" sx={{ mb: 2 }}>
          Path finding failed: {error.message}
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
                <ListItem
                  onClick={() => onPathSelect(path)}
                  onMouseEnter={() => onPathHighlight(path)}
                  sx={{ borderRadius: 1, mb: 0.5, cursor: 'pointer' }}
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
                </ListItem>

                {index < paths.length - 1 && <Divider />}
              </React.Fragment>
            ))}
          </List>
        </Box>
      )}

      {paths.length === 0 && !loading && !error && sourceId && targetId && (
        <Alert severity="info">
          No paths found between the selected nodes within the specified
          constraints. Try increasing the maximum depth or adjusting the path
          type filter.
        </Alert>
      )}
    </Paper>
  );
}

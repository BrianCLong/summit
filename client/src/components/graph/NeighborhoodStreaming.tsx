import React, { useState, useCallback, useEffect } from 'react';
import {
  Box,
  Paper,
  Typography,
  LinearProgress,
  Button,
  Chip,
  IconButton,
  Collapse,
  Alert,
} from '@mui/material';
import { PlayArrow, Stop, ExpandMore, NetworkCheck } from '@mui/icons-material';

type StreamNode = {
  id: string;
  type: string;
  confidence: number;
};

type StreamEdge = {
  id: string;
  source: string;
  target: string;
  type: string;
  weight: number;
};

interface NeighborhoodStreamingProps {
  nodeId: string;
  onNodesReceived: (nodes: StreamNode[], edges: StreamEdge[]) => void;
  maxDepth?: number;
  batchLimit?: number;
}

export function NeighborhoodStreaming({
  nodeId,
  onNodesReceived,
  maxDepth = 2,
  batchLimit = 50,
}: NeighborhoodStreamingProps) {
  const [isStreaming, setIsStreaming] = useState(false);
  const [streamStats, setStreamStats] = useState<{
    nodesReceived: number;
    edgesReceived: number;
    batchesProcessed: number;
  }>({ nodesReceived: 0, edgesReceived: 0, batchesProcessed: 0 });
  const [expanded, setExpanded] = useState(false);
  const [progress, setProgress] = useState<{
    processed: number;
    total: number;
    percentage: number;
    eta?: number;
  } | null>(null);

  useEffect(() => {
    if (!isStreaming) return;

    let processed = 0;
    const totalBatches = batchLimit * Math.max(maxDepth, 1);
    setProgress({
      processed,
      total: totalBatches,
      percentage: 0,
      eta: totalBatches,
    });

    const interval = setInterval(() => {
      const nodes: StreamNode[] = Array.from(
        { length: Math.max(1, Math.floor(Math.random() * batchLimit)) },
        (_, idx) => ({
          id: `${nodeId}-node-${Date.now()}-${idx}`,
          type: ['person', 'organization', 'ip', 'location'][
            Math.floor(Math.random() * 4)
          ],
          confidence: parseFloat((Math.random()).toFixed(2)),
        }),
      );
      const edges: StreamEdge[] = nodes.map((node) => ({
        id: `${node.id}-edge`,
        source: nodeId,
        target: node.id,
        type: 'association',
        weight: parseFloat(Math.random().toFixed(2)),
      }));

      onNodesReceived(nodes, edges);
      processed += nodes.length;
      setStreamStats((prev) => ({
        nodesReceived: prev.nodesReceived + nodes.length,
        edgesReceived: prev.edgesReceived + edges.length,
        batchesProcessed: prev.batchesProcessed + 1,
      }));
      setProgress({
        processed,
        total: totalBatches,
        percentage: Math.min((processed / totalBatches) * 100, 100),
        eta: Math.max(totalBatches - processed, 0),
      });

      if (processed >= totalBatches) {
        clearInterval(interval);
        setIsStreaming(false);
      }
    }, 2000);

    return () => clearInterval(interval);
  }, [batchLimit, isStreaming, maxDepth, nodeId, onNodesReceived]);

  const startStreaming = useCallback(() => {
    setIsStreaming(true);
    setStreamStats({ nodesReceived: 0, edgesReceived: 0, batchesProcessed: 0 });
    setProgress(null);
  }, []);

  const stopStreaming = useCallback(() => {
    setIsStreaming(false);
    setProgress(null);
  }, []);

  return (
    <Paper elevation={1} sx={{ p: 2 }}>
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
        <NetworkCheck color="primary" />
        <Typography variant="subtitle2">Neighborhood Streaming</Typography>

        <Box sx={{ ml: 'auto', display: 'flex', alignItems: 'center', gap: 1 }}>
          <Chip size="small" label={`Depth ${maxDepth}`} variant="outlined" />

          {!isStreaming ? (
            <Button
              size="small"
              startIcon={<PlayArrow />}
              onClick={startStreaming}
              variant="outlined"
            >
              Stream
            </Button>
          ) : (
            <Button
              size="small"
              startIcon={<Stop />}
              onClick={stopStreaming}
              color="secondary"
              variant="outlined"
            >
              Stop
            </Button>
          )}

          <IconButton
            size="small"
            onClick={() => setExpanded(!expanded)}
            sx={{
              transform: expanded ? 'rotate(180deg)' : 'rotate(0deg)',
              transition: 'transform 0.2s',
            }}
          >
            <ExpandMore />
          </IconButton>
        </Box>
      </Box>

      {isStreaming && progress && (
        <Box sx={{ mb: 2 }}>
          <LinearProgress
            variant="determinate"
            value={progress.percentage}
            sx={{ mb: 1 }}
          />
          <Typography variant="caption" color="text.secondary">
            {progress.processed} / {progress.total} processed (
            {progress.percentage.toFixed(1)}%)
            {progress.eta !== undefined &&
              ` • Remaining batches: ${progress.eta}`}
          </Typography>
        </Box>
      )}

      <Collapse in={expanded}>
        <Box sx={{ mt: 2 }}>
          {isStreaming && !progress && (
            <Alert severity="info" sx={{ mb: 2 }}>
              Initializing neighborhood stream...
            </Alert>
          )}

          <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap' }}>
            <Chip
              size="small"
              label={`${streamStats.nodesReceived} nodes`}
              color="primary"
            />
            <Chip
              size="small"
              label={`${streamStats.edgesReceived} edges`}
              color="secondary"
            />
            <Chip
              size="small"
              label={`${streamStats.batchesProcessed} batches`}
              variant="outlined"
            />
          </Box>

          <Typography
            variant="caption"
            color="text.secondary"
            sx={{ mt: 1, display: 'block' }}
          >
            Streaming neighbors in batches of {batchLimit} to maintain UI
            responsiveness
          </Typography>
        </Box>
      </Collapse>
    </Paper>
  );
}

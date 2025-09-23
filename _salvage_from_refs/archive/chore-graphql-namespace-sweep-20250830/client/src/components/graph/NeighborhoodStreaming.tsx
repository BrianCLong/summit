import React, { useState, useCallback } from 'react';
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
import { useStreamNeighborsSubscription } from '../../generated/graphql.js';

interface NeighborhoodStreamingProps {
  nodeId: string;
  onNodesReceived: (nodes: any[], edges: any[]) => void;
  maxDepth?: number;
  batchLimit?: number;
}

export function NeighborhoodStreaming({ 
  nodeId, 
  onNodesReceived, 
  maxDepth = 2,
  batchLimit = 50 
}: NeighborhoodStreamingProps) {
  const [isStreaming, setIsStreaming] = useState(false);
  const [streamStats, setStreamStats] = useState<{
    nodesReceived: number;
    edgesReceived: number;
    batchesProcessed: number;
  }>({ nodesReceived: 0, edgesReceived: 0, batchesProcessed: 0 });
  const [expanded, setExpanded] = useState(false);

  const { data, loading } = useStreamNeighborsSubscription({
    variables: { 
      nodeId, 
      depth: maxDepth, 
      limit: batchLimit 
    },
    skip: !isStreaming,
    onSubscriptionData: ({ subscriptionData }) => {
      const streamData = subscriptionData.data?.streamNeighbors;
      if (!streamData) return;

      const { batch, completed } = streamData;
      
      if (batch?.nodes && batch?.edges) {
        onNodesReceived(batch.nodes, batch.edges);
        
        setStreamStats(prev => ({
          nodesReceived: prev.nodesReceived + batch.nodes.length,
          edgesReceived: prev.edgesReceived + batch.edges.length,
          batchesProcessed: prev.batchesProcessed + 1,
        }));
      }

      if (completed) {
        setIsStreaming(false);
      }
    },
  });

  const startStreaming = useCallback(() => {
    setIsStreaming(true);
    setStreamStats({ nodesReceived: 0, edgesReceived: 0, batchesProcessed: 0 });
  }, []);

  const stopStreaming = useCallback(() => {
    setIsStreaming(false);
  }, []);

  const progress = data?.streamNeighbors?.progress;

  return (
    <Paper elevation={1} sx={{ p: 2 }}>
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
        <NetworkCheck color="primary" />
        <Typography variant="subtitle2">
          Neighborhood Streaming
        </Typography>
        
        <Box sx={{ ml: 'auto', display: 'flex', alignItems: 'center', gap: 1 }}>
          <Chip 
            size="small" 
            label={`Depth ${maxDepth}`} 
            variant="outlined" 
          />
          
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
              transition: 'transform 0.2s'
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
            {progress.processed} / {progress.total} processed 
            ({progress.percentage.toFixed(1)}%)
            {progress.eta && ` • ETA: ${Math.ceil(progress.eta / 1000)}s`}
          </Typography>
        </Box>
      )}

      <Collapse in={expanded}>
        <Box sx={{ mt: 2 }}>
          {loading && (
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

          <Typography variant="caption" color="text.secondary" sx={{ mt: 1, display: 'block' }}>
            Streaming neighbors in batches of {batchLimit} to maintain UI responsiveness
          </Typography>
        </Box>
      </Collapse>
    </Paper>
  );
}
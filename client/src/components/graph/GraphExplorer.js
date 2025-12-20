import React, { useRef, useEffect, useState } from 'react';
import {
  Box,
  Paper,
  Typography,
  IconButton,
  Tooltip,
  Fab,
  Button,
  Alert,
  Switch,
  FormControlLabel,
} from '@mui/material';
import {
  ZoomIn,
  ZoomOut,
  CenterFocusStrong,
  Add,
  Save,
  Refresh,
} from '@mui/icons-material';
import { useParams } from 'react-router-dom';
import { useSelector, useDispatch } from 'react-redux';
import { setGraphData, addNode, addEdge } from '../../store/slices/graphSlice';
import PresenceIndicator from '../collaboration/PresenceIndicator';
import { getSocket } from '../../services/socket';
import { useQuery, gql } from '@apollo/client';

// GraphQL Queries
const PREDICT_LINKS_QUERY = gql`
  query PredictLinks($entityIds: [ID!]!, $contextText: String) {
    predictLinks(entityIds: $entityIds, contextText: $contextText) {
      sourceId
      targetId
      predictedType
      confidence
      explanation
    }
  }
`;

const ANALYZE_SENTIMENT_QUERY = gql`
  query AnalyzeSentiment($text: String!) {
    analyzeSentiment(text: $text) {
      sentiment
      confidence
      keywords
    }
  }
`;

function GraphExplorer() {
  const { id } = useParams();
  const dispatch = useDispatch();
  const canvasRef = useRef(null);
  const { nodes, edges } = useSelector((state) => state.graph);
  const [loading, setLoading] = useState(false);
  const [socket, setSocket] = useState(null);
  const [showPredictedLinks, setShowPredictedLinks] = useState(false);
  const [showSentimentOverlay, setShowSentimentOverlay] = useState(false);

  // Fetch predicted links
  const { data: predictedLinksData } = useQuery(PREDICT_LINKS_QUERY, {
    variables: { entityIds: nodes.map((node) => node.id) },
    skip: !showPredictedLinks || nodes.length === 0,
    pollInterval: 60000, // Poll every minute for new predictions
  });
  const predictedLinks = predictedLinksData?.predictLinks || [];

  // Fetch sentiment for all node labels
  const { data: sentimentData } = useQuery(ANALYZE_SENTIMENT_QUERY, {
    variables: { text: nodes.map((node) => node.label).join('. ') }, // Concatenate all labels for a single sentiment analysis call
    skip: !showSentimentOverlay || nodes.length === 0,
    pollInterval: 300000, // Poll every 5 minutes for sentiment updates
  });
  const sentimentResult = sentimentData?.analyzeSentiment;

  const sampleNodes = [
    { id: '1', label: 'John Doe', type: 'PERSON', x: 100, y: 100 },
    { id: '2', label: 'Acme Corp', type: 'ORGANIZATION', x: 300, y: 150 },
    { id: '3', label: 'New York', type: 'LOCATION', x: 200, y: 250 },
    { id: '4', label: 'Document A', type: 'DOCUMENT', x: 400, y: 200 },
  ];

  const sampleEdges = [
    { id: 'e1', source: '1', target: '2', label: 'WORKS_FOR' },
    { id: 'e2', source: '1', target: '3', label: 'LOCATED_AT' },
    { id: 'e3', source: '2', target: '4', label: 'OWNS' },
  ];

  useEffect(() => {
    dispatch(setGraphData({ nodes: sampleNodes, edges: sampleEdges }));
  }, [dispatch]);

  // Initialize WebSocket connection (if token exists)
  useEffect(() => {
    const s = getSocket();
    if (s) setSocket(s);
    return () => {
      // Keep socket for app-wide reuse; no disconnect here
    };
  }, []);

  useEffect(() => {
    if (canvasRef.current && nodes.length > 0) {
      drawGraph();
    }
  }, [nodes, edges, predictedLinks, sentimentResult]); // Add predictedLinks and sentimentResult to dependencies

  const drawGraph = () => {
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');

    ctx.clearRect(0, 0, canvas.width, canvas.height);

    // Draw existing edges
    ctx.strokeStyle = '#999';
    ctx.lineWidth = 2;
    edges.forEach((edge) => {
      const sourceNode = nodes.find((n) => n.id === edge.source);
      const targetNode = nodes.find((n) => n.id === edge.target);

      if (sourceNode && targetNode) {
        ctx.beginPath();
        ctx.moveTo(sourceNode.x, sourceNode.y);
        ctx.lineTo(targetNode.x, targetNode.y);
        ctx.stroke();

        const midX = (sourceNode.x + targetNode.x) / 2;
        const midY = (sourceNode.y + targetNode.y) / 2;
        ctx.fillStyle = '#666';
        ctx.font = '12px Arial';
        ctx.textAlign = 'center';
        ctx.fillText(edge.label, midX, midY - 5);
      }
    });

    // Draw predicted links if enabled
    if (showPredictedLinks) {
      ctx.strokeStyle = '#FF00FF'; // Magenta for predicted links
      ctx.lineWidth = 1;
      ctx.setLineDash([5, 5]); // Dashed line
      predictedLinks.forEach((link) => {
        const sourceNode = nodes.find((n) => n.id === link.sourceId);
        const targetNode = nodes.find((n) => n.id === link.targetId);

        if (sourceNode && targetNode) {
          ctx.beginPath();
          ctx.moveTo(sourceNode.x, sourceNode.y);
          ctx.lineTo(targetNode.x, targetNode.y);
          ctx.stroke();

          const midX = (sourceNode.x + targetNode.x) / 2;
          const midY = (sourceNode.y + targetNode.y) / 2;
          ctx.fillStyle = '#FF00FF';
          ctx.font = '10px Arial';
          ctx.textAlign = 'center';
          ctx.fillText(
            `Predicted: ${link.predictedType} (${(link.confidence * 100).toFixed(0)}%)`,
            midX,
            midY + 15,
          );
        }
      });
      ctx.setLineDash([]); // Reset line dash
    }

    nodes.forEach((node) => {
      let color = getNodeColor(node.type);

      // Apply sentiment color if enabled
      if (showSentimentOverlay && sentimentResult) {
        const sentimentLabel = sentimentResult.sentiment; // Assuming sentimentResult.sentiment is 'POSITIVE', 'NEGATIVE', 'NEUTRAL'
        switch (sentimentLabel) {
          case 'POSITIVE':
            color = '#4CAF50'; // Green
            break;
          case 'NEGATIVE':
            color = '#F44336'; // Red
            break;
          case 'NEUTRAL':
            color = '#FFEB3B'; // Yellow
            break;
          default:
            break;
        }
      }

      ctx.beginPath();
      ctx.arc(node.x, node.y, 20, 0, 2 * Math.PI);
      ctx.fillStyle = color;
      ctx.fill();
      ctx.strokeStyle = '#fff';
      ctx.lineWidth = 3;
      ctx.stroke();

      ctx.fillStyle = '#333';
      ctx.font = '14px Arial';
      ctx.textAlign = 'center';
      ctx.fillText(node.label, node.x, node.y + 35);

      // Display sentiment score if enabled
      if (showSentimentOverlay && sentimentResult) {
        ctx.fillStyle = '#333';
        ctx.font = '10px Arial';
        ctx.textAlign = 'center';
        ctx.fillText(
          `Sentiment: ${sentimentResult.sentiment} (${(sentimentResult.confidence * 100).toFixed(0)}%)`,
          node.x,
          node.y + 50,
        );
      }
    });
  };

  const getNodeColor = (type) => {
    const colors = {
      PERSON: '#4caf50',
      ORGANIZATION: '#2196f3',
      LOCATION: '#ff9800',
      DOCUMENT: '#9c27b0',
    };
    return colors[type] || '#9e9e9e';
  };

  const handleAddNode = () => {
    const newNode = {
      id: `node_${Date.now()}`,
      label: `New Entity ${nodes.length + 1}`,
      type: 'PERSON',
      x: Math.random() * 400 + 100,
      y: Math.random() * 300 + 100,
    };
    dispatch(addNode(newNode));
  };

  const handleRefresh = () => {
    setLoading(true);
    setTimeout(() => {
      dispatch(setGraphData({ nodes: sampleNodes, edges: sampleEdges }));
      setLoading(false);
    }, 1000);
  };

  return (
    <Box sx={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
      <Box
        sx={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          mb: 2,
        }}
      >
        <Typography variant="h5" component="h1" fontWeight="bold">
          Graph Explorer {id && `- Investigation ${id}`}
        </Typography>
        <Box>
          <FormControlLabel
            control={
              <Switch
                checked={showPredictedLinks}
                onChange={(e) => setShowPredictedLinks(e.target.checked)}
                name="showPredictedLinks"
                color="primary"
              />
            }
            label="Show Predicted Links"
          />
          <FormControlLabel
            control={
              <Switch
                checked={showSentimentOverlay}
                onChange={(e) => setShowSentimentOverlay(e.target.checked)}
                name="showSentimentOverlay"
                color="primary"
              />
            }
            label="Show Sentiment Overlay"
          />
          <Button
            variant="outlined"
            startIcon={<Refresh />}
            onClick={handleRefresh}
            disabled={loading}
            sx={{ mr: 2 }}
          >
            Refresh
          </Button>
          <Button variant="contained" startIcon={<Save />}>
            Save
          </Button>
        </Box>
      </Box>

      <Alert severity="info" sx={{ mb: 2 }}>
        This is a basic graph visualization. Click "Add Node" to add entities,
        or use the zoom controls.
      </Alert>

      <Paper
        sx={{
          flexGrow: 1,
          position: 'relative',
          overflow: 'hidden',
          minHeight: 500,
        }}
        elevation={2}
      >
        <canvas
          ref={canvasRef}
          width={800}
          height={500}
          role="img"
          aria-label="Graph visualization"
          style={{
            width: '100%',
            height: '100%',
            background: '#fafafa',
          }}
        />
        {/* Presence / collaboration controls */}
        {socket && (
          <Box sx={{ position: 'absolute', top: 16, left: 16 }}>
            <PresenceIndicator socket={socket} investigationId={id} />
          </Box>
        )}

        <Box
          sx={{
            position: 'absolute',
            top: 16,
            right: 16,
            display: 'flex',
            flexDirection: 'column',
            gap: 1,
          }}
        >
          <Tooltip title="Zoom In">
            <IconButton size="small" sx={{ bgcolor: 'white' }}>
              <ZoomIn />
            </IconButton>
          </Tooltip>
          <Tooltip title="Zoom Out">
            <IconButton size="small" sx={{ bgcolor: 'white' }}>
              <ZoomOut />
            </IconButton>
          </Tooltip>
          <Tooltip title="Center Graph">
            <IconButton size="small" sx={{ bgcolor: 'white' }}>
              <CenterFocusStrong />
            </IconButton>
          </Tooltip>
        </Box>

        <Fab
          color="primary"
          sx={{ position: 'absolute', bottom: 16, right: 16 }}
          onClick={handleAddNode}
        >
          <Add />
        </Fab>
      </Paper>

      <Box sx={{ mt: 2, display: 'flex', gap: 4 }}>
        <Typography variant="body2" color="text.secondary">
          Nodes: {nodes.length}
        </Typography>
        <Typography variant="body2" color="text.secondary">
          Edges: {edges.length}
        </Typography>
        <Typography variant="body2" color="text.secondary">
          Status: {loading ? 'Loading...' : 'Ready'}
        </Typography>
      </Box>
    </Box>
  );
}

export default GraphExplorer;

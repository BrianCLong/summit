import React, { useRef, useEffect, useState } from 'react';
import { 
  Box, 
  Paper, 
  Typography, 
  IconButton, 
  Tooltip, 
  Fab,
  Button,
  Alert
} from '@mui/material';
import { 
  ZoomIn, 
  ZoomOut, 
  CenterFocusStrong, 
  Add,
  Save,
  Refresh
} from '@mui/icons-material';
import { useParams } from 'react-router-dom';
import { useSelector, useDispatch } from 'react-redux';
import { setGraphData, addNode, addEdge } from '../../store/slices/graphSlice';
import PresenceIndicator from '../collaboration/PresenceIndicator';
import { getSocket } from '../../services/socket';

function GraphExplorer() {
  const { id } = useParams();
  const dispatch = useDispatch();
  const canvasRef = useRef(null);
  const { nodes, edges } = useSelector(state => state.graph);
  const [loading, setLoading] = useState(false);
  const [socket, setSocket] = useState(null);

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
  }, [nodes, edges]);

  const drawGraph = () => {
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    
    ctx.strokeStyle = '#999';
    ctx.lineWidth = 2;
    edges.forEach(edge => {
      const sourceNode = nodes.find(n => n.id === edge.source);
      const targetNode = nodes.find(n => n.id === edge.target);
      
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
    
    nodes.forEach(node => {
      const color = getNodeColor(node.type);
      
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
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
        <Typography variant="h5" component="h1" fontWeight="bold">
          Graph Explorer {id && `- Investigation ${id}`}
        </Typography>
        <Box>
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
        This is a basic graph visualization. Click "Add Node" to add entities, or use the zoom controls.
      </Alert>

      <Paper 
        sx={{ 
          flexGrow: 1, 
          position: 'relative', 
          overflow: 'hidden',
          minHeight: 500
        }}
        elevation={2}
      >
        <canvas
          ref={canvasRef}
          width={800}
          height={500}
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
        
        <Box sx={{ 
          position: 'absolute', 
          top: 16, 
          right: 16, 
          display: 'flex', 
          flexDirection: 'column',
          gap: 1
        }}>
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

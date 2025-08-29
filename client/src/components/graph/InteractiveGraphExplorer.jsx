import React, { useRef, useEffect, useState } from 'react';
import {
  Box,
  Card,
  CardContent,
  Typography,
  Button,
  Fab,
  Drawer,
  List,
  ListItem,
  ListItemText,
  Chip,
  TextField,
  Select,
  MenuItem,
  FormControl,
  InputLabel,
  Accordion,
  AccordionSummary,
  AccordionDetails,
  IconButton,
  Tooltip,
  Alert,
  Grid,
} from '@mui/material';
import {
  Add as AddIcon,
  ExpandMore as ExpandMoreIcon,
  Settings as SettingsIcon,
  Refresh as RefreshIcon,
  ZoomIn as ZoomInIcon,
  ZoomOut as ZoomOutIcon,
  CenterFocusStrong as CenterIcon,
  AccountTree as TreeIcon,
  Timeline as TimelineIcon,
  Psychology as PsychologyIcon,
} from '@mui/icons-material';
import DynamicEntityClustering from './DynamicEntityClustering';

// Simulated graph data for demo
const sampleNodes = [
  { id: 'person1', label: 'John Smith', type: 'person', x: 100, y: 100, connections: 3 },
  { id: 'org1', label: 'TechCorp Inc', type: 'organization', x: 250, y: 150, connections: 5 },
  { id: 'location1', label: 'San Francisco', type: 'location', x: 400, y: 200, connections: 8 },
  { id: 'event1', label: 'Meeting Alpha', type: 'event', x: 200, y: 300, connections: 2 },
  { id: 'document1', label: 'Contract #47', type: 'document', x: 350, y: 250, connections: 4 },
  { id: 'person2', label: 'Sarah Johnson', type: 'person', x: 500, y: 100, connections: 6 },
];

const sampleEdges = [
  { from: 'person1', to: 'org1', type: 'works_at', strength: 0.8 },
  { from: 'person1', to: 'location1', type: 'lives_in', strength: 0.6 },
  { from: 'org1', to: 'location1', type: 'located_in', strength: 0.9 },
  { from: 'event1', to: 'person1', type: 'attended_by', strength: 0.7 },
  { from: 'event1', to: 'person2', type: 'attended_by', strength: 0.7 },
  { from: 'document1', to: 'org1', type: 'signed_by', strength: 0.9 },
];

// Node type configurations
const nodeTypeConfig = {
  person: { color: '#2196F3', icon: '👤', size: 40 },
  organization: { color: '#FF9800', icon: '🏢', size: 50 },
  location: { color: '#4CAF50', icon: '📍', size: 45 },
  event: { color: '#9C27B0', icon: '📅', size: 35 },
  document: { color: '#F44336', icon: '📄', size: 40 },
};

// Graph Canvas Component
function GraphCanvas({ nodes, edges, selectedNode, onNodeSelect, onNodeAdd }) {
  const canvasRef = useRef(null);
  const [zoom, setZoom] = useState(1);
  const [pan, setPan] = useState({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });

  useEffect(() => {
    drawGraph();
  }, [nodes, edges, selectedNode, zoom, pan]);

  const drawGraph = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    const rect = canvas.getBoundingClientRect();

    // Set canvas size
    canvas.width = rect.width * window.devicePixelRatio;
    canvas.height = rect.height * window.devicePixelRatio;
    ctx.scale(window.devicePixelRatio, window.devicePixelRatio);
    canvas.style.width = rect.width + 'px';
    canvas.style.height = rect.height + 'px';

    // Clear canvas
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    // Apply zoom and pan
    ctx.save();
    ctx.translate(pan.x, pan.y);
    ctx.scale(zoom, zoom);

    // Draw edges
    edges.forEach((edge) => {
      const fromNode = nodes.find((n) => n.id === edge.from);
      const toNode = nodes.find((n) => n.id === edge.to);

      if (fromNode && toNode) {
        ctx.beginPath();
        ctx.moveTo(fromNode.x, fromNode.y);
        ctx.lineTo(toNode.x, toNode.y);
        ctx.strokeStyle = `rgba(100, 100, 100, ${edge.strength})`;
        ctx.lineWidth = 2 * edge.strength;
        ctx.stroke();

        // Draw edge label
        const midX = (fromNode.x + toNode.x) / 2;
        const midY = (fromNode.y + toNode.y) / 2;
        ctx.fillStyle = '#666';
        ctx.font = '12px Arial';
        ctx.textAlign = 'center';
        ctx.fillText(edge.type, midX, midY - 5);
      }
    });

    // Draw nodes
    nodes.forEach((node) => {
      const config = nodeTypeConfig[node.type];
      const isSelected = selectedNode?.id === node.id;

      // Node circle
      ctx.beginPath();
      ctx.arc(node.x, node.y, config.size / 2, 0, 2 * Math.PI);
      ctx.fillStyle = isSelected ? '#FFD700' : config.color;
      ctx.fill();
      ctx.strokeStyle = isSelected ? '#FFA000' : '#fff';
      ctx.lineWidth = isSelected ? 3 : 2;
      ctx.stroke();

      // Node icon/emoji
      ctx.font = `${config.size / 2}px Arial`;
      ctx.textAlign = 'center';
      ctx.fillStyle = '#fff';
      ctx.fillText(config.icon, node.x, node.y + 5);

      // Node label
      ctx.font = '14px Arial';
      ctx.fillStyle = '#333';
      ctx.fillText(node.label, node.x, node.y + config.size / 2 + 20);

      // Connection count badge
      ctx.beginPath();
      ctx.arc(node.x + config.size / 3, node.y - config.size / 3, 8, 0, 2 * Math.PI);
      ctx.fillStyle = '#E91E63';
      ctx.fill();
      ctx.font = '10px Arial';
      ctx.fillStyle = '#fff';
      ctx.fillText(
        node.connections.toString(),
        node.x + config.size / 3,
        node.y - config.size / 3 + 3,
      );
    });

    ctx.restore();
  };

  const handleMouseDown = (e) => {
    const rect = canvasRef.current.getBoundingClientRect();
    const x = (e.clientX - rect.left - pan.x) / zoom;
    const y = (e.clientY - rect.top - pan.y) / zoom;

    // Check if clicking on a node
    const clickedNode = nodes.find((node) => {
      const config = nodeTypeConfig[node.type];
      const distance = Math.sqrt((x - node.x) ** 2 + (y - node.y) ** 2);
      return distance < config.size / 2;
    });

    if (clickedNode) {
      onNodeSelect(clickedNode);
    } else {
      setIsDragging(true);
      setDragStart({ x: e.clientX - pan.x, y: e.clientY - pan.y });
    }
  };

  const handleMouseMove = (e) => {
    if (isDragging) {
      setPan({
        x: e.clientX - dragStart.x,
        y: e.clientY - dragStart.y,
      });
    }
  };

  const handleMouseUp = () => {
    setIsDragging(false);
  };

  const handleWheel = (e) => {
    e.preventDefault();
    const delta = e.deltaY > 0 ? 0.9 : 1.1;
    setZoom((prev) => Math.max(0.1, Math.min(3, prev * delta)));
  };

  return (
    <Box
      sx={{
        position: 'relative',
        width: '100%',
        height: '500px',
        border: '2px solid #e0e0e0',
        borderRadius: 2,
        overflow: 'hidden',
        cursor: isDragging ? 'grabbing' : 'grab',
      }}
    >
      <canvas
        ref={canvasRef}
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onWheel={handleWheel}
        style={{
          width: '100%',
          height: '100%',
          display: 'block',
        }}
      />

      {/* Zoom Controls */}
      <Box
        sx={{
          position: 'absolute',
          top: 10,
          right: 10,
          display: 'flex',
          flexDirection: 'column',
          gap: 1,
        }}
      >
        <Tooltip title="Zoom In">
          <IconButton
            size="small"
            sx={{ bgcolor: 'rgba(255,255,255,0.9)' }}
            onClick={() => setZoom((prev) => Math.min(3, prev * 1.2))}
          >
            <ZoomInIcon />
          </IconButton>
        </Tooltip>
        <Tooltip title="Zoom Out">
          <IconButton
            size="small"
            sx={{ bgcolor: 'rgba(255,255,255,0.9)' }}
            onClick={() => setZoom((prev) => Math.max(0.1, prev * 0.8))}
          >
            <ZoomOutIcon />
          </IconButton>
        </Tooltip>
        <Tooltip title="Center View">
          <IconButton
            size="small"
            sx={{ bgcolor: 'rgba(255,255,255,0.9)' }}
            onClick={() => {
              setZoom(1);
              setPan({ x: 0, y: 0 });
            }}
          >
            <CenterIcon />
          </IconButton>
        </Tooltip>
      </Box>

      {/* Graph Stats */}
      <Box
        sx={{
          position: 'absolute',
          bottom: 10,
          left: 10,
          bgcolor: 'rgba(255,255,255,0.9)',
          p: 1,
          borderRadius: 1,
        }}
      >
        <Typography variant="caption">
          Nodes: {nodes.length} | Edges: {edges.length} | Zoom: {(zoom * 100).toFixed(0)}%
        </Typography>
      </Box>
    </Box>
  );
}

// Node Details Panel
function NodeDetailsPanel({ node, onClose }) {
  if (!node) return null;

  const config = nodeTypeConfig[node.type];

  return (
    <Drawer anchor="right" open={!!node} onClose={onClose}>
      <Box sx={{ width: 350, p: 3 }}>
        <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
          <Box
            sx={{
              width: 40,
              height: 40,
              borderRadius: '50%',
              bgcolor: config.color,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              mr: 2,
              fontSize: '20px',
            }}
          >
            {config.icon}
          </Box>
          <Box>
            <Typography variant="h6">{node.label}</Typography>
            <Chip label={node.type} size="small" color="primary" />
          </Box>
        </Box>

        <Card sx={{ mb: 2 }}>
          <CardContent>
            <Typography variant="subtitle2" gutterBottom>
              Entity Information
            </Typography>
            <Typography variant="body2">
              <strong>ID:</strong> {node.id}
            </Typography>
            <Typography variant="body2">
              <strong>Type:</strong> {node.type}
            </Typography>
            <Typography variant="body2">
              <strong>Connections:</strong> {node.connections}
            </Typography>
          </CardContent>
        </Card>

        <Card sx={{ mb: 2 }}>
          <CardContent>
            <Typography variant="subtitle2" gutterBottom>
              AI Insights
            </Typography>
            <Alert severity="info" sx={{ mb: 1 }}>
              🤖 This entity appears in {Math.floor(Math.random() * 5) + 1} investigation(s)
            </Alert>
            <Typography variant="body2">
              • Risk Score: {(Math.random() * 100).toFixed(0)}%<br />• Last Activity:{' '}
              {Math.floor(Math.random() * 30)} days ago
              <br />• Relationship Strength: High
            </Typography>
          </CardContent>
        </Card>

        <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap' }}>
          <Button variant="outlined" size="small" startIcon={<PsychologyIcon />}>
            AI Analysis
          </Button>
          <Button variant="outlined" size="small" startIcon={<TreeIcon />}>
            Expand Graph
          </Button>
          <Button variant="outlined" size="small" startIcon={<TimelineIcon />}>
            Timeline
          </Button>
        </Box>
      </Box>
    </Drawer>
  );
}

// Main Graph Explorer Component
export default function InteractiveGraphExplorer() {
  const [nodes, setNodes] = useState(sampleNodes);
  const [edges, setEdges] = useState(sampleEdges);
  const [selectedNode, setSelectedNode] = useState(null);
  const [controlsOpen, setControlsOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterType, setFilterType] = useState('all');

  const handleAddNode = () => {
    const newNode = {
      id: `node_${Date.now()}`,
      label: `New Entity ${nodes.length + 1}`,
      type: 'person',
      x: Math.random() * 400 + 100,
      y: Math.random() * 300 + 100,
      connections: 0,
    };
    setNodes([...nodes, newNode]);
  };

  const filteredNodes = nodes.filter((node) => {
    const matchesSearch = node.label.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesType = filterType === 'all' || node.type === filterType;
    return matchesSearch && matchesType;
  });

  return (
    <Box sx={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
      {/* Header */}
      <Card sx={{ mb: 2 }}>
        <CardContent>
          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <Box>
              <Typography variant="h4" gutterBottom>
                🕸️ Interactive Graph Explorer
              </Typography>
              <Typography variant="body1" color="text.secondary">
                Visualize and analyze complex relationships in your intelligence data
              </Typography>
            </Box>
            <Box sx={{ display: 'flex', gap: 1 }}>
              <Button
                variant="outlined"
                startIcon={<SettingsIcon />}
                onClick={() => setControlsOpen(!controlsOpen)}
              >
                Controls
              </Button>
              <Button
                variant="outlined"
                startIcon={<RefreshIcon />}
                onClick={() => {
                  setNodes(sampleNodes);
                  setEdges(sampleEdges);
                }}
              >
                Reset
              </Button>
            </Box>
          </Box>
        </CardContent>
      </Card>

      {/* Controls Panel */}
      {controlsOpen && (
        <Card sx={{ mb: 2 }}>
          <CardContent>
            <Accordion>
              <AccordionSummary expandIcon={<ExpandMoreIcon />}>
                <Typography>Search & Filter</Typography>
              </AccordionSummary>
              <AccordionDetails>
                <Box sx={{ display: 'flex', gap: 2, flexWrap: 'wrap' }}>
                  <TextField
                    label="Search entities"
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    size="small"
                    sx={{ minWidth: 200 }}
                  />
                  <FormControl size="small" sx={{ minWidth: 150 }}>
                    <InputLabel>Filter by type</InputLabel>
                    <Select
                      value={filterType}
                      label="Filter by type"
                      onChange={(e) => setFilterType(e.target.value)}
                    >
                      <MenuItem value="all">All Types</MenuItem>
                      <MenuItem value="person">Person</MenuItem>
                      <MenuItem value="organization">Organization</MenuItem>
                      <MenuItem value="location">Location</MenuItem>
                      <MenuItem value="event">Event</MenuItem>
                      <MenuItem value="document">Document</MenuItem>
                    </Select>
                  </FormControl>
                </Box>
              </AccordionDetails>
            </Accordion>
          </CardContent>
        </Card>
      )}

      {/* Main Content Grid */}
      <Grid container spacing={2} sx={{ flexGrow: 1 }}>
        {/* Graph Visualization */}
        <Grid item xs={12} lg={8}>
          <Card sx={{ height: '100%' }}>
            <CardContent sx={{ height: '100%', p: 1 }}>
              <GraphCanvas
                nodes={filteredNodes}
                edges={edges}
                selectedNode={selectedNode}
                onNodeSelect={setSelectedNode}
                onNodeAdd={handleAddNode}
              />
            </CardContent>
          </Card>
        </Grid>

        {/* Dynamic Entity Clustering Panel */}
        <Grid item xs={12} lg={4}>
          <DynamicEntityClustering
            nodes={filteredNodes}
            edges={edges}
            onClusterSelect={(cluster) => {
              console.log('🧩 Cluster selected:', cluster);
              // TODO: Highlight cluster nodes in graph
            }}
          />
        </Grid>
      </Grid>

      {/* Add Node FAB */}
      <Fab
        color="primary"
        aria-label="add node"
        onClick={handleAddNode}
        sx={{ position: 'fixed', bottom: 16, right: 16 }}
      >
        <AddIcon />
      </Fab>

      {/* Node Details Panel */}
      <NodeDetailsPanel node={selectedNode} onClose={() => setSelectedNode(null)} />
    </Box>
  );
}

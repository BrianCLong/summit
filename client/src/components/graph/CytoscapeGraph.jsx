import React, { useRef, useEffect, useState, useCallback } from 'react';
import { 
  Box, 
  Paper, 
  Typography, 
  IconButton, 
  Tooltip, 
  Fab,
  Button,
  Alert,
  Menu,
  MenuItem,
  Chip,
  Drawer,
  List,
  ListItem,
  ListItemText,
  FormControl,
  InputLabel,
  Select,
  Slider,
  Snackbar,
  CircularProgress,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField
} from '@mui/material';
import { 
  ZoomIn, 
  ZoomOut, 
  CenterFocusStrong, 
  Add,
  Save,
  Refresh,
  Settings,
  FilterList,
  Timeline,
  AccountTree,
  Psychology,
  AutoGraph,
  GroupWork,
  PlayArrow,
  Stop,
  Download
} from '@mui/icons-material';
import { useParams } from 'react-router-dom';
import { useSelector, useDispatch } from 'react-redux';
import { setGraphData, addNode, addEdge, setSelectedNode, setSelectedEdge } from '../../store/slices/graphSlice';
import { useSocket } from '../../hooks/useSocket';
import { useAIOperations } from '../../ai/insightsHooks';
import { useApolloClient } from '@apollo/client';
import cytoscape from 'cytoscape';
import cola from 'cytoscape-cola';
import dagre from 'cytoscape-dagre';
import fcose from 'cytoscape-fcose';
import coseBilkent from 'cytoscape-cose-bilkent';
import popper from 'cytoscape-popper';

// Register extensions
cytoscape.use(cola);
cytoscape.use(dagre);
cytoscape.use(fcose);
cytoscape.use(coseBilkent);
cytoscape.use(popper);

function CytoscapeGraph() {
  const { id } = useParams();
  const dispatch = useDispatch();
  const apollo = useApolloClient();
  const cyRef = useRef(null);
  const containerRef = useRef(null);
  const [cy, setCy] = useState(null);
  const { nodes, edges, selectedNode, selectedEdge } = useSelector(state => state.graph);
  const [loading, setLoading] = useState(false);
  const [layoutMenuAnchor, setLayoutMenuAnchor] = useState(null);
  const [currentLayout, setCurrentLayout] = useState('fcose');
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [aiMenuAnchor, setAiMenuAnchor] = useState(null);
  const [realTimeEnabled, setRealTimeEnabled] = useState(false);
  const [notification, setNotification] = useState(null);
  const [aiJobDialog, setAiJobDialog] = useState({ open: false, type: '', loading: false });
  const [filterSettings, setFilterSettings] = useState({
    nodeTypes: [],
    relationshipTypes: [],
    timeRange: [0, 100]
  });

  // WebSocket connection for real-time updates
  const socket = useSocket('ws://localhost:4000');
  
  // AI operations hook
  const aiOps = useAIOperations();

  // Advanced styling configuration
  const cytoscapeStyle = [
    {
      selector: 'node',
      style: {
        'background-color': (ele) => getNodeColor(ele.data('type')),
        'label': 'data(label)',
        'color': '#333',
        'font-size': '12px',
        'font-weight': 'bold',
        'text-halign': 'center',
        'text-valign': 'center',
        'border-width': 2,
        'border-color': '#fff',
        'width': (ele) => Math.max(30, ele.data('importance') * 10 || 30),
        'height': (ele) => Math.max(30, ele.data('importance') * 10 || 30),
        'overlay-opacity': 0,
        'transition-property': 'background-color, border-color, width, height',
        'transition-duration': '0.3s'
      }
    },
    {
      selector: 'node:selected',
      style: {
        'border-color': '#FF6B35',
        'border-width': 4,
        'background-color': '#FFE5DB'
      }
    },
    {
      selector: 'node:hover',
      style: {
        'border-color': '#4CAF50',
        'border-width': 3
      }
    },
    {
      selector: 'edge',
      style: {
        'width': (ele) => Math.max(2, ele.data('weight') * 5 || 2),
        'line-color': (ele) => getEdgeColor(ele.data('type')),
        'target-arrow-color': (ele) => getEdgeColor(ele.data('type')),
        'target-arrow-shape': 'triangle',
        'curve-style': 'bezier',
        'label': 'data(label)',
        'font-size': '10px',
        'text-rotation': 'autorotate',
        'text-margin-y': -10,
        'edge-text-rotation': 'autorotate',
        'overlay-opacity': 0,
        'transition-property': 'line-color, width',
        'transition-duration': '0.3s'
      }
    },
    {
      selector: 'edge:selected',
      style: {
        'line-color': '#FF6B35',
        'target-arrow-color': '#FF6B35',
        'width': 6
      }
    },
    {
      selector: 'edge:hover',
      style: {
        'line-color': '#4CAF50',
        'target-arrow-color': '#4CAF50'
      }
    },
    {
      selector: '.highlighted',
      style: {
        'background-color': '#FFD700',
        'line-color': '#FFD700',
        'target-arrow-color': '#FFD700',
        'transition-property': 'background-color, line-color, target-arrow-color',
        'transition-duration': '0.3s'
      }
    },
    {
      selector: '.dimmed',
      style: {
        'opacity': 0.3
      }
    }
  ];

  // Layout configurations
  const layoutConfigs = {
    fcose: {
      name: 'fcose',
      quality: "default",
      randomize: false,
      animate: true,
      animationDuration: 1000,
      fit: true,
      padding: 30,
      nodeDimensionsIncludeLabels: true,
      uniformNodeDimensions: false,
      packComponents: true,
      nodeRepulsion: 4500,
      idealEdgeLength: 50,
      edgeElasticity: 0.45,
      nestingFactor: 0.1
    },
    cola: {
      name: 'cola',
      animate: true,
      animationDuration: 1000,
      refresh: 1,
      maxSimulationTime: 4000,
      ungrabifyWhileSimulating: false,
      fit: true,
      padding: 30,
      nodeDimensionsIncludeLabels: true,
      randomize: false,
      avoidOverlap: true,
      handleDisconnected: true,
      convergenceThreshold: 0.01,
      nodeSpacing: 10
    },
    dagre: {
      name: 'dagre',
      rankDir: 'TB',
      animate: true,
      animationDuration: 1000,
      fit: true,
      padding: 30,
      spacingFactor: 1.25,
      nodeDimensionsIncludeLabels: true,
      ranker: 'network-simplex'
    },
    'cose-bilkent': {
      name: 'cose-bilkent',
      animate: true,
      animationDuration: 1000,
      refresh: 30,
      fit: true,
      padding: 30,
      nodeDimensionsIncludeLabels: true,
      randomize: false,
      nodeRepulsion: 4500,
      idealEdgeLength: 50,
      edgeElasticity: 0.45,
      nestingFactor: 0.1,
      gravity: 0.25,
      numIter: 2500,
      tile: true,
      tilingPaddingVertical: 10,
      tilingPaddingHorizontal: 10
    },
    circle: {
      name: 'circle',
      animate: true,
      animationDuration: 1000,
      fit: true,
      padding: 30,
      radius: 200,
      startAngle: -Math.PI / 2,
      sweep: 2 * Math.PI,
      clockwise: true,
      sort: undefined
    },
    grid: {
      name: 'grid',
      animate: true,
      animationDuration: 1000,
      fit: true,
      padding: 30,
      avoidOverlap: true,
      avoidOverlapPadding: 10,
      nodeDimensionsIncludeLabels: true,
      spacingFactor: 1.25,
      condense: false,
      rows: undefined,
      cols: undefined
    }
  };

  const sampleNodes = [
    { 
      data: { 
        id: '1', 
        label: 'John Doe', 
        type: 'PERSON', 
        importance: 3,
        properties: { age: 35, occupation: 'Engineer' }
      } 
    },
    { 
      data: { 
        id: '2', 
        label: 'Acme Corp', 
        type: 'ORGANIZATION', 
        importance: 4,
        properties: { industry: 'Technology', employees: 1000 }
      } 
    },
    { 
      data: { 
        id: '3', 
        label: 'New York', 
        type: 'LOCATION', 
        importance: 2,
        properties: { country: 'USA', population: 8000000 }
      } 
    },
    { 
      data: { 
        id: '4', 
        label: 'Document A', 
        type: 'DOCUMENT', 
        importance: 1,
        properties: { classification: 'Confidential', pages: 50 }
      } 
    },
  ];

  const sampleEdges = [
    { 
      data: { 
        id: 'e1', 
        source: '1', 
        target: '2', 
        label: 'WORKS_FOR', 
        type: 'EMPLOYMENT',
        weight: 0.8,
        properties: { since: '2020-01-01', role: 'Senior Engineer' }
      } 
    },
    { 
      data: { 
        id: 'e2', 
        source: '1', 
        target: '3', 
        label: 'LOCATED_AT', 
        type: 'LOCATION',
        weight: 0.6,
        properties: { address: '123 Main St' }
      } 
    },
    { 
      data: { 
        id: 'e3', 
        source: '2', 
        target: '4', 
        label: 'OWNS', 
        type: 'OWNERSHIP',
        weight: 0.9,
        properties: { acquired: '2019-05-15' }
      } 
    },
  ];

  useEffect(() => {
    dispatch(setGraphData({ nodes: sampleNodes, edges: sampleEdges }));
  }, [dispatch]);

  useEffect(() => {
    if (containerRef.current && !cy) {
      const cytoscapeInstance = cytoscape({
        container: containerRef.current,
        elements: [],
        style: cytoscapeStyle,
        layout: layoutConfigs[currentLayout],
        minZoom: 0.1,
        maxZoom: 10,
        wheelSensitivity: 0.1,
        boxSelectionEnabled: true,
        selectionType: 'single'
      });

      // Event handlers
      cytoscapeInstance.on('tap', 'node', (evt) => {
        const node = evt.target;
        dispatch(setSelectedNode(node.data()));
        highlightConnectedElements(node);
      });

      cytoscapeInstance.on('tap', 'edge', (evt) => {
        const edge = evt.target;
        dispatch(setSelectedEdge(edge.data()));
        highlightEdge(edge);
      });

      cytoscapeInstance.on('tap', (evt) => {
        if (evt.target === cytoscapeInstance) {
          dispatch(setSelectedNode(null));
          dispatch(setSelectedEdge(null));
          clearHighlights();
        }
      });

      // Context menu setup
      cytoscapeInstance.on('cxttap', 'node', (evt) => {
        const node = evt.target;
        showContextMenu(evt, node);
      });

      setCy(cytoscapeInstance);
      cyRef.current = cytoscapeInstance;
    }

    return () => {
      if (cyRef.current) {
        cyRef.current.destroy();
        cyRef.current = null;
        setCy(null);
      }
    };
  }, []);

  useEffect(() => {
    if (cy && (nodes.length > 0 || edges.length > 0)) {
      const elements = [
        ...nodes.map(node => ({ data: node.data || node })),
        ...edges.map(edge => ({ data: edge.data || edge }))
      ];

      cy.elements().remove();
      cy.add(elements);
      cy.layout(layoutConfigs[currentLayout]).run();
    }
  }, [cy, nodes, edges, currentLayout]);

  const getNodeColor = (type) => {
    const colors = {
      PERSON: '#4caf50',
      ORGANIZATION: '#2196f3',
      LOCATION: '#ff9800',
      DOCUMENT: '#9c27b0',
      EVENT: '#f44336',
      ASSET: '#795548',
      COMMUNICATION: '#607d8b'
    };
    return colors[type] || '#9e9e9e';
  };

  const getEdgeColor = (type) => {
    const colors = {
      EMPLOYMENT: '#4caf50',
      LOCATION: '#ff9800',
      OWNERSHIP: '#2196f3',
      COMMUNICATION: '#607d8b',
      FINANCIAL: '#795548',
      FAMILY: '#e91e63',
      ASSOCIATION: '#9c27b0'
    };
    return colors[type] || '#666';
  };

  const highlightConnectedElements = useCallback((node) => {
    if (!cy) return;
    
    cy.elements().removeClass('highlighted dimmed');
    
    const connectedEdges = node.connectedEdges();
    const connectedNodes = connectedEdges.connectedNodes();
    
    node.addClass('highlighted');
    connectedEdges.addClass('highlighted');
    connectedNodes.addClass('highlighted');
    
    cy.elements().difference(node.union(connectedEdges).union(connectedNodes)).addClass('dimmed');
  }, [cy]);

  const highlightEdge = useCallback((edge) => {
    if (!cy) return;
    
    cy.elements().removeClass('highlighted dimmed');
    
    const connectedNodes = edge.connectedNodes();
    
    edge.addClass('highlighted');
    connectedNodes.addClass('highlighted');
    
    cy.elements().difference(edge.union(connectedNodes)).addClass('dimmed');
  }, [cy]);

  const clearHighlights = useCallback(() => {
    if (!cy) return;
    cy.elements().removeClass('highlighted dimmed');
  }, [cy]);

  const applyLayout = (layoutName) => {
    if (cy) {
      setCurrentLayout(layoutName);
      cy.layout(layoutConfigs[layoutName]).run();
    }
    setLayoutMenuAnchor(null);
  };

  const handleZoomIn = () => {
    if (cy) cy.zoom(cy.zoom() * 1.2);
  };

  const handleZoomOut = () => {
    if (cy) cy.zoom(cy.zoom() / 1.2);
  };

  const handleCenter = () => {
    if (cy) cy.fit();
  };

  const handleAddNode = () => {
    const newNode = {
      data: {
        id: `node_${Date.now()}`,
        label: `New Entity ${nodes.length + 1}`,
        type: 'PERSON',
        importance: Math.random() * 5,
        properties: {}
      }
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

  const showContextMenu = (evt, element) => {
    // Placeholder for context menu functionality
    console.log('Context menu for:', element.data());
  };

  // WebSocket event handlers
  useEffect(() => {
    if (socket && realTimeEnabled) {
      socket.on('graph:node:added', (nodeData) => {
        dispatch(addNode(nodeData));
        setNotification({ message: 'New node added to graph', severity: 'info' });
      });

      socket.on('graph:edge:added', (edgeData) => {
        dispatch(addEdge(edgeData));
        setNotification({ message: 'New relationship added', severity: 'info' });
      });

      socket.on('graph:node:updated', (nodeData) => {
        // Update existing node
        if (cy) {
          const node = cy.getElementById(nodeData.id);
          if (node.length) {
            node.data(nodeData);
            setNotification({ message: 'Node updated', severity: 'info' });
          }
        }
      });

      socket.on('ai:insight:created', (insight) => {
        setNotification({ 
          message: `New AI insight: ${insight.kind}`, 
          severity: 'success' 
        });
      });

      return () => {
        socket.off('graph:node:added');
        socket.off('graph:edge:added');
        socket.off('graph:node:updated');
        socket.off('ai:insight:created');
      };
    }
  }, [socket, realTimeEnabled, cy, dispatch]);

  // AI Operations
  const handleAILinkPrediction = async () => {
    setAiJobDialog({ open: true, type: 'link_prediction', loading: true });
    try {
      const result = await aiOps.predictLinks(apollo, id || 'current', 50);
      setNotification({ 
        message: `Link prediction job queued: ${result.data.aiLinkPredict.id}`, 
        severity: 'success' 
      });
    } catch (error) {
      setNotification({ message: 'Failed to start link prediction', severity: 'error' });
    } finally {
      setAiJobDialog({ open: false, type: '', loading: false });
    }
  };

  const handleAICommunityDetection = async () => {
    setAiJobDialog({ open: true, type: 'community_detection', loading: true });
    try {
      const result = await aiOps.detectCommunities(apollo, id || 'current');
      setNotification({ 
        message: `Community detection job queued: ${result.data.aiCommunityDetect.id}`, 
        severity: 'success' 
      });
    } catch (error) {
      setNotification({ message: 'Failed to start community detection', severity: 'error' });
    } finally {
      setAiJobDialog({ open: false, type: '', loading: false });
    }
  };

  const handleAIEntityExtraction = async () => {
    if (selectedNode && selectedNode.text) {
      setAiJobDialog({ open: true, type: 'entity_extraction', loading: true });
      try {
        const docs = [{ id: selectedNode.id, text: selectedNode.text }];
        const result = await aiOps.extractEntities(apollo, docs);
        setNotification({ 
          message: `Entity extraction job queued: ${result.data.aiExtractEntities.id}`, 
          severity: 'success' 
        });
      } catch (error) {
        setNotification({ message: 'Failed to start entity extraction', severity: 'error' });
      } finally {
        setAiJobDialog({ open: false, type: '', loading: false });
      }
    }
  };

  const handleExport = () => {
    if (cy) {
      const png = cy.png({ scale: 2, full: true });
      const link = document.createElement('a');
      link.download = `graph-${Date.now()}.png`;
      link.href = png;
      link.click();
    }
  };

  const handleExportData = (format) => {
    const data = {
      nodes: nodes.map(n => n.data || n),
      edges: edges.map(e => e.data || e),
      meta: {
        layout: currentLayout,
        exportedAt: new Date().toISOString(),
        investigationId: id
      }
    };

    let content, filename, type;
    
    switch (format) {
      case 'json':
        content = JSON.stringify(data, null, 2);
        filename = `graph-export-${Date.now()}.json`;
        type = 'application/json';
        break;
      case 'csv':
        // Convert to CSV format
        const csvNodes = nodes.map(n => `"${n.data?.id || n.id}","${n.data?.label || n.label}","${n.data?.type || n.type}"`).join('\n');
        const csvEdges = edges.map(e => `"${e.data?.source || e.source}","${e.data?.target || e.target}","${e.data?.label || e.label}"`).join('\n');
        content = `Nodes\nid,label,type\n${csvNodes}\n\nEdges\nsource,target,label\n${csvEdges}`;
        filename = `graph-export-${Date.now()}.csv`;
        type = 'text/csv';
        break;
      default:
        return;
    }

    const blob = new Blob([content], { type });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = filename;
    link.click();
    URL.revokeObjectURL(url);
  };

  return (
    <Box sx={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
        <Typography variant="h5" component="h1" fontWeight="bold">
          Advanced Graph Explorer {id && `- Investigation ${id}`}
        </Typography>
        <Box sx={{ display: 'flex', gap: 1 }}>
          <Button
            variant="outlined"
            startIcon={<AccountTree />}
            onClick={(e) => setLayoutMenuAnchor(e.currentTarget)}
          >
            Layout: {currentLayout}
          </Button>
          <Button
            variant="outlined"
            startIcon={<Psychology />}
            onClick={(e) => setAiMenuAnchor(e.currentTarget)}
          >
            AI Tools
          </Button>
          <Button
            variant={realTimeEnabled ? "contained" : "outlined"}
            startIcon={realTimeEnabled ? <Stop /> : <PlayArrow />}
            onClick={() => setRealTimeEnabled(!realTimeEnabled)}
            color={realTimeEnabled ? "success" : "primary"}
          >
            Real-time: {realTimeEnabled ? 'ON' : 'OFF'}
          </Button>
          <Button
            variant="outlined"
            startIcon={<Refresh />}
            onClick={handleRefresh}
            disabled={loading}
          >
            Refresh
          </Button>
          <Button
            variant="outlined"
            startIcon={<FilterList />}
            onClick={() => setSettingsOpen(true)}
          >
            Filters
          </Button>
          <Button variant="contained" startIcon={<Download />} onClick={() => handleExportData('json')}>
            Export
          </Button>
        </Box>
      </Box>

      <Box sx={{ display: 'flex', gap: 1, mb: 2, flexWrap: 'wrap' }}>
        <Chip label={`Nodes: ${nodes.length}`} color="primary" variant="outlined" />
        <Chip label={`Edges: ${edges.length}`} color="secondary" variant="outlined" />
        <Chip 
          label={`Layout: ${currentLayout}`} 
          color={loading ? "default" : "success"} 
          variant="outlined" 
        />
        <Chip 
          label={`Status: ${loading ? 'Loading...' : 'Ready'}`}
          color={loading ? "warning" : "success"}
          variant="outlined"
        />
      </Box>

      <Alert severity="info" sx={{ mb: 2 }}>
        Advanced graph visualization with Cytoscape.js. Select nodes/edges to see details, right-click for context menu.
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
        <div
          ref={containerRef}
          style={{
            width: '100%',
            height: '100%',
            background: '#fafafa'
          }}
        />
        
        <Box sx={{ 
          position: 'absolute', 
          top: 16, 
          right: 16, 
          display: 'flex', 
          flexDirection: 'column',
          gap: 1
        }}>
          <Tooltip title="Zoom In">
            <IconButton size="small" sx={{ bgcolor: 'white' }} onClick={handleZoomIn}>
              <ZoomIn />
            </IconButton>
          </Tooltip>
          <Tooltip title="Zoom Out">
            <IconButton size="small" sx={{ bgcolor: 'white' }} onClick={handleZoomOut}>
              <ZoomOut />
            </IconButton>
          </Tooltip>
          <Tooltip title="Fit to View">
            <IconButton size="small" sx={{ bgcolor: 'white' }} onClick={handleCenter}>
              <CenterFocusStrong />
            </IconButton>
          </Tooltip>
          <Tooltip title="Settings">
            <IconButton size="small" sx={{ bgcolor: 'white' }} onClick={() => setSettingsOpen(true)}>
              <Settings />
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

      {/* Layout Menu */}
      <Menu
        anchorEl={layoutMenuAnchor}
        open={Boolean(layoutMenuAnchor)}
        onClose={() => setLayoutMenuAnchor(null)}
      >
        {Object.keys(layoutConfigs).map((layout) => (
          <MenuItem 
            key={layout} 
            onClick={() => applyLayout(layout)}
            selected={layout === currentLayout}
          >
            {layout.charAt(0).toUpperCase() + layout.slice(1)}
          </MenuItem>
        ))}
      </Menu>

      {/* AI Tools Menu */}
      <Menu
        anchorEl={aiMenuAnchor}
        open={Boolean(aiMenuAnchor)}
        onClose={() => setAiMenuAnchor(null)}
      >
        <MenuItem onClick={() => { handleAILinkPrediction(); setAiMenuAnchor(null); }}>
          <AutoGraph sx={{ mr: 1 }} /> Predict Missing Links
        </MenuItem>
        <MenuItem onClick={() => { handleAICommunityDetection(); setAiMenuAnchor(null); }}>
          <GroupWork sx={{ mr: 1 }} /> Detect Communities
        </MenuItem>
        <MenuItem 
          onClick={() => { handleAIEntityExtraction(); setAiMenuAnchor(null); }}
          disabled={!selectedNode}
        >
          <Psychology sx={{ mr: 1 }} /> Extract Entities
        </MenuItem>
      </Menu>

      {/* Settings Drawer */}
      <Drawer
        anchor="right"
        open={settingsOpen}
        onClose={() => setSettingsOpen(false)}
        sx={{ '& .MuiDrawer-paper': { width: 350, p: 2 } }}
      >
        <Typography variant="h6" sx={{ mb: 2 }}>
          Graph Settings
        </Typography>
        
        <FormControl fullWidth sx={{ mb: 2 }}>
          <InputLabel>Node Type Filter</InputLabel>
          <Select
            multiple
            value={filterSettings.nodeTypes}
            onChange={(e) => setFilterSettings(prev => ({ ...prev, nodeTypes: e.target.value }))}
          >
            <MenuItem value="PERSON">Person</MenuItem>
            <MenuItem value="ORGANIZATION">Organization</MenuItem>
            <MenuItem value="LOCATION">Location</MenuItem>
            <MenuItem value="DOCUMENT">Document</MenuItem>
            <MenuItem value="EVENT">Event</MenuItem>
          </Select>
        </FormControl>

        <Typography gutterBottom>Time Range</Typography>
        <Slider
          value={filterSettings.timeRange}
          onChange={(e, value) => setFilterSettings(prev => ({ ...prev, timeRange: value }))}
          valueLabelDisplay="auto"
          sx={{ mb: 2 }}
        />

        <Button variant="contained" fullWidth sx={{ mt: 2 }}>
          Apply Filters
        </Button>
      </Drawer>

      {/* Selection Info */}
      {(selectedNode || selectedEdge) && (
        <Paper sx={{ mt: 2, p: 2 }}>
          <Typography variant="h6" sx={{ mb: 1 }}>
            {selectedNode ? 'Selected Node' : 'Selected Edge'}
          </Typography>
          <pre style={{ fontSize: '12px', overflow: 'auto' }}>
            {JSON.stringify(selectedNode || selectedEdge, null, 2)}
          </pre>
        </Paper>
      )}

      {/* AI Job Dialog */}
      <Dialog
        open={aiJobDialog.open}
        onClose={() => !aiJobDialog.loading && setAiJobDialog({ open: false, type: '', loading: false })}
      >
        <DialogTitle>AI Analysis in Progress</DialogTitle>
        <DialogContent sx={{ display: 'flex', alignItems: 'center', gap: 2, minWidth: 300 }}>
          <CircularProgress size={24} />
          <Typography>
            Running {aiJobDialog.type.replace('_', ' ')} analysis...
          </Typography>
        </DialogContent>
      </Dialog>

      {/* Notification Snackbar */}
      <Snackbar
        open={!!notification}
        autoHideDuration={4000}
        onClose={() => setNotification(null)}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
      >
        <Alert 
          onClose={() => setNotification(null)} 
          severity={notification?.severity || 'info'}
        >
          {notification?.message}
        </Alert>
      </Snackbar>
    </Box>
  );
}

export default CytoscapeGraph;
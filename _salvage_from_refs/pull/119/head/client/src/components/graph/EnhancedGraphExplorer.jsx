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
  TextField,
  FormControl,
  InputLabel,
  Select,
  Slider,
  Switch,
  FormControlLabel,
  Divider,
  List,
  ListItem,
  ListItemText,
  ListItemIcon,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Accordion,
  AccordionSummary,
  AccordionDetails,
  SpeedDial,
  SpeedDialAction,
  SpeedDialIcon,
  Autocomplete
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
  Search,
  GetApp,
  PhotoCamera,
  Description,
  ViewModule,
  Navigation,
  GridOn,
  Tune,
  ExpandMore,
  Edit,
  Delete,
  Link,
  CopyAll,
  Visibility,
  VisibilityOff,
  Lock,
  LockOpen,
  Star,
  StarBorder,
  ColorLens,
  Transform,
  Speed,
  Analytics
} from '@mui/icons-material';
import { useParams } from 'react-router-dom';
import { useSelector, useDispatch } from 'react-redux';
import { setGraphData, addNode, addEdge, setSelectedNode, setSelectedEdge, updateNode, deleteNode, deleteEdge } from '../../store/slices/graphSlice';
import cytoscape from 'cytoscape';
import cola from 'cytoscape-cola';
import dagre from 'cytoscape-dagre';
import fcose from 'cytoscape-fcose';
import coseBilkent from 'cytoscape-cose-bilkent';
import popper from 'cytoscape-popper';
import contextMenus from 'cytoscape-context-menus';
import edgehandles from 'cytoscape-edgehandles';
import panzoom from 'cytoscape-panzoom';
import navigator from 'cytoscape-navigator';
import gridGuide from 'cytoscape-grid-guide';
import nodeResize from 'cytoscape-node-resize';
import Fuse from 'fuse.js';
import AIInsightsPanel from '../ai/AIInsightsPanel';
import NaturalLanguageQuery from '../ai/NaturalLanguageQuery';
import PresenceIndicator from '../collaboration/PresenceIndicator';
import LiveChat from '../collaboration/LiveChat';
import useSocket from '../../hooks/useSocket';
import { exportCyToSvg, downloadSvg } from '../../utils/exportSvg';

// Register extensions
cytoscape.use(cola);
cytoscape.use(dagre);
cytoscape.use(fcose);
cytoscape.use(coseBilkent);
cytoscape.use(popper);
cytoscape.use(contextMenus);
cytoscape.use(edgehandles);
cytoscape.use(panzoom);
cytoscape.use(navigator);
cytoscape.use(gridGuide);
cytoscape.use(nodeResize);

function EnhancedGraphExplorer() {
  const { id } = useParams();
  const dispatch = useDispatch();
  const cyRef = useRef(null);
  const containerRef = useRef(null);
  const [cy, setCy] = useState(null);
  const socket = useSocket();
  const { nodes, edges, selectedNode, selectedEdge } = useSelector(state => state.graph);
  const [loading, setLoading] = useState(false);
  const [layoutMenuAnchor, setLayoutMenuAnchor] = useState(null);
  const [currentLayout, setCurrentLayout] = useState('fcose');
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);
  const [exportOpen, setExportOpen] = useState(false);
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [editingElement, setEditingElement] = useState(null);
  const [contextMenuVisible, setContextMenuVisible] = useState(false);
  
  // Search and filter states
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState([]);
  const [filteredNodes, setFilteredNodes] = useState(new Set());
  const [filteredEdges, setFilteredEdges] = useState(new Set());
  
  // Advanced features
  const [dragToCreate, setDragToCreate] = useState(false);
  const [edgeCreationMode, setEdgeCreationMode] = useState(false);
  const [gridEnabled, setGridEnabled] = useState(false);
  const [snapToGrid, setSnapToGrid] = useState(false);
  const [nodeResizeEnabled, setNodeResizeEnabled] = useState(false);
  
  // Filter settings
  const [filterSettings, setFilterSettings] = useState({
    nodeTypes: [],
    relationshipTypes: [],
    timeRange: [0, 100],
    importance: [0, 5],
    hideIsolated: false,
    showOnlyConnected: false
  });

  // Layout configurations with enhanced options
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
      nestingFactor: 0.1,
      gravity: 0.25,
      numIter: 2500,
      initialTemp: 200,
      coolingFactor: 0.95,
      minTemp: 1.0
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
      nodeSpacing: 10,
      flow: undefined,
      alignment: undefined,
      gapInequalities: undefined
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
      ranker: 'network-simplex',
      rankSep: 75,
      nodeSep: 50,
      edgeSep: 10
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
      tilingPaddingHorizontal: 10,
      gravityRange: 3.8,
      gravityCompound: 1.0,
      gravityRangeCompound: 1.5,
      initialEnergyOnIncremental: 0.5
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
      sort: undefined,
      spacing: 40
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
      cols: undefined,
      sort: undefined
    },
    concentric: {
      name: 'concentric',
      animate: true,
      animationDuration: 1000,
      fit: true,
      padding: 30,
      startAngle: 3 * Math.PI / 2,
      sweep: undefined,
      clockwise: true,
      equidistant: false,
      minNodeSpacing: 10,
      concentric: function(node) {
        return node.degree();
      },
      levelWidth: function(nodes) {
        return nodes.maxDegree() / 4;
      }
    },
    breadthfirst: {
      name: 'breadthfirst',
      animate: true,
      animationDuration: 1000,
      fit: true,
      padding: 30,
      directed: false,
      circle: false,
      grid: false,
      spacingFactor: 1.75,
      radius: 10,
      startAngle: 3 * Math.PI / 2,
      sweep: 2 * Math.PI,
      clockwise: true,
      sort: undefined,
      transform: function(node, position) { return position; }
    }
  };

  // Enhanced styling configuration
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
        'width': (ele) => Math.max(30, (ele.data('importance') || 1) * 15),
        'height': (ele) => Math.max(30, (ele.data('importance') || 1) * 15),
        'overlay-opacity': 0,
        'transition-property': 'background-color, border-color, width, height, opacity',
        'transition-duration': '0.3s',
        'shape': (ele) => getNodeShape(ele.data('type')),
        'background-image': (ele) => getNodeIcon(ele.data('type')),
        'background-fit': 'cover',
        'background-image-opacity': 0.8
      }
    },
    {
      selector: 'node:selected',
      style: {
        'border-color': '#FF6B35',
        'border-width': 4,
        'background-color': '#FFE5DB',
        'z-index': 999
      }
    },
    {
      selector: 'node:hover',
      style: {
        'border-color': '#4CAF50',
        'border-width': 3,
        'z-index': 998
      }
    },
    {
      selector: 'node.highlighted',
      style: {
        'background-color': '#FFD700',
        'border-color': '#FFA000',
        'border-width': 4,
        'z-index': 997
      }
    },
    {
      selector: 'node.dimmed',
      style: {
        'opacity': 0.3
      }
    },
    {
      selector: 'node.hidden',
      style: {
        'display': 'none'
      }
    },
    {
      selector: 'node.locked',
      style: {
        'border-style': 'dashed',
        'border-color': '#F44336'
      }
    },
    {
      selector: 'node.starred',
      style: {
        'border-color': '#FFD700',
        'border-width': 3
      }
    },
    {
      selector: 'edge',
      style: {
        'width': (ele) => Math.max(2, (ele.data('weight') || 0.5) * 8),
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
        'transition-property': 'line-color, width, opacity',
        'transition-duration': '0.3s',
        'line-style': (ele) => getEdgeStyle(ele.data('type')),
        'arrow-scale': 1.5
      }
    },
    {
      selector: 'edge:selected',
      style: {
        'line-color': '#FF6B35',
        'target-arrow-color': '#FF6B35',
        'width': 6,
        'z-index': 999
      }
    },
    {
      selector: 'edge:hover',
      style: {
        'line-color': '#4CAF50',
        'target-arrow-color': '#4CAF50',
        'width': (ele) => Math.max(4, (ele.data('weight') || 0.5) * 10)
      }
    },
    {
      selector: 'edge.highlighted',
      style: {
        'line-color': '#FFD700',
        'target-arrow-color': '#FFD700',
        'width': 8,
        'z-index': 997
      }
    },
    {
      selector: 'edge.dimmed',
      style: {
        'opacity': 0.3
      }
    },
    {
      selector: 'edge.hidden',
      style: {
        'display': 'none'
      }
    },
    {
      selector: '.eh-handle',
      style: {
        'background-color': '#FF6B35',
        'width': 12,
        'height': 12,
        'shape': 'ellipse',
        'overlay-opacity': 0,
        'border-width': 2,
        'border-color': '#fff'
      }
    },
    {
      selector: '.eh-hover',
      style: {
        'background-color': '#4CAF50'
      }
    }
  ];

  const sampleNodes = [
    { 
      data: { 
        id: '1', 
        label: 'John Doe', 
        type: 'PERSON', 
        importance: 3,
        properties: { age: 35, occupation: 'Engineer' },
        starred: false,
        locked: false
      } 
    },
    { 
      data: { 
        id: '2', 
        label: 'Acme Corp', 
        type: 'ORGANIZATION', 
        importance: 4,
        properties: { industry: 'Technology', employees: 1000 },
        starred: true,
        locked: false
      } 
    },
    { 
      data: { 
        id: '3', 
        label: 'New York', 
        type: 'LOCATION', 
        importance: 2,
        properties: { country: 'USA', population: 8000000 },
        starred: false,
        locked: false
      } 
    },
    { 
      data: { 
        id: '4', 
        label: 'Document A', 
        type: 'DOCUMENT', 
        importance: 1,
        properties: { classification: 'Confidential', pages: 50 },
        starred: false,
        locked: false
      } 
    },
    { 
      data: { 
        id: '5', 
        label: 'Meeting 2024-01-15', 
        type: 'EVENT', 
        importance: 2,
        properties: { date: '2024-01-15', duration: '2 hours' },
        starred: false,
        locked: false
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
    { 
      data: { 
        id: 'e4', 
        source: '1', 
        target: '5', 
        label: 'ATTENDED', 
        type: 'PARTICIPATION',
        weight: 0.7,
        properties: { role: 'Participant' }
      } 
    },
  ];

  useEffect(() => {
    dispatch(setGraphData({ nodes: sampleNodes, edges: sampleEdges }));
  }, [dispatch]);

  useEffect(() => {
    if (containerRef.current && !cy) {
      initializeCytoscape();
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
      updateCytoscapeData();
    }
  }, [cy, nodes, edges]);

  // Initialize search functionality
  useEffect(() => {
    if (nodes.length > 0) {
      const fuse = new Fuse(nodes.map(n => n.data || n), {
        keys: ['label', 'type', 'properties.occupation', 'properties.industry'],
        threshold: 0.3
      });
      
      if (searchQuery) {
        const results = fuse.search(searchQuery);
        setSearchResults(results.map(r => r.item));
      } else {
        setSearchResults([]);
      }
    }
  }, [searchQuery, nodes]);

  const initializeCytoscape = () => {
    const cytoscapeInstance = cytoscape({
      container: containerRef.current,
      elements: [],
      style: cytoscapeStyle,
      layout: layoutConfigs[currentLayout],
      minZoom: 0.1,
      maxZoom: 10,
      wheelSensitivity: 0.1,
      boxSelectionEnabled: true,
      selectionType: 'single',
      autoungrabify: false,
      autounselectify: false
    });

    // Initialize plugins
    setupPlugins(cytoscapeInstance);
    setupEventHandlers(cytoscapeInstance);
    
    setCy(cytoscapeInstance);
    cyRef.current = cytoscapeInstance;
  };

  const setupPlugins = (cy) => {
    // Context menus
    cy.contextMenus({
      menuItems: [
        {
          id: 'edit',
          content: 'Edit',
          tooltipText: 'Edit element',
          selector: 'node, edge',
          onClickFunction: function (event) {
            handleEditElement(event.target || event.cyTarget);
          },
          hasTrailingDivider: true
        },
        {
          id: 'delete',
          content: 'Delete',
          tooltipText: 'Delete element',
          selector: 'node, edge',
          onClickFunction: function (event) {
            handleDeleteElement(event.target || event.cyTarget);
          }
        },
        {
          id: 'star',
          content: 'Star/Unstar',
          tooltipText: 'Toggle star',
          selector: 'node',
          onClickFunction: function (event) {
            handleStarElement(event.target || event.cyTarget);
          }
        },
        {
          id: 'lock',
          content: 'Lock/Unlock',
          tooltipText: 'Toggle lock',
          selector: 'node',
          onClickFunction: function (event) {
            handleLockElement(event.target || event.cyTarget);
          }
        },
        {
          id: 'copy',
          content: 'Copy',
          tooltipText: 'Copy element',
          selector: 'node, edge',
          onClickFunction: function (event) {
            handleCopyElement(event.target || event.cyTarget);
          },
          hasTrailingDivider: true
        },
        {
          id: 'add-node',
          content: 'Add Node',
          tooltipText: 'Add new node',
          coreAsWell: true,
          onClickFunction: function (event) {
            handleAddNodeAtPosition(event.position || event.renderedPosition);
          }
        },
        {
          id: 'hide',
          content: 'Hide',
          tooltipText: 'Hide element',
          selector: 'node, edge',
          onClickFunction: function (event) {
            handleHideElement(event.target || event.cyTarget);
          }
        }
      ]
    });

    // Edge handles for creating connections
    const edgeHandles = cy.edgehandles({
      canConnect: function(sourceNode, targetNode) {
        return !sourceNode.same(targetNode);
      },
      edgeParams: function(sourceNode, targetNode) {
        return {
          data: {
            id: `edge_${Date.now()}`,
            source: sourceNode.id(),
            target: targetNode.id(),
            label: 'RELATED_TO',
            type: 'ASSOCIATION',
            weight: 0.5
          }
        };
      },
      hoverDelay: 150,
      snap: true,
      snapThreshold: 50,
      snapFrequency: 15,
      noEdgeEventsInDraw: true,
      disableBrowserGestures: true
    });

    // Panzoom controls
    cy.panzoom({
      zoomFactor: 0.05,
      zoomDelay: 45,
      minZoom: 0.1,
      maxZoom: 10,
      fitPadding: 50,
      panSpeed: 10,
      panDistance: 10,
      panDragAreaSize: 75,
      panMinPercentSpeed: 0.25,
      panMaxPercentSpeed: 2.0,
      panInactiveArea: 8,
      panIndicatorMinOpacity: 0.5,
      zoomOnly: false,
      fitSelector: undefined,
      animateOnFit: function() { return false; },
      fitAnimationDuration: 1000
    });

    // Navigator
    cy.navigator({
      container: false, // Will be added to settings panel
      viewLiveFramerate: 0,
      thumbnailEventFramerate: 30,
      thumbnailLiveFramerate: false,
      dblClickDelay: 200,
      removeCustomContainer: true,
      rerenderDelay: 100
    });

    // Grid guide
    if (gridEnabled) {
      cy.gridGuide({
        snapToGridOnRelease: snapToGrid,
        snapToGridDuringDrag: snapToGrid,
        snapToAlignmentLocationOnRelease: true,
        snapToAlignmentLocationDuringDrag: false,
        distributionGuidelines: true,
        geometricGuideline: true,
        initPos: { x: 0, y: 0 },
        drawGrid: true,
        gridSpacing: 20,
        resize: true,
        parentPadding: true,
        drawGuidelines: true
      });
    }

    // Node resize
    if (nodeResizeEnabled) {
      cy.nodeResize({
        padding: 5,
        undoable: true,
        gripSize: 8,
        gripColor: '#FF6B35',
        gripShape: 'diamond',
        minNodeWidth: function(node) { return 30; },
        minNodeHeight: function(node) { return 30; },
        isFixedAspectRatioResizeMode: function(node) { return false; },
        setCompoundMinWidth: function(node, minWidth) { return 30; },
        setCompoundMinHeight: function(node, minHeight) { return 30; }
      });
    }
  };

  const setupEventHandlers = (cy) => {
    // Selection events
    cy.on('tap', 'node', (evt) => {
      const node = evt.target;
      dispatch(setSelectedNode(node.data()));
      highlightConnectedElements(node);
    });

    cy.on('tap', 'edge', (evt) => {
      const edge = evt.target;
      dispatch(setSelectedEdge(edge.data()));
      highlightEdge(edge);
    });

    cy.on('tap', (evt) => {
      if (evt.target === cy) {
        dispatch(setSelectedNode(null));
        dispatch(setSelectedEdge(null));
        clearHighlights();
      }
    });

    // Double click to edit
    cy.on('dblclick', 'node, edge', (evt) => {
      handleEditElement(evt.target);
    });

    // Drag and drop handling
    cy.on('dragfree', 'node', (evt) => {
      const node = evt.target;
      // Update node position in store if needed
    });

    // Layout events
    cy.on('layoutstop', () => {
      setLoading(false);
    });

    // Edge creation events
    cy.on('ehcomplete', (event, sourceNode, targetNode, addedEles) => {
      const newEdge = addedEles[0];
      dispatch(addEdge(newEdge.data()));
    });
  };

  const updateCytoscapeData = () => {
    if (!cy) return;

    const elements = [
      ...nodes.map(node => ({ data: node.data || node })),
      ...edges.map(edge => ({ data: edge.data || edge }))
    ];

    cy.elements().remove();
    cy.add(elements);
    
    // Apply filters
    applyFilters();
    
    // Apply current layout
    cy.layout(layoutConfigs[currentLayout]).run();
  };

  const applyFilters = () => {
    if (!cy) return;

    cy.elements().removeClass('hidden');

    // Filter by node types
    if (filterSettings.nodeTypes.length > 0) {
      cy.nodes().forEach(node => {
        if (!filterSettings.nodeTypes.includes(node.data('type'))) {
          node.addClass('hidden');
        }
      });
    }

    // Filter by relationship types
    if (filterSettings.relationshipTypes.length > 0) {
      cy.edges().forEach(edge => {
        if (!filterSettings.relationshipTypes.includes(edge.data('type'))) {
          edge.addClass('hidden');
        }
      });
    }

    // Filter by importance
    cy.nodes().forEach(node => {
      const importance = node.data('importance') || 1;
      if (importance < filterSettings.importance[0] || importance > filterSettings.importance[1]) {
        node.addClass('hidden');
      }
    });

    // Hide isolated nodes if requested
    if (filterSettings.hideIsolated) {
      cy.nodes().forEach(node => {
        if (node.degree() === 0) {
          node.addClass('hidden');
        }
      });
    }

    // Show only connected to selection
    if (filterSettings.showOnlyConnected && selectedNode) {
      const selectedCyNode = cy.getElementById(selectedNode.id);
      const connected = selectedCyNode.neighborhood().union(selectedCyNode);
      cy.elements().not(connected).addClass('hidden');
    }
  };

  const getNodeColor = (type) => {
    const colors = {
      PERSON: '#4caf50',
      ORGANIZATION: '#2196f3',
      LOCATION: '#ff9800',
      DOCUMENT: '#9c27b0',
      EVENT: '#f44336',
      ASSET: '#795548',
      COMMUNICATION: '#607d8b',
      FINANCIAL: '#009688',
      LEGAL: '#3f51b5'
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
      ASSOCIATION: '#9c27b0',
      PARTICIPATION: '#673ab7'
    };
    return colors[type] || '#666';
  };

  const getNodeShape = (type) => {
    const shapes = {
      PERSON: 'ellipse',
      ORGANIZATION: 'rectangle',
      LOCATION: 'triangle',
      DOCUMENT: 'round-rectangle',
      EVENT: 'pentagon',
      ASSET: 'hexagon',
      COMMUNICATION: 'octagon'
    };
    return shapes[type] || 'ellipse';
  };

  const getEdgeStyle = (type) => {
    const styles = {
      FAMILY: 'solid',
      EMPLOYMENT: 'solid',
      FINANCIAL: 'dashed',
      COMMUNICATION: 'dotted',
      SUSPECTED: 'dashed'
    };
    return styles[type] || 'solid';
  };

  const getNodeIcon = (type) => {
    // This would return actual icon URLs in a real implementation
    return null;
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

  const handleEditElement = (element) => {
    setEditingElement(element.data());
    setEditDialogOpen(true);
  };

  const handleDeleteElement = (element) => {
    if (element.isNode && element.isNode()) {
      dispatch(deleteNode(element.id()));
    } else if (element.isEdge && element.isEdge()) {
      dispatch(deleteEdge(element.id()));
    }
  };

  const handleStarElement = (element) => {
    if (element.isNode && element.isNode()) {
      const nodeData = element.data();
      const starred = !nodeData.starred;
      element.data('starred', starred);
      
      if (starred) {
        element.addClass('starred');
      } else {
        element.removeClass('starred');
      }
      
      dispatch(updateNode({ id: nodeData.id, starred }));
    }
  };

  const handleLockElement = (element) => {
    if (element.isNode && element.isNode()) {
      const nodeData = element.data();
      const locked = !nodeData.locked;
      element.data('locked', locked);
      
      if (locked) {
        element.addClass('locked');
        element.ungrabify();
      } else {
        element.removeClass('locked');
        element.grabify();
      }
      
      dispatch(updateNode({ id: nodeData.id, locked }));
    }
  };

  const handleCopyElement = (element) => {
    // Copy element data to clipboard
    navigator.clipboard.writeText(JSON.stringify(element.data(), null, 2));
  };

  const handleHideElement = (element) => {
    element.addClass('hidden');
  };

  const handleAddNodeAtPosition = (position) => {
    const newNode = {
      data: {
        id: `node_${Date.now()}`,
        label: `New Entity ${nodes.length + 1}`,
        type: 'PERSON',
        importance: Math.random() * 5,
        properties: {},
        starred: false,
        locked: false
      },
      position: position
    };
    dispatch(addNode(newNode));
  };

  const applyLayout = (layoutName) => {
    if (cy) {
      setLoading(true);
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

  const handleRefresh = () => {
    setLoading(true);
    setTimeout(() => {
      dispatch(setGraphData({ nodes: sampleNodes, edges: sampleEdges }));
      setLoading(false);
    }, 1000);
  };

  const handleExport = (format) => {
    if (!cy) return;

    switch (format) {
      case 'png':
        const png = cy.png({ scale: 2, full: true });
        const link = document.createElement('a');
        link.download = `graph-${Date.now()}.png`;
        link.href = png;
        link.click();
        break;
      case 'jpg':
        const jpg = cy.jpg({ scale: 2, full: true });
        const jpgLink = document.createElement('a');
        jpgLink.download = `graph-${Date.now()}.jpg`;
        jpgLink.href = jpg;
        jpgLink.click();
        break;
      case 'svg':
        try {
          const svg = exportCyToSvg(cy, { padding: 20 });
          downloadSvg(svg);
        } catch (e) {
          console.warn('SVG export failed:', e);
        }
        break;
      case 'json':
        const data = {
          nodes: cy.nodes().map(n => n.data()),
          edges: cy.edges().map(e => e.data())
        };
        const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const jsonLink = document.createElement('a');
        jsonLink.download = `graph-${Date.now()}.json`;
        jsonLink.href = url;
        jsonLink.click();
        URL.revokeObjectURL(url);
        break;
    }
    setExportOpen(false);
  };

  const handleSearchResultClick = (result) => {
    if (cy) {
      const node = cy.getElementById(result.id);
      if (node.length > 0) {
        cy.center(node);
        cy.zoom(2);
        node.select();
        dispatch(setSelectedNode(result));
        highlightConnectedElements(node);
      }
    }
    setSearchOpen(false);
  };

  const toggleEdgeCreation = () => {
    if (cy) {
      const eh = cy.edgehandles();
      if (edgeCreationMode) {
        eh.disable();
      } else {
        eh.enable();
      }
      setEdgeCreationMode(!edgeCreationMode);
    }
  };

  const speedDialActions = [
    { icon: <Add />, name: 'Add Node', onClick: () => handleAddNodeAtPosition({ x: 100, y: 100 }) },
    { icon: <Link />, name: 'Create Edge', onClick: toggleEdgeCreation },
    { icon: <PhotoCamera />, name: 'Export PNG', onClick: () => handleExport('png') },
    { icon: <Description />, name: 'Export SVG', onClick: () => handleExport('svg') },
    { icon: <Description />, name: 'Export JSON', onClick: () => handleExport('json') },
    { icon: <Refresh />, name: 'Refresh', onClick: handleRefresh },
  ];

  return (
    <Box sx={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
      {/* Header */}
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
        <Typography variant="h5" component="h1" fontWeight="bold">
          Enhanced Graph Explorer {id && `- Investigation ${id}`}
        </Typography>
        <Box sx={{ display: 'flex', gap: 1 }}>
          <Button
            variant="outlined"
            startIcon={<Search />}
            onClick={() => setSearchOpen(true)}
          >
            Search
          </Button>
          <Button
            variant="outlined"
            startIcon={<AccountTree />}
            onClick={(e) => setLayoutMenuAnchor(e.currentTarget)}
          >
            Layout: {currentLayout}
          </Button>
          <Button
            variant="outlined"
            startIcon={<FilterList />}
            onClick={() => setSettingsOpen(true)}
          >
            Filters
          </Button>
          <Button
            variant="outlined"
            startIcon={<GetApp />}
            onClick={() => setExportOpen(true)}
          >
            Export
          </Button>
        </Box>
      </Box>

      {/* Status Bar */}
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
        {edgeCreationMode && (
          <Chip 
            label="Edge Creation Mode" 
            color="info" 
            variant="filled"
            onDelete={toggleEdgeCreation}
          />
        )}
      </Box>

      {/* Main Graph Container */}
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

        {socket && (
          <Box sx={{ position: 'absolute', top: 16, left: 16, zIndex: 10 }}>
            <PresenceIndicator socket={socket} investigationId={id} />
          </Box>
        )}
        
        {/* Control Panel */}
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

        {/* Natural Language Query (compact) */}
        {cy && (
          <Box sx={{ position: 'absolute', top: 16, left: 80, right: 200, zIndex: 9 }}>
            <Paper elevation={2} sx={{ p: 1 }} aria-label="Natural language query">
              <NaturalLanguageQuery cy={cy} />
            </Paper>
          </Box>
        )}

        {/* AI Insights Panel (compact overlay) */}
        {cy && (
          <Box sx={{ position: 'absolute', bottom: 16, right: 16, width: 360, maxWidth: '95%', zIndex: 9 }}>
            <Paper elevation={4} sx={{ maxHeight: 420, overflow: 'auto', p: 1 }} aria-label="AI insights panel">
              <AIInsightsPanel cy={cy} selectedNode={selectedNode} investigationId={id} />
            </Paper>
          </Box>
        )}

        {/* Speed Dial */}
        <SpeedDial
          ariaLabel="Graph Actions"
          sx={{ position: 'absolute', bottom: 16, right: 16 }}
          icon={<SpeedDialIcon />}
        >
          {speedDialActions.map((action) => (
            <SpeedDialAction
              key={action.name}
              icon={action.icon}
              tooltipTitle={action.name}
              onClick={action.onClick}
            />
          ))}
        </SpeedDial>
      </Paper>

      {/* Floating chat widget */}
      {socket && (
        <LiveChat
          websocketService={socket}
          currentUser={{}} // server derives user from token; client display uses message payload
          investigationId={id}
          isMinimized
          onToggleMinimize={() => {}}
        />
      )}

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

      {/* Search Dialog */}
      <Dialog
        open={searchOpen}
        onClose={() => setSearchOpen(false)}
        maxWidth="md"
        fullWidth
      >
        <DialogTitle>Search Graph</DialogTitle>
        <DialogContent>
          <TextField
            autoFocus
            fullWidth
            variant="outlined"
            placeholder="Search nodes by name, type, or properties..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            sx={{ mb: 2 }}
          />
          <List>
            {searchResults.map((result) => (
              <ListItem 
                key={result.id} 
                button 
                onClick={() => handleSearchResultClick(result)}
              >
                <ListItemIcon>
                  <Chip 
                    label={result.type} 
                    size="small" 
                    sx={{ bgcolor: getNodeColor(result.type), color: 'white' }}
                  />
                </ListItemIcon>
                <ListItemText 
                  primary={result.label}
                  secondary={`ID: ${result.id}`}
                />
              </ListItem>
            ))}
          </List>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setSearchOpen(false)}>Close</Button>
        </DialogActions>
      </Dialog>

      {/* Export Dialog */}
      <Dialog
        open={exportOpen}
        onClose={() => setExportOpen(false)}
        maxWidth="sm"
        fullWidth
      >
        <DialogTitle>Export Graph</DialogTitle>
        <DialogContent>
          <List>
            <ListItem button onClick={() => handleExport('png')}>
              <ListItemIcon><PhotoCamera /></ListItemIcon>
              <ListItemText primary="PNG Image" secondary="High resolution image" />
            </ListItem>
            <ListItem button onClick={() => handleExport('jpg')}>
              <ListItemIcon><PhotoCamera /></ListItemIcon>
              <ListItemText primary="JPG Image" secondary="Compressed image" />
            </ListItem>
            <ListItem button onClick={() => handleExport('json')}>
              <ListItemIcon><Description /></ListItemIcon>
              <ListItemText primary="JSON Data" secondary="Graph data structure" />
            </ListItem>
          </List>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setExportOpen(false)}>Cancel</Button>
        </DialogActions>
      </Dialog>

      {/* Settings Drawer */}
      <Drawer
        anchor="right"
        open={settingsOpen}
        onClose={() => setSettingsOpen(false)}
        sx={{ '& .MuiDrawer-paper': { width: 400, p: 2 } }}
      >
        <Typography variant="h6" sx={{ mb: 2 }}>
          Graph Settings
        </Typography>
        
        <Accordion defaultExpanded>
          <AccordionSummary expandIcon={<ExpandMore />}>
            <Typography>Display Options</Typography>
          </AccordionSummary>
          <AccordionDetails>
            <FormControlLabel
              control={
                <Switch
                  checked={gridEnabled}
                  onChange={(e) => setGridEnabled(e.target.checked)}
                />
              }
              label="Show Grid"
            />
            <FormControlLabel
              control={
                <Switch
                  checked={snapToGrid}
                  onChange={(e) => setSnapToGrid(e.target.checked)}
                />
              }
              label="Snap to Grid"
            />
            <FormControlLabel
              control={
                <Switch
                  checked={nodeResizeEnabled}
                  onChange={(e) => setNodeResizeEnabled(e.target.checked)}
                />
              }
              label="Node Resize"
            />
          </AccordionDetails>
        </Accordion>

        <Accordion>
          <AccordionSummary expandIcon={<ExpandMore />}>
            <Typography>Filters</Typography>
          </AccordionSummary>
          <AccordionDetails>
            <FormControl fullWidth sx={{ mb: 2 }}>
              <InputLabel>Node Types</InputLabel>
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

            <Typography gutterBottom>Importance Range</Typography>
            <Slider
              value={filterSettings.importance}
              onChange={(e, value) => setFilterSettings(prev => ({ ...prev, importance: value }))}
              valueLabelDisplay="auto"
              min={0}
              max={5}
              sx={{ mb: 2 }}
            />

            <FormControlLabel
              control={
                <Switch
                  checked={filterSettings.hideIsolated}
                  onChange={(e) => setFilterSettings(prev => ({ ...prev, hideIsolated: e.target.checked }))}
                />
              }
              label="Hide Isolated Nodes"
            />

            <FormControlLabel
              control={
                <Switch
                  checked={filterSettings.showOnlyConnected}
                  onChange={(e) => setFilterSettings(prev => ({ ...prev, showOnlyConnected: e.target.checked }))}
                />
              }
              label="Show Only Connected"
            />

            <Button 
              variant="contained" 
              fullWidth 
              sx={{ mt: 2 }}
              onClick={applyFilters}
            >
              Apply Filters
            </Button>
          </AccordionDetails>
        </Accordion>
      </Drawer>

      {/* Edit Element Dialog */}
      <Dialog
        open={editDialogOpen}
        onClose={() => setEditDialogOpen(false)}
        maxWidth="md"
        fullWidth
      >
        <DialogTitle>
          Edit {editingElement?.type || 'Element'}
        </DialogTitle>
        <DialogContent>
          {editingElement && (
            <Box sx={{ mt: 1 }}>
              <TextField
                fullWidth
                label="Label"
                defaultValue={editingElement.label}
                sx={{ mb: 2 }}
              />
              <TextField
                fullWidth
                label="Type"
                defaultValue={editingElement.type}
                sx={{ mb: 2 }}
              />
              <TextField
                fullWidth
                multiline
                rows={4}
                label="Properties (JSON)"
                defaultValue={JSON.stringify(editingElement.properties || {}, null, 2)}
                sx={{ mb: 2 }}
              />
            </Box>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setEditDialogOpen(false)}>Cancel</Button>
          <Button variant="contained">Save</Button>
        </DialogActions>
      </Dialog>

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
    </Box>
  );
}

export default EnhancedGraphExplorer;

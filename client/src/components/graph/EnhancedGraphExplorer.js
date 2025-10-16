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
  ListItemButton,
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
  Autocomplete,
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
  Analytics,
} from '@mui/icons-material';
import { useParams } from 'react-router-dom';
import { useSelector, useDispatch } from 'react-redux';
import {
  setGraphData,
  addNode,
  addEdge,
  setSelectedNodes,
  setSelectedEdges,
  updateNode,
  deleteNode,
  deleteEdge,
} from '../../store/slices/graphSlice';
import cytoscape from 'cytoscape';
import cola from 'cytoscape-cola';
import dagre from 'cytoscape-dagre';
import fcose from 'cytoscape-fcose';
import coseBilkent from 'cytoscape-cose-bilkent';
import popper from 'cytoscape-popper';
import edgehandles from 'cytoscape-edgehandles';
import panzoom from 'cytoscape-panzoom';
import navigator from 'cytoscape-navigator';
import gridGuide from 'cytoscape-grid-guide';
import Fuse from 'fuse.js';
import AIInsightsPanel from '../ai/AIInsightsPanel';
import NaturalLanguageQuery from '../ai/NaturalLanguageQuery';
import PresenceIndicator from '../collaboration/PresenceIndicator';
import LiveChat from '../collaboration/LiveChat';
import useSocket from '../../hooks/useSocket';
import GeointTimeSeriesPanel from '../geoint/GeointTimeSeriesPanel';
import GeoMapPanel from '../geoint/GeoMapPanel';
import SearchPanel from '../ai/SearchPanel.jsx';
import { gql, useMutation, useLazyQuery } from '@apollo/client';
import { apolloClient } from '../../services/apollo';
import EnrichmentPanel from '../osint/EnrichmentPanel';
import RelationshipModal from './RelationshipModal';
import EntityDrawer from '../../../../ui/components/EntityDrawer';
// (TextField, Slider already imported above in the bulk MUI import)
import ConflictResolutionModal from '../collaboration/ConflictResolutionModal';

const ENRICH_WIKI = gql`
  mutation Enrich($entityId: ID, $title: String!) {
    enrichEntityFromWikipedia(entityId: $entityId, title: $title) {
      id
      label
      properties
    }
  }
`;

const GET_PROVENANCE = gql`
  query Prov($resourceType: String!, $resourceId: ID!) {
    provenance(resourceType: $resourceType, resourceId: $resourceId) {
      id
      source
      uri
      metadata
      createdAt
    }
  }
`;

const UPDATE_REL = gql`
  mutation UpdateRel(
    $id: ID!
    $input: UpdateRelationshipInput!
    $lastSeen: DateTime!
  ) {
    updateRelationship(id: $id, input: $input, lastSeenTimestamp: $lastSeen) {
      id
      label
      confidence
      validFrom
      validTo
      updatedAt
    }
  }
`;

const CREATE_REL = gql`
  mutation CreateRel($input: CreateRelationshipInput!) {
    createRelationship(input: $input) {
      id
      label
      type
      confidence
      validFrom
      validTo
    }
  }
`;

const DELETE_REL = gql`
  mutation DeleteRel($id: ID!) {
    deleteRelationship(id: $id)
  }
`;
import { exportCyToSvg, downloadSvg } from '../../utils/exportSvg';
import { ExportAPI } from '../../services/api';

const SUGGEST_LINKS = gql`
  mutation Suggest($investigationId: ID!, $topK: Int) {
    suggestLinks(investigationId: $investigationId, topK: $topK) {
      source
      target
      score
    }
  }
`;

// Register extensions
cytoscape.use(cola);
cytoscape.use(dagre);
cytoscape.use(fcose);
cytoscape.use(coseBilkent);
cytoscape.use(popper);
cytoscape.use(edgehandles);
cytoscape.use(panzoom);
cytoscape.use(navigator);
cytoscape.use(gridGuide);
// node-resize extension removed (optional)

function EnhancedGraphExplorer() {
  const { id } = useParams();
  const dispatch = useDispatch();
  const cyRef = useRef(null);
  const containerRef = useRef(null);
  const [cy, setCy] = useState(null);
  const socket = useSocket();
  const { nodes, edges, selectedNode, selectedEdge } = useSelector(
    (state) => state.graph,
  );
  const [loading, setLoading] = useState(false);
  const [layoutMenuAnchor, setLayoutMenuAnchor] = useState(null);
  const [currentLayout, setCurrentLayout] = useState('fcose');
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);
  const [exportOpen, setExportOpen] = useState(false);
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [editingElement, setEditingElement] = useState(null);
  const [contextMenu, setContextMenu] = useState(null);
  const [contextElement, setContextElement] = useState(null);
  const [entityDrawerOpen, setEntityDrawerOpen] = useState(false);
  const [entityDrawerId, setEntityDrawerId] = useState(null);
  const [timeFrom, setTimeFrom] = useState('2000-01-01');
  const [timeTo, setTimeTo] = useState('2100-01-01');
  const [enrich] = useMutation(ENRICH_WIKI);
  const [updateRel] = useMutation(UPDATE_REL);
  const [createRel] = useMutation(CREATE_REL);
  const [deleteRelMutation] = useMutation(DELETE_REL);
  const [edgeEditor, setEdgeEditor] = useState({
    open: false,
    id: '',
    label: '',
    confidence: 0.5,
    validFrom: '',
    validTo: '',
    updatedAt: '',
  });
  const [conflict, setConflict] = useState(null);
  const [loadProv, { data: provData }] = useLazyQuery(GET_PROVENANCE);
  const [playing, setPlaying] = useState(false);
  const [windowDays, setWindowDays] = useState(30);
  const [stepDays, setStepDays] = useState(7);
  const playRef = useRef(null);
  const [newRelConfig, setNewRelConfig] = useState({
    active: false,
    sourceId: null,
    type: 'RELATED_TO',
    label: '',
  });
  const [domain, setDomain] = useState({
    start: '2000-01-01',
    end: '2100-01-01',
  });
  const rafRef = useRef(null);
  const [relModalOpen, setRelModalOpen] = useState(false);
  const [suggestions, setSuggestions] = useState([]);
  const [suggestionsOpen, setSuggestionsOpen] = useState(false);
  const [runSuggest, { loading: suggesting }] = useMutation(SUGGEST_LINKS);

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
    showOnlyConnected: false,
  });

  // Layout configurations with enhanced options
  const layoutConfigs = {
    fcose: {
      name: 'fcose',
      quality: 'default',
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
      minTemp: 1.0,
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
      gapInequalities: undefined,
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
      edgeSep: 10,
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
      initialEnergyOnIncremental: 0.5,
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
      spacing: 40,
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
      sort: undefined,
    },
    concentric: {
      name: 'concentric',
      animate: true,
      animationDuration: 1000,
      fit: true,
      padding: 30,
      startAngle: (3 * Math.PI) / 2,
      sweep: undefined,
      clockwise: true,
      equidistant: false,
      minNodeSpacing: 10,
      concentric: function (node) {
        return node.degree();
      },
      levelWidth: function (nodes) {
        return nodes.maxDegree() / 4;
      },
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
      startAngle: (3 * Math.PI) / 2,
      sweep: 2 * Math.PI,
      clockwise: true,
      sort: undefined,
      transform: function (node, position) {
        return position;
      },
    },
  };

  // Enhanced styling configuration
  const cytoscapeStyle = [
    {
      selector: 'node',
      style: {
        'background-color': (ele) => getNodeColor(ele.data('type')),
        label: (ele) => {
          const sentimentIcon = getSentimentIcon(ele.data('sentimentLabel'));
          const baseLabel = ele.data('label') || '';
          return sentimentIcon ? `${sentimentIcon}${baseLabel}` : baseLabel;
        },
        color: '#333',
        'font-size': '12px',
        'font-weight': 'bold',
        'text-halign': 'center',
        'text-valign': 'center',
        'border-width': 2,
        'border-color': '#fff',
        width: (ele) => Math.max(30, (ele.data('importance') || 1) * 15),
        height: (ele) => Math.max(30, (ele.data('importance') || 1) * 15),
        'overlay-opacity': 0,
        'transition-property':
          'background-color, border-color, width, height, opacity',
        'transition-duration': '0.3s',
        shape: (ele) => getNodeShape(ele.data('type')),
        'background-image': (ele) => getNodeIcon(ele.data('type')),
        'background-fit': 'cover',
        'background-image-opacity': 0.8,
      },
    },
    {
      selector: 'node:selected',
      style: {
        'border-color': '#FF6B35',
        'border-width': 4,
        'background-color': '#FFE5DB',
        'z-index': 999,
      },
    },
    {
      selector: 'node:hover',
      style: {
        'border-color': '#4CAF50',
        'border-width': 3,
        'z-index': 998,
      },
    },
    {
      selector: 'node.highlighted',
      style: {
        'background-color': '#FFD700',
        'border-color': '#FFA000',
        'border-width': 4,
        'z-index': 997,
      },
    },
    {
      selector: 'node.dimmed',
      style: {
        opacity: 0.3,
      },
    },
    {
      selector: 'node.hidden',
      style: {
        display: 'none',
      },
    },
    {
      selector: 'node.locked',
      style: {
        'border-style': 'dashed',
        'border-color': '#F44336',
      },
    },
    {
      selector: 'node.starred',
      style: {
        'border-color': '#FFD700',
        'border-width': 3,
      },
    },
    {
      selector: 'edge',
      style: {
        width: (ele) => Math.max(2, (ele.data('weight') || 0.5) * 8),
        'line-color': (ele) => getEdgeColor(ele.data('type')),
        'target-arrow-color': (ele) => getEdgeColor(ele.data('type')),
        'target-arrow-shape': 'triangle',
        'curve-style': 'bezier',
        label: 'data(label)',
        'font-size': '10px',
        'text-rotation': 'autorotate',
        'text-margin-y': -10,
        'edge-text-rotation': 'autorotate',
        'overlay-opacity': 0,
        'transition-property': 'line-color, width, opacity',
        'transition-duration': '0.3s',
        'line-style': (ele) => getEdgeStyle(ele.data('type')),
        'arrow-scale': 1.5,
      },
    },
    {
      selector: 'edge:selected',
      style: {
        'line-color': '#FF6B35',
        'target-arrow-color': '#FF6B35',
        width: 6,
        'z-index': 999,
      },
    },
    {
      selector: 'edge:hover',
      style: {
        'line-color': '#4CAF50',
        'target-arrow-color': '#4CAF50',
        width: (ele) => Math.max(4, (ele.data('weight') || 0.5) * 10),
      },
    },
    {
      selector: 'edge.suggested',
      style: {
        'line-style': 'dashed',
        opacity: 0.6,
        'line-color': '#9ca3af',
        'target-arrow-color': '#9ca3af',
        width: 2,
      },
    },
    {
      selector: 'edge.highlighted',
      style: {
        'line-color': '#FFD700',
        'target-arrow-color': '#FFD700',
        width: 8,
        'z-index': 997,
      },
    },
    {
      selector: 'edge.dimmed',
      style: {
        opacity: 0.3,
      },
    },
    {
      selector: 'edge.hidden',
      style: {
        display: 'none',
      },
    },
    {
      selector: '.eh-handle',
      style: {
        'background-color': '#FF6B35',
        width: 12,
        height: 12,
        shape: 'ellipse',
        'overlay-opacity': 0,
        'border-width': 2,
        'border-color': '#fff',
      },
    },
    {
      selector: '.eh-hover',
      style: {
        'background-color': '#4CAF50',
      },
    },
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
        locked: false,
      },
    },
    {
      data: {
        id: '2',
        label: 'Acme Corp',
        type: 'ORGANIZATION',
        importance: 4,
        properties: { industry: 'Technology', employees: 1000 },
        starred: true,
        locked: false,
      },
    },
    {
      data: {
        id: '3',
        label: 'New York',
        type: 'LOCATION',
        importance: 2,
        properties: { country: 'USA', population: 8000000 },
        starred: false,
        locked: false,
      },
    },
    {
      data: {
        id: '4',
        label: 'Document A',
        type: 'DOCUMENT',
        importance: 1,
        properties: { classification: 'Confidential', pages: 50 },
        starred: false,
        locked: false,
      },
    },
    {
      data: {
        id: '5',
        label: 'Meeting 2024-01-15',
        type: 'EVENT',
        importance: 2,
        properties: { date: '2024-01-15', duration: '2 hours' },
        starred: false,
        locked: false,
      },
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
        properties: { since: '2020-01-01', role: 'Senior Engineer' },
      },
    },
    {
      data: {
        id: 'e2',
        source: '1',
        target: '3',
        label: 'LOCATED_AT',
        type: 'LOCATION',
        weight: 0.6,
        properties: { address: '123 Main St' },
      },
    },
    {
      data: {
        id: 'e3',
        source: '2',
        target: '4',
        label: 'OWNS',
        type: 'OWNERSHIP',
        weight: 0.9,
        properties: { acquired: '2019-05-15' },
      },
    },
    {
      data: {
        id: 'e4',
        source: '1',
        target: '5',
        label: 'ATTENDED',
        type: 'PARTICIPATION',
        weight: 0.7,
        properties: { role: 'Participant' },
      },
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
      // Apply timeline filter to edges
      const inRange = (vf, vt) => {
        const f = new Date(timeFrom);
        const t = new Date(timeTo);
        const from = vf ? new Date(vf) : new Date('1900-01-01');
        const to = vt ? new Date(vt) : new Date('2100-01-01');
        return !(to < f || from > t);
      };
      const filteredEdges = (edges || []).filter((e) => {
        const d = e.data || e;
        return inRange(
          d.validFrom || d.properties?.since,
          d.validTo || d.properties?.until,
        );
      });
      const data = {
        nodes,
        edges: filteredEdges,
      };
      // Temporarily reuse updateCytoscapeData by updating graph slice
      // Directly update cy for performance
      const elements = [
        ...data.nodes.map((node) => ({ data: node.data || node })),
        ...data.edges.map((edge) => ({ data: edge.data || edge })),
      ];
      cy.elements().remove();
      cy.add(elements);
      cy.layout(layoutConfigs[currentLayout]).run();
    }
  }, [cy, nodes, edges, timeFrom, timeTo]);

  // Auto-fit time domain from edges
  useEffect(() => {
    let min = new Date('2100-01-01');
    let max = new Date('1900-01-01');
    (edges || []).forEach((e) => {
      const d = e.data || e;
      const vf = new Date(d.validFrom || d.properties?.since || '2000-01-01');
      const vt = new Date(d.validTo || d.properties?.until || '2100-01-01');
      if (vf < min) min = vf;
      if (vt > max) max = vt;
    });
    if (min <= max) {
      const s = min.toISOString().slice(0, 10);
      const e = max.toISOString().slice(0, 10);
      setDomain({ start: s, end: e });
      if (timeFrom === '2000-01-01' && timeTo === '2100-01-01') {
        setTimeFrom(s);
        setTimeTo(e);
      }
    }
  }, [edges]);

  // RAF playback for smoother animation
  useEffect(() => {
    if (!playing) return;
    const stepMs = stepDays * 24 * 3600 * 1000;
    const winMs = windowDays * 24 * 3600 * 1000;
    let last = performance.now();
    const loop = (now) => {
      if (!playing) return;
      if (now - last > 800) {
        // ~1 Hz
        const f = new Date(timeFrom);
        const nf = new Date(f.getTime() + stepMs);
        const nt = new Date(nf.getTime() + winMs);
        setTimeFrom(nf.toISOString().slice(0, 10));
        setTimeTo(nt.toISOString().slice(0, 10));
        last = now;
      }
      rafRef.current = requestAnimationFrame(loop);
    };
    rafRef.current = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(rafRef.current);
  }, [playing, timeFrom, windowDays, stepDays]);

  // Initialize search functionality
  useEffect(() => {
    if (nodes.length > 0) {
      const fuse = new Fuse(
        nodes.map((n) => n.data || n),
        {
          keys: [
            'label',
            'type',
            'properties.occupation',
            'properties.industry',
          ],
          threshold: 0.3,
        },
      );

      if (searchQuery) {
        const results = fuse.search(searchQuery);
        setSearchResults(results.map((r) => r.item));
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
      autounselectify: false,
    });

    // Initialize plugins
    setupPlugins(cytoscapeInstance);
    setupEventHandlers(cytoscapeInstance);
    cytoscapeInstance.on('tap', 'edge', (evt) => {
      const edge = evt.target.data();
      setEdgeEditor({
        open: true,
        id: edge.id,
        label: edge.label || '',
        confidence: edge.confidence || 0.5,
        validFrom: edge.validFrom || edge.properties?.since || '',
        validTo: edge.validTo || edge.properties?.until || '',
        updatedAt: edge.updatedAt || edge.properties?.updatedAt || '',
      });
    });

    setCy(cytoscapeInstance);
    cyRef.current = cytoscapeInstance;
  };

  const setupPlugins = (cy) => {
    cy.on('cxttap', 'node, edge', (evt) => {
      evt.originalEvent.preventDefault();
      setContextElement(evt.target);
      setContextMenu({
        mouseX: evt.originalEvent.clientX + 2,
        mouseY: evt.originalEvent.clientY - 6,
      });
    });
    cy.on('tap', () => setContextMenu(null));

    // Edge handles for creating connections
    const edgeHandles = cy.edgehandles({
      canConnect: function (sourceNode, targetNode) {
        return !sourceNode.same(targetNode);
      },
      edgeParams: function (sourceNode, targetNode) {
        return {
          data: {
            id: `edge_${Date.now()}`,
            source: sourceNode.id(),
            target: targetNode.id(),
            label: 'RELATED_TO',
            type: 'ASSOCIATION',
            weight: 0.5,
          },
        };
      },
      hoverDelay: 150,
      snap: true,
      snapThreshold: 50,
      snapFrequency: 15,
      noEdgeEventsInDraw: true,
      disableBrowserGestures: true,
    });

    // When a new edge is drawn, create relationship in backend if requested
    cy.on('ehcomplete', async (event, sourceNode, targetNode, addedEdge) => {
      if (!newRelConfig.active) return;
      try {
        await createRel({
          variables: {
            input: {
              sourceId: sourceNode.id(),
              targetId: targetNode.id(),
              type: newRelConfig.type,
              label: newRelConfig.label,
              confidence: 0.5,
            },
          },
        });
      } catch (e) {
        console.warn('Failed to create relationship', e);
      } finally {
        setNewRelConfig({
          active: false,
          sourceId: null,
          type: 'RELATED_TO',
          label: '',
        });
        edgeHandles.disableDrawMode();
      }
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
      animateOnFit: function () {
        return false;
      },
      fitAnimationDuration: 1000,
    });

    // Navigator
    cy.navigator({
      container: false, // Will be added to settings panel
      viewLiveFramerate: 0,
      thumbnailEventFramerate: 30,
      thumbnailLiveFramerate: false,
      dblClickDelay: 200,
      removeCustomContainer: true,
      rerenderDelay: 100,
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
        drawGuidelines: true,
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
        minNodeWidth: function (node) {
          return 30;
        },
        minNodeHeight: function (node) {
          return 30;
        },
        isFixedAspectRatioResizeMode: function (node) {
          return false;
        },
        setCompoundMinWidth: function (node, minWidth) {
          return 30;
        },
        setCompoundMinHeight: function (node, minHeight) {
          return 30;
        },
      });
    }
  };

  const setupEventHandlers = (cy) => {
    // Selection events
    cy.on('tap', 'node', (evt) => {
      const node = evt.target;
      dispatch(setSelectedNodes([node.data()]));
      highlightConnectedElements(node);
    });

    cy.on('tap', 'edge', (evt) => {
      const edge = evt.target;
      dispatch(setSelectedEdges([edge.data()]));
      highlightEdge(edge);
    });

    cy.on('tap', (evt) => {
      if (evt.target === cy) {
        dispatch(setSelectedNodes([]));
        dispatch(setSelectedEdges([]));
        clearHighlights();
      }
    });

    cy.on('mouseover', 'node', (evt) => {
      const node = evt.target;
      const label = node.data('sentimentLabel');
      const score = node.data('sentimentScore');
      const tooltip = label ? `${label} (${(score || 0).toFixed(2)})` : '';
      cy.container().setAttribute('title', tooltip);
    });
    cy.on('mouseout', 'node', () => {
      cy.container().removeAttribute('title');
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
      ...nodes.map((node) => ({ data: node.data || node })),
      ...edges.map((edge) => ({ data: edge.data || edge })),
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
      cy.nodes().forEach((node) => {
        if (!filterSettings.nodeTypes.includes(node.data('type'))) {
          node.addClass('hidden');
        }
      });
    }

    // Filter by relationship types
    if (filterSettings.relationshipTypes.length > 0) {
      cy.edges().forEach((edge) => {
        if (!filterSettings.relationshipTypes.includes(edge.data('type'))) {
          edge.addClass('hidden');
        }
      });
    }

    // Filter by importance
    cy.nodes().forEach((node) => {
      const importance = node.data('importance') || 1;
      if (
        importance < filterSettings.importance[0] ||
        importance > filterSettings.importance[1]
      ) {
        node.addClass('hidden');
      }
    });

    // Hide isolated nodes if requested
    if (filterSettings.hideIsolated) {
      cy.nodes().forEach((node) => {
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
      LEGAL: '#3f51b5',
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
      PARTICIPATION: '#673ab7',
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
      COMMUNICATION: 'octagon',
    };
    return shapes[type] || 'ellipse';
  };

  const getEdgeStyle = (type) => {
    const styles = {
      FAMILY: 'solid',
      EMPLOYMENT: 'solid',
      FINANCIAL: 'dashed',
      COMMUNICATION: 'dotted',
      SUSPECTED: 'dashed',
    };
    return styles[type] || 'solid';
  };

  const getNodeIcon = (type) => {
    // This would return actual icon URLs in a real implementation
    return null;
  };

  const getSentimentIcon = (label) => {
    switch (label) {
      case 'positive':
        return '🟢 ';
      case 'negative':
        return '🔴 ';
      case 'neutral':
        return '⚪ ';
      default:
        return '';
    }
  };

  const highlightConnectedElements = useCallback(
    (node) => {
      if (!cy) return;

      cy.elements().removeClass('highlighted dimmed');

      const connectedEdges = node.connectedEdges();
      const connectedNodes = connectedEdges.connectedNodes();

      node.addClass('highlighted');
      connectedEdges.addClass('highlighted');
      connectedNodes.addClass('highlighted');

      cy.elements()
        .difference(node.union(connectedEdges).union(connectedNodes))
        .addClass('dimmed');
    },
    [cy],
  );

  const highlightEdge = useCallback(
    (edge) => {
      if (!cy) return;

      cy.elements().removeClass('highlighted dimmed');

      const connectedNodes = edge.connectedNodes();

      edge.addClass('highlighted');
      connectedNodes.addClass('highlighted');

      cy.elements().difference(edge.union(connectedNodes)).addClass('dimmed');
    },
    [cy],
  );

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

  const handleLinkElement = (element) => {
    if (element.isNode && element.isNode()) {
      setNewRelConfig({
        active: false,
        sourceId: element.data('id'),
        type: 'RELATED_TO',
        label: '',
      });
      setRelModalOpen(true);
    }
  };

  const handleExploreElement = (element) => {
    if (element.isNode && element.isNode()) {
      setEntityDrawerId(element.data('id'));
      setEntityDrawerOpen(true);
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
        locked: false,
      },
      position: position,
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

  const addSuggestionEdges = (list) => {
    if (!cy) return;
    const toAdd = [];
    list.forEach((s) => {
      const id = `sug:${s.source}:${s.target}`;
      if (!cy.getElementById(id).nonempty()) {
        toAdd.push({
          group: 'edges',
          data: {
            id,
            source: s.source,
            target: s.target,
            label: `SUG(${s.score.toFixed(2)})`,
          },
          classes: 'suggested',
        });
      }
    });
    if (toAdd.length) cy.add(toAdd);
  };

  const onRunSuggestions = async () => {
    try {
      const res = await runSuggest({
        variables: { investigationId: id, topK: 20 },
      });
      const list = res?.data?.suggestLinks || [];
      setSuggestions(list);
      setSuggestionsOpen(true);
      addSuggestionEdges(list);
    } catch (e) {
      console.error(e);
    }
  };

  const acceptSuggestion = async (s) => {
    try {
      await createRel({
        variables: {
          input: {
            sourceId: s.source,
            targetId: s.target,
            type: 'RELATED_TO',
            label: 'SUGGESTED',
            properties: { confidence: s.score },
          },
        },
      });
      const el = cy?.getElementById(`sug:${s.source}:${s.target}`);
      if (el && el.nonempty()) el.remove();
      setSuggestions((prev) =>
        prev.filter((x) => !(x.source === s.source && x.target === s.target)),
      );
    } catch (e) {
      console.error(e);
    }
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
          nodes: cy.nodes().map((n) => n.data()),
          edges: cy.edges().map((e) => e.data()),
        };
        const blob = new Blob([JSON.stringify(data, null, 2)], {
          type: 'application/json',
        });
        const url = URL.createObjectURL(blob);
        const jsonLink = document.createElement('a');
        jsonLink.download = `graph-${Date.now()}.json`;
        jsonLink.href = url;
        jsonLink.click();
        URL.revokeObjectURL(url);
        break;
      case 'csv':
        (async () => {
          try {
            const blob = await ExportAPI.graph('csv');
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = `graph-${Date.now()}.csv`;
            a.click();
            URL.revokeObjectURL(url);
          } catch (e) {
            console.error(e);
          }
        })();
        break;
      case 'pdf':
        (async () => {
          try {
            const blob = await ExportAPI.graph('pdf');
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = `graph-${Date.now()}.pdf`;
            a.click();
            URL.revokeObjectURL(url);
          } catch (e) {
            console.error(e);
          }
        })();
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
    {
      icon: <Add />,
      name: 'Add Node',
      onClick: () => handleAddNodeAtPosition({ x: 100, y: 100 }),
    },
    { icon: <Link />, name: 'Create Edge', onClick: toggleEdgeCreation },
    {
      icon: <PhotoCamera />,
      name: 'Export PNG',
      onClick: () => handleExport('png'),
    },
    {
      icon: <Description />,
      name: 'Export SVG',
      onClick: () => handleExport('svg'),
    },
    {
      icon: <Description />,
      name: 'Export JSON',
      onClick: () => handleExport('json'),
    },
    {
      icon: <Description />,
      name: 'Export CSV',
      onClick: () => handleExport('csv'),
    },
    {
      icon: <Description />,
      name: 'Export PDF',
      onClick: () => handleExport('pdf'),
    },
    { icon: <Refresh />, name: 'Refresh', onClick: handleRefresh },
  ];

  return (
    <Box sx={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
      {/* Header */}
      <Box
        sx={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          mb: 2,
        }}
      >
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
            variant="contained"
            startIcon={<Analytics />}
            onClick={onRunSuggestions}
            disabled={suggesting}
          >
            {suggesting ? 'Suggesting…' : 'AI Suggestions'}
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
        <Chip
          label={`Nodes: ${nodes.length}`}
          color="primary"
          variant="outlined"
        />
        <Chip
          label={`Edges: ${edges.length}`}
          color="secondary"
          variant="outlined"
        />
        <Chip
          label={`Layout: ${currentLayout}`}
          color={loading ? 'default' : 'success'}
          variant="outlined"
        />
        <Chip
          label={`Status: ${loading ? 'Loading...' : 'Ready'}`}
          color={loading ? 'warning' : 'success'}
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
          minHeight: 500,
        }}
        elevation={2}
      >
        <div
          ref={containerRef}
          style={{
            width: '100%',
            height: '100%',
            background: '#fafafa',
          }}
        />

        {/* Timeline controls */}
        <Box
          sx={{
            position: 'absolute',
            top: 16,
            left: 16,
            display: 'flex',
            gap: 1,
            zIndex: 9,
            alignItems: 'center',
          }}
        >
          <TextField
            type="date"
            size="small"
            label="From"
            value={timeFrom}
            onChange={(e) => setTimeFrom(e.target.value)}
          />
          <TextField
            type="date"
            size="small"
            label="To"
            value={timeTo}
            onChange={(e) => setTimeTo(e.target.value)}
          />
          <Button
            size="small"
            variant={playing ? 'outlined' : 'contained'}
            onClick={() => {
              if (!playing) {
                setPlaying(true);
              } else {
                setPlaying(false);
              }
            }}
          >
            {playing ? 'Pause' : 'Play'}
          </Button>
          <TextField
            type="number"
            size="small"
            label="Window (days)"
            value={windowDays}
            onChange={(e) => setWindowDays(parseInt(e.target.value || '30'))}
            sx={{ width: 120 }}
          />
          <TextField
            type="number"
            size="small"
            label="Step (days)"
            value={stepDays}
            onChange={(e) => setStepDays(parseInt(e.target.value || '7'))}
            sx={{ width: 110 }}
          />
          <Slider
            sx={{ width: 200, ml: 1 }}
            min={new Date(domain.start).getTime()}
            max={new Date(domain.end).getTime()}
            step={24 * 3600 * 1000}
            marks={[
              { value: new Date(domain.start).getTime(), label: domain.start },
              { value: new Date(domain.end).getTime(), label: domain.end },
            ]}
            value={new Date(timeFrom).getTime()}
            onChange={(e, v) => {
              const from = new Date(v);
              const to = new Date(
                from.getTime() + windowDays * 24 * 3600 * 1000,
              );
              setTimeFrom(from.toISOString().slice(0, 10));
              setTimeTo(to.toISOString().slice(0, 10));
            }}
          />
        </Box>

        {socket && (
          <Box sx={{ position: 'absolute', top: 16, left: 16, zIndex: 10 }}>
            <PresenceIndicator socket={socket} investigationId={id} />
          </Box>
        )}

        {/* Control Panel */}
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
            <IconButton
              size="small"
              sx={{ bgcolor: 'white' }}
              onClick={handleZoomIn}
            >
              <ZoomIn />
            </IconButton>
          </Tooltip>
          <Tooltip title="Zoom Out">
            <IconButton
              size="small"
              sx={{ bgcolor: 'white' }}
              onClick={handleZoomOut}
            >
              <ZoomOut />
            </IconButton>
          </Tooltip>
          <Tooltip title="Fit to View">
            <IconButton
              size="small"
              sx={{ bgcolor: 'white' }}
              onClick={handleCenter}
            >
              <CenterFocusStrong />
            </IconButton>
          </Tooltip>
          <Tooltip title="Settings">
            <IconButton
              size="small"
              sx={{ bgcolor: 'white' }}
              onClick={() => setSettingsOpen(true)}
            >
              <Settings />
            </IconButton>
          </Tooltip>
        </Box>

        {/* Natural Language Query (compact) */}
        {cy && (
          <Box
            sx={{
              position: 'absolute',
              top: 16,
              left: 80,
              right: 200,
              zIndex: 9,
            }}
          >
            <Paper
              elevation={2}
              sx={{ p: 1 }}
              aria-label="Natural language query"
            >
              <NaturalLanguageQuery cy={cy} />
            </Paper>
          </Box>
        )}

        {/* AI Insights Panel (compact overlay) */}
        {cy && (
          <Box
            sx={{
              position: 'absolute',
              bottom: 16,
              right: 16,
              width: 360,
              maxWidth: '95%',
              zIndex: 9,
            }}
          >
            <Paper
              elevation={4}
              sx={{ maxHeight: 420, overflow: 'auto', p: 1 }}
              aria-label="AI insights panel"
            >
              <AIInsightsPanel
                cy={cy}
                selectedNode={selectedNode}
                investigationId={id}
              />
            </Paper>
          </Box>
        )}

        {/* GEOINT Time Series Panel */}
        <Box sx={{ position: 'absolute', bottom: 16, left: 16, zIndex: 9 }}>
          <GeointTimeSeriesPanel
            intervalMinutes={30}
            onSelectBin={(bin) => {
              // Placeholder linkage: just log; could filter graph by time window when data model is extended
              console.log('Selected GEOINT bin', bin);
            }}
          />
        </Box>

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

        {/* Suggestions Panel */}
        {suggestionsOpen && (
          <Box
            sx={{
              position: 'absolute',
              bottom: 16,
              right: 400,
              width: 340,
              zIndex: 9,
            }}
          >
            <Paper sx={{ p: 1.5, maxHeight: 360, overflow: 'auto' }}>
              <Box
                sx={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                }}
              >
                <Typography variant="subtitle1">AI Link Suggestions</Typography>
                <Box sx={{ display: 'flex', gap: 1 }}>
                  <Button
                    size="small"
                    onClick={async () => {
                      for (const s of suggestions) {
                        try {
                          await acceptSuggestion(s);
                        } catch (e) {
                          console.error(e);
                        }
                      }
                    }}
                  >
                    Accept All
                  </Button>
                  <Button
                    size="small"
                    onClick={() => setSuggestionsOpen(false)}
                  >
                    Close
                  </Button>
                </Box>
              </Box>
              <List dense>
                {suggestions.map((s, idx) => (
                  <ListItem
                    key={`${s.source}-${s.target}-${idx}`}
                    secondaryAction={
                      <Button
                        size="small"
                        variant="outlined"
                        onClick={() => acceptSuggestion(s)}
                      >
                        Accept
                      </Button>
                    }
                  >
                    <ListItemText
                      primary={`${s.source} ↔ ${s.target}`}
                      secondary={`score: ${s.score.toFixed(2)}${s.reason ? ' — ' + s.reason : ''}`}
                    />
                  </ListItem>
                ))}
                {suggestions.length === 0 && (
                  <Typography variant="body2" color="text.secondary">
                    No suggestions
                  </Typography>
                )}
              </List>
            </Paper>
          </Box>
        )}
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

      {/* GEO Map Panel */}
      <Box sx={{ position: 'fixed', bottom: 280, left: 16, zIndex: 9 }}>
        <GeoMapPanel nodes={nodes} />
      </Box>

      {/* Search Panel */}
      <Box sx={{ position: 'fixed', top: 96, right: 16, zIndex: 9 }}>
        <Paper elevation={4}>
          <SearchPanel />
        </Paper>
      </Box>

      {/* Enrichment Panel */}
      {selectedNode && (
        <Box sx={{ position: 'fixed', bottom: 16, left: 400, zIndex: 9 }}>
          <EnrichmentPanel
            entityId={selectedNode.id}
            entityLabel={selectedNode.label}
            investigationId={id}
          />
        </Box>
      )}

      {/* Relationship Editor */}
      {edgeEditor.open && (
        <Box sx={{ position: 'fixed', bottom: 16, right: 400, zIndex: 10 }}>
          <Paper sx={{ p: 1.5, minWidth: 320 }}>
            <Typography variant="subtitle2">Edit Relationship</Typography>
            <TextField
              label="Label"
              size="small"
              fullWidth
              sx={{ mt: 1 }}
              value={edgeEditor.label}
              onChange={(e) =>
                setEdgeEditor({ ...edgeEditor, label: e.target.value })
              }
            />
            <TextField
              label="Confidence"
              size="small"
              type="number"
              inputProps={{ step: 0.1, min: 0, max: 1 }}
              fullWidth
              sx={{ mt: 1 }}
              value={edgeEditor.confidence}
              onChange={(e) =>
                setEdgeEditor({
                  ...edgeEditor,
                  confidence: parseFloat(e.target.value),
                })
              }
            />
            <Box sx={{ display: 'flex', gap: 1, mt: 1 }}>
              <TextField
                label="Valid From"
                type="date"
                size="small"
                value={edgeEditor.validFrom}
                onChange={(e) =>
                  setEdgeEditor({ ...edgeEditor, validFrom: e.target.value })
                }
              />
              <TextField
                label="Valid To"
                type="date"
                size="small"
                value={edgeEditor.validTo}
                onChange={(e) =>
                  setEdgeEditor({ ...edgeEditor, validTo: e.target.value })
                }
              />
            </Box>
            <Box
              sx={{
                display: 'flex',
                gap: 1,
                mt: 1,
                justifyContent: 'flex-end',
              }}
            >
              <Button
                size="small"
                onClick={() => setEdgeEditor({ ...edgeEditor, open: false })}
              >
                Cancel
              </Button>
              <Button
                size="small"
                variant="contained"
                onClick={async () => {
                  try {
                    await updateRel({
                      variables: {
                        id: edgeEditor.id,
                        input: {
                          label: edgeEditor.label,
                          confidence: edgeEditor.confidence,
                          validFrom: edgeEditor.validFrom || null,
                          validTo: edgeEditor.validTo || null,
                        },
                        lastSeen: edgeEditor.updatedAt,
                      },
                    });
                    setEdgeEditor({ ...edgeEditor, open: false });
                  } catch (err) {
                    const server = err?.graphQLErrors?.[0]?.extensions?.server;
                    if (server) {
                      setConflict({
                        id: edgeEditor.id,
                        local: {
                          label: edgeEditor.label,
                          confidence: edgeEditor.confidence,
                          validFrom: edgeEditor.validFrom || null,
                          validTo: edgeEditor.validTo || null,
                        },
                        server,
                      });
                    } else {
                      console.error(err);
                    }
                  }
                }}
              >
                Save
              </Button>
            </Box>
          </Paper>
        </Box>
      )}

      {/* Create Relationship Modal */}
      <RelationshipModal
        open={relModalOpen}
        onClose={() => setRelModalOpen(false)}
        onConfirm={(cfg) => {
          setRelModalOpen(false);
          setNewRelConfig({
            active: true,
            sourceId: newRelConfig.sourceId,
            type: cfg.type,
            label: cfg.label,
            validFrom: cfg.validFrom,
            validTo: cfg.validTo,
            confidence: cfg.confidence,
          });
          if (cyRef.current) {
            const eh = cyRef.current.edgehandles();
            eh.enableDrawMode();
          }
        }}
      />
      <Menu
        open={Boolean(contextMenu)}
        onClose={() => setContextMenu(null)}
        anchorReference="anchorPosition"
        anchorPosition={
          contextMenu
            ? { top: contextMenu.mouseY, left: contextMenu.mouseX }
            : undefined
        }
      >
        <MenuItem
          onClick={() => {
            handleEditElement(contextElement);
            setContextMenu(null);
          }}
        >
          Edit
        </MenuItem>
        <MenuItem
          onClick={() => {
            handleDeleteElement(contextElement);
            setContextMenu(null);
          }}
        >
          Delete
        </MenuItem>
        {contextElement && contextElement.isNode && contextElement.isNode() && (
          <MenuItem
            onClick={() => {
              handleLinkElement(contextElement);
              setContextMenu(null);
            }}
          >
            Link
          </MenuItem>
        )}
        {contextElement && contextElement.isNode && contextElement.isNode() && (
          <MenuItem
            onClick={() => {
              handleExploreElement(contextElement);
              setContextMenu(null);
            }}
          >
            Explore
          </MenuItem>
        )}
      </Menu>
      <EntityDrawer
        entityId={entityDrawerId}
        open={entityDrawerOpen}
        onClose={() => setEntityDrawerOpen(false)}
      />

      {conflict && (
        <ConflictResolutionModal
          open
          local={conflict.local}
          server={conflict.server}
          onCancel={() => setConflict(null)}
          onResolve={async (resolved) => {
            await updateRel({
              variables: {
                id: conflict.id,
                input: resolved,
                lastSeen: conflict.server.updatedAt,
              },
            });
            setConflict(null);
            setEdgeEditor({ ...edgeEditor, open: false });
          }}
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
              <ListItem key={result.id} disablePadding>
                <ListItemButton onClick={() => handleSearchResultClick(result)}>
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
                </ListItemButton>
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
            <ListItemButton onClick={() => handleExport('png')}>
              <ListItemIcon>
                <PhotoCamera />
              </ListItemIcon>
              <ListItemText
                primary="PNG Image"
                secondary="High resolution image"
              />
            </ListItemButton>
            <ListItemButton onClick={() => handleExport('jpg')}>
              <ListItemIcon>
                <PhotoCamera />
              </ListItemIcon>
              <ListItemText primary="JPG Image" secondary="Compressed image" />
            </ListItemButton>
            <ListItemButton onClick={() => handleExport('json')}>
              <ListItemIcon>
                <Description />
              </ListItemIcon>
              <ListItemText
                primary="JSON Data"
                secondary="Graph data structure"
              />
            </ListItemButton>
            <ListItemButton onClick={() => handleExport('csv')}>
              <ListItemIcon>
                <Description />
              </ListItemIcon>
              <ListItemText
                primary="CSV Data"
                secondary="Nodes and edges tables"
              />
            </ListItemButton>
            <ListItemButton onClick={() => handleExport('pdf')}>
              <ListItemIcon>
                <Description />
              </ListItemIcon>
              <ListItemText
                primary="PDF Summary"
                secondary="Printable summary of graph"
              />
            </ListItemButton>
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
                onChange={(e) =>
                  setFilterSettings((prev) => ({
                    ...prev,
                    nodeTypes: e.target.value,
                  }))
                }
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
              onChange={(e, value) =>
                setFilterSettings((prev) => ({ ...prev, importance: value }))
              }
              valueLabelDisplay="auto"
              min={0}
              max={5}
              sx={{ mb: 2 }}
            />

            <FormControlLabel
              control={
                <Switch
                  checked={filterSettings.hideIsolated}
                  onChange={(e) =>
                    setFilterSettings((prev) => ({
                      ...prev,
                      hideIsolated: e.target.checked,
                    }))
                  }
                />
              }
              label="Hide Isolated Nodes"
            />

            <FormControlLabel
              control={
                <Switch
                  checked={filterSettings.showOnlyConnected}
                  onChange={(e) =>
                    setFilterSettings((prev) => ({
                      ...prev,
                      showOnlyConnected: e.target.checked,
                    }))
                  }
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
        <DialogTitle>Edit {editingElement?.type || 'Element'}</DialogTitle>
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
                defaultValue={JSON.stringify(
                  editingElement.properties || {},
                  null,
                  2,
                )}
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

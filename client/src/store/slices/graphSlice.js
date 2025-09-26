import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import { GET_GRAPH_DATA } from '../graphql/graphData.gql.js';
import {
  GET_GRAPH_STYLE_SETTINGS,
  UPDATE_GRAPH_STYLE_SETTINGS,
} from '../../graphql/graphStyleSettings.gql.js';
import client from '../services/apollo.js'; // Import the Apollo Client instance

const DEFAULT_NODE_TYPE_COLORS = {
  person: '#FF5733',
  organization: '#33FF57',
  location: '#3357FF',
  event: '#FF33FF',
  generic: '#888888',
};

const DEFAULT_NODE_SIZE = 48;
const DEFAULT_EDGE_COLOR = '#cccccc';
const DEFAULT_EDGE_WIDTH = 2;

const readStoredStyleSettings = () => {
  if (typeof window === 'undefined' || !window.localStorage) {
    return null;
  }

  try {
    const raw = window.localStorage.getItem('graphStyleSettings');
    if (raw) {
      return JSON.parse(raw);
    }

    const legacyColors = window.localStorage.getItem('graphNodeTypeColors');
    if (legacyColors) {
      return {
        nodeTypeColors: JSON.parse(legacyColors),
      };
    }
  } catch (error) {
    console.warn('Failed to parse stored graph style settings', error);
  }

  return null;
};

const storedStyleSettings = readStoredStyleSettings();

const sanitizeNodeTypeColors = (colors = {}) => {
  return Object.entries(colors).reduce((acc, [type, color]) => {
    if (typeof color === 'string' && color.trim()) {
      acc[type] = color;
    }
    return acc;
  }, {});
};

const clamp = (value, min, max) => Math.min(Math.max(value, min), max);

const initialNodeTypeColors = {
  ...DEFAULT_NODE_TYPE_COLORS,
  ...(storedStyleSettings?.nodeTypeColors
    ? sanitizeNodeTypeColors(storedStyleSettings.nodeTypeColors)
    : {}),
};

const initialNodeSize = clamp(
  typeof storedStyleSettings?.nodeSize === 'number'
    ? storedStyleSettings.nodeSize
    : DEFAULT_NODE_SIZE,
  16,
  160,
);

const initialEdgeColor =
  typeof storedStyleSettings?.edgeColor === 'string' && storedStyleSettings.edgeColor.trim()
    ? storedStyleSettings.edgeColor
    : DEFAULT_EDGE_COLOR;

const initialEdgeWidth = clamp(
  typeof storedStyleSettings?.edgeWidth === 'number'
    ? storedStyleSettings.edgeWidth
    : DEFAULT_EDGE_WIDTH,
  1,
  16,
);

// Async thunk for fetching graph data
export const fetchGraphData = createAsyncThunk(
  'graph/fetchGraphData',
  async ({ investigationId }, { dispatch }) => {
    dispatch(graphSlice.actions.setLoading(true));
    dispatch(graphSlice.actions.setErrorMessage(null));
    try {
      const { data } = await client.query({
        query: GET_GRAPH_DATA,
        variables: { investigationId },
      });
      return data.graphData;
    } catch (error) {
      dispatch(graphSlice.actions.setErrorMessage(error.message));
      throw error;
    } finally {
      dispatch(graphSlice.actions.setLoading(false));
    }
  }
);

export const fetchGraphStyleSettings = createAsyncThunk(
  'graph/fetchGraphStyleSettings',
  async (_, { rejectWithValue }) => {
    try {
      const { data } = await client.query({
        query: GET_GRAPH_STYLE_SETTINGS,
        fetchPolicy: 'network-only',
      });
      return data.graphStyleSettings;
    } catch (error) {
      return rejectWithValue(error.message);
    }
  }
);

export const saveGraphStyleSettings = createAsyncThunk(
  'graph/saveGraphStyleSettings',
  async (settings, { rejectWithValue }) => {
    try {
      const { data } = await client.mutate({
        mutation: UPDATE_GRAPH_STYLE_SETTINGS,
        variables: { input: settings },
        fetchPolicy: 'no-cache',
      });
      return data.updateGraphStyleSettings;
    } catch (error) {
      return rejectWithValue(error.message);
    }
  }
);

const graphSlice = createSlice({
  name: 'graph',
  initialState: {
    nodes: [],
    edges: [],
    selectedNodes: [], // For multi-selection
    selectedEdges: [], // For multi-selection
    selectedNode: null, // For single selection in visualization
    selectedEdge: null, // For single selection in visualization
    layout: localStorage.getItem('graphLayout') || 'cola', // Default layout for visualization
    layoutOptions: JSON.parse(localStorage.getItem('graphLayoutOptions')) || {},
    featureToggles: JSON.parse(localStorage.getItem('graphFeatureToggles')) || {
      smoothTransitions: true,
      edgeHighlighting: true,
      nodeClustering: false,
      incrementalLayout: false, // New feature toggle
    },
    clusters: [], // New state for managing clusters
    searchTerm: '', // New state for search term
    nodeTypeColors: initialNodeTypeColors, // New state for customizable node colors
    nodeSize: initialNodeSize,
    edgeColor: initialEdgeColor,
    edgeWidth: initialEdgeWidth,
    graphStats: { // New state for graph statistics
      numNodes: 0,
      numEdges: 0,
      density: 0,
    },
    history: [], // Array to store past states for undo/redo
    historyPointer: -1, // Pointer to the current state in history
    pathSourceNode: null, // New state for pathfinding source node
    pathTargetNode: null, // New state for pathfinding target node
    foundPath: [], // New state for the found path (array of node/edge IDs)
    isLoading: false, // New state for loading indicator
    errorMessage: null, // New state for error messages
    nodeTypeFilter: [], // New state for node type filter
    minConfidenceFilter: 0, // New state for minimum confidence filter
    status: 'idle', // 'idle' | 'loading' | 'succeeded' | 'failed'
    error: null,
    styleDirty: false,
    styleSettingsStatus: 'idle',
    settingsError: null,
    lastSettingsSavedAt: storedStyleSettings?.updatedAt || null,
  },
  reducers: {
    setGraphData: (state, action) => {
      // Clear future history when a new state is set
      state.history = state.history.slice(0, state.historyPointer + 1);
      state.history.push({
        nodes: action.payload.nodes,
        edges: action.payload.edges,
        clusters: state.clusters, // Include clusters in history
      });
      state.historyPointer++;

      state.nodes = action.payload.nodes;
      state.edges = action.payload.edges;
      // Basic clustering logic: group nodes by type
      if (state.featureToggles.nodeClustering) {
        const nodeTypes = [...new Set(action.payload.nodes.map(node => node.data.type))];
        state.clusters = nodeTypes.map(type => ({
          id: `cluster_${type}`,
          type: type,
          nodes: action.payload.nodes.filter(node => node.data.type === type).map(node => node.data.id),
          isExpanded: true, // Start expanded
        }));
      } else {
        state.clusters = [];
      }
      // Update graph stats
      const numNodes = state.nodes.length;
      const numEdges = state.edges.length;
      const density = numNodes > 1 ? (2 * numEdges) / (numNodes * (numNodes - 1)) : 0;
      state.graphStats = { numNodes, numEdges, density: density.toFixed(2) };
      state.errorMessage = null; // Clear error on successful data set
    },
    addCluster: (state, action) => {
      state.clusters.push(action.payload);
      // Push current state to history
      state.history = state.history.slice(0, state.historyPointer + 1);
      state.history.push({
        nodes: state.nodes,
        edges: state.edges,
        clusters: state.clusters,
      });
      state.historyPointer++;
    },
    removeCluster: (state, action) => {
      state.clusters = state.clusters.filter(cluster => cluster.id !== action.payload);
      // Push current state to history
      state.history = state.history.slice(0, state.historyPointer + 1);
      state.history.push({
        nodes: state.nodes,
        edges: state.edges,
        clusters: state.clusters,
      });
      state.historyPointer++;
    },
    toggleClusterExpansion: (state, action) => {
      const cluster = state.clusters.find(c => c.id === action.payload);
      if (cluster) {
        cluster.isExpanded = !cluster.isExpanded;
      }
      // Push current state to history
      state.history = state.history.slice(0, state.historyPointer + 1);
      state.history.push({
        nodes: state.nodes,
        edges: state.edges,
        clusters: state.clusters,
      });
      state.historyPointer++;
    },
    setSearchTerm: (state, action) => {
      state.searchTerm = action.payload;
    },
    setNodeTypeColor: (state, action) => {
      const { type, color } = action.payload;
      state.nodeTypeColors[type] = color;
      state.styleDirty = true;
    },
    setNodeSize: (state, action) => {
      state.nodeSize = clamp(action.payload, 16, 160);
      state.styleDirty = true;
    },
    setEdgeColor: (state, action) => {
      state.edgeColor = action.payload || DEFAULT_EDGE_COLOR;
      state.styleDirty = true;
    },
    setEdgeWidth: (state, action) => {
      state.edgeWidth = clamp(action.payload, 1, 16);
      state.styleDirty = true;
    },
    resetStyleSettings: (state) => {
      state.nodeTypeColors = { ...DEFAULT_NODE_TYPE_COLORS };
      state.nodeSize = DEFAULT_NODE_SIZE;
      state.edgeColor = DEFAULT_EDGE_COLOR;
      state.edgeWidth = DEFAULT_EDGE_WIDTH;
      state.styleDirty = true;
    },
    addNode: (state, action) => {
      state.nodes.push(action.payload);
      // Update graph stats
      const numNodes = state.nodes.length;
      const numEdges = state.edges.length;
      const density = numNodes > 1 ? (2 * numEdges) / (numNodes * (numNodes - 1)) : 0;
      state.graphStats = { numNodes, numEdges, density: density.toFixed(2) };
      // Push current state to history
      state.history = state.history.slice(0, state.historyPointer + 1);
      state.history.push({
        nodes: state.nodes,
        edges: state.edges,
        clusters: state.clusters,
      });
      state.historyPointer++;
    },
    addEdge: (state, action) => {
      state.edges.push(action.payload);
      // Update graph stats
      const numNodes = state.nodes.length;
      const numEdges = state.edges.length;
      const density = numNodes > 1 ? (2 * numEdges) / (numNodes * (numNodes - 1)) : 0;
      state.graphStats = { numNodes, numEdges, density: density.toFixed(2) };
      // Push current state to history
      state.history = state.history.slice(0, state.historyPointer + 1);
      state.history.push({
        nodes: state.nodes,
        edges: state.edges,
        clusters: state.clusters,
      });
      state.historyPointer++;
    },
    updateNode: (state, action) => {
      const index = state.nodes.findIndex(node => node.id === action.payload.id);
      if (index !== -1) {
        state.nodes[index] = { ...state.nodes[index], ...action.payload };
      }
      // Push current state to history
      state.history = state.history.slice(0, state.historyPointer + 1);
      state.history.push({
        nodes: state.nodes,
        edges: state.edges,
        clusters: state.clusters,
      });
      state.historyPointer++;
    },
    deleteNode: (state, action) => {
      state.nodes = state.nodes.filter(node => node.id !== action.payload);
      state.edges = state.edges.filter(edge => edge.source !== action.payload && edge.target !== action.payload);
      state.selectedNodes = state.selectedNodes.filter(id => id !== action.payload);
      if (state.selectedNode === action.payload) {
        state.selectedNode = null;
      }
      // Update graph stats
      const numNodes = state.nodes.length;
      const numEdges = state.edges.length;
      const density = numNodes > 1 ? (2 * numEdges) / (numNodes * (numNodes - 1)) : 0;
      state.graphStats = { numNodes, numEdges, density: density.toFixed(2) };
      // Push current state to history
      state.history = state.history.slice(0, state.historyPointer + 1);
      state.history.push({
        nodes: state.nodes,
        edges: state.edges,
        clusters: state.clusters,
      });
      state.historyPointer++;
    },
    deleteEdge: (state, action) => {
      state.edges = state.edges.filter(edge => edge.id !== action.payload);
      state.selectedEdges = state.selectedEdges.filter(id => id !== action.payload);
      if (state.selectedEdge === action.payload) {
        state.selectedEdge = null;
      }
      // Update graph stats
      const numNodes = state.nodes.length;
      const numEdges = state.edges.length;
      const density = numNodes > 1 ? (2 * numEdges) / (numNodes * (numNodes - 1)) : 0;
      state.graphStats = { numNodes, numEdges, density: density.toFixed(2) };
      // Push current state to history
      state.history = state.history.slice(0, state.historyPointer + 1);
      state.history.push({
        nodes: state.nodes,
        edges: state.edges,
        clusters: state.clusters,
      });
      state.historyPointer++;
    },
    setSelectedNodes: (state, action) => {
      state.selectedNodes = action.payload;
    },
    setSelectedEdges: (state, action) => {
      state.selectedEdges = action.payload;
    },
    setSelectedNode: (state, action) => {
      state.selectedNode = action.payload;
      state.selectedEdge = null; // Deselect edge when a node is selected
    },
    setSelectedEdge: (state, action) => {
      state.selectedEdge = action.payload;
      state.selectedNode = null; // Deselect node when an edge is selected
    },
    setLayout: (state, action) => {
      state.layout = action.payload.name;
      state.layoutOptions = action.payload.options || {};
    },
    toggleFeature: (state, action) => {
      const { featureName, enabled } = action.payload;
      if (state.featureToggles.hasOwnProperty(featureName)) {
        state.featureToggles[featureName] = enabled;
      }
    },
    undo: (state) => {
      if (state.historyPointer > 0) {
        state.historyPointer--;
        const prevState = state.history[state.historyPointer];
        state.nodes = prevState.nodes;
        state.edges = prevState.edges;
        state.clusters = prevState.clusters;
        // Recalculate stats for the restored state
        const numNodes = state.nodes.length;
        const numEdges = state.edges.length;
        const density = numNodes > 1 ? (2 * numEdges) / (numNodes * (numNodes - 1)) : 0;
        state.graphStats = { numNodes, numEdges, density: density.toFixed(2) };
      }
    },
    redo: (state) => {
      if (state.historyPointer < state.history.length - 1) {
        state.historyPointer++;
        const nextState = state.history[state.historyPointer];
        state.nodes = nextState.nodes;
        state.edges = nextState.edges;
        state.clusters = nextState.clusters;
        // Recalculate stats for the restored state
        const numNodes = state.nodes.length;
        const numEdges = state.edges.length;
        const density = numNodes > 1 ? (2 * numEdges) / (numNodes * (numNodes - 1)) : 0;
        state.graphStats = { numNodes, numEdges, density: density.toFixed(2) };
      }
    },
    removeNode: (state, action) => {
      state.nodes = state.nodes.filter(node => node.id !== action.payload);
      state.edges = state.edges.filter(edge => edge.source !== action.payload && edge.target !== action.payload);
      // Update graph stats
      const numNodes = state.nodes.length;
      const numEdges = state.edges.length;
      const density = numNodes > 1 ? (2 * numEdges) / (numNodes * (numNodes - 1)) : 0;
      state.graphStats = { numNodes, numEdges, density: density.toFixed(2) };
      // Push current state to history
      state.history = state.history.slice(0, state.historyPointer + 1);
      state.history.push({
        nodes: state.nodes,
        edges: state.edges,
        clusters: state.clusters,
      });
      state.historyPointer++;
    },
    removeEdge: (state, action) => {
      state.edges = state.edges.filter(edge => edge.id !== action.payload);
      // Update graph stats
      const numNodes = state.nodes.length;
      const numEdges = state.edges.length;
      const density = numNodes > 1 ? (2 * numEdges) / (numNodes * (numNodes - 1)) : 0;
      state.graphStats = { numNodes, numEdges, density: density.toFixed(2) };
      // Push current state to history
      state.history = state.history.slice(0, state.historyPointer + 1);
      state.history.push({
        nodes: state.nodes,
        edges: state.edges,
        clusters: state.clusters,
      });
      state.historyPointer++;
    },
    setPathSourceNode: (state, action) => {
      state.pathSourceNode = action.payload;
    },
    setPathTargetNode: (state, action) => {
      state.pathTargetNode = action.payload;
    },
    setFoundPath: (state, action) => {
      state.foundPath = action.payload;
    },
    setLoading: (state, action) => {
      state.isLoading = action.payload;
    },
    setErrorMessage: (state, action) => {
      state.errorMessage = action.payload;
    },
    setNodeTypeFilter: (state, action) => {
      state.nodeTypeFilter = action.payload;
    },
    setMinConfidenceFilter: (state, action) => {
      state.minConfidenceFilter = action.payload;
    },
  },
  extraReducers: (builder) => {
    builder
      .addCase(fetchGraphStyleSettings.pending, (state) => {
        state.styleSettingsStatus = 'loading';
        state.settingsError = null;
      })
      .addCase(fetchGraphStyleSettings.fulfilled, (state, action) => {
        state.nodeTypeColors = {
          ...DEFAULT_NODE_TYPE_COLORS,
          ...sanitizeNodeTypeColors(action.payload.nodeTypeColors || {}),
        };
        state.nodeSize = clamp(action.payload.nodeSize ?? DEFAULT_NODE_SIZE, 16, 160);
        state.edgeColor = action.payload.edgeColor || DEFAULT_EDGE_COLOR;
        state.edgeWidth = clamp(action.payload.edgeWidth ?? DEFAULT_EDGE_WIDTH, 1, 16);
        state.styleSettingsStatus = 'succeeded';
        state.styleDirty = false;
        state.settingsError = null;
        state.lastSettingsSavedAt = action.payload.updatedAt || new Date().toISOString();
      })
      .addCase(fetchGraphStyleSettings.rejected, (state, action) => {
        state.styleSettingsStatus = 'failed';
        state.settingsError = action.payload || action.error?.message || 'Failed to load style settings';
        state.errorMessage = state.settingsError;
      })
      .addCase(saveGraphStyleSettings.pending, (state) => {
        state.styleSettingsStatus = 'saving';
        state.settingsError = null;
      })
      .addCase(saveGraphStyleSettings.fulfilled, (state, action) => {
        state.nodeTypeColors = {
          ...DEFAULT_NODE_TYPE_COLORS,
          ...sanitizeNodeTypeColors(action.payload.nodeTypeColors || {}),
        };
        state.nodeSize = clamp(action.payload.nodeSize ?? state.nodeSize, 16, 160);
        state.edgeColor = action.payload.edgeColor || DEFAULT_EDGE_COLOR;
        state.edgeWidth = clamp(action.payload.edgeWidth ?? state.edgeWidth, 1, 16);
        state.styleSettingsStatus = 'succeeded';
        state.styleDirty = false;
        state.settingsError = null;
        state.lastSettingsSavedAt = action.payload.updatedAt || new Date().toISOString();
      })
      .addCase(saveGraphStyleSettings.rejected, (state, action) => {
        state.styleSettingsStatus = 'failed';
        state.settingsError = action.payload || action.error?.message || 'Failed to save style settings';
        state.errorMessage = state.settingsError;
      });
  },
});

export const {
  setGraphData,
  addCluster,
  removeCluster,
  toggleClusterExpansion,
  setSearchTerm,
  setNodeTypeColor,
  setNodeSize,
  setEdgeColor,
  setEdgeWidth,
  resetStyleSettings,
  addNode,
  addEdge,
  updateNode,
  deleteNode,
  deleteEdge,
  setSelectedNodes,
  setSelectedEdges,
  setSelectedNode,
  setSelectedEdge,
  setLayout,
  toggleFeature,
  undo,
  redo,
  removeNode,
  removeEdge,
  setPathSourceNode,
  setPathTargetNode,
  setFoundPath,
  setLoading,
  setErrorMessage,
  setNodeTypeFilter,
  setMinConfidenceFilter,
} = graphSlice.actions;

export default graphSlice.reducer;

import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';

// Async thunk for fetching graph data (mock data for now)
export const fetchGraphData = createAsyncThunk(
  'graph/fetchGraphData',
  async () => {
    // Simulate API call returning data in a GraphQL-like structure
    return new Promise(resolve => {
      setTimeout(() => {
        resolve({
          data: {
            nodes: [
              { id: 'nodeA', label: 'Node A', type: 'person' },
              { id: 'nodeB', label: 'Node B', type: 'organization' },
              { id: 'nodeC', label: 'Node C', type: 'location' },
              { id: 'nodeD', label: 'Node D', type: 'event' },
              { id: 'nodeE', label: 'Node E', type: 'person' },
            ],
            edges: [
              { id: 'edge1', source: 'nodeA', target: 'nodeB', label: 'works_at' },
              { id: 'edge2', source: 'nodeB', target: 'nodeC', label: 'located_in' },
              { id: 'edge3', source: 'nodeA', target: 'nodeD', label: 'attended' },
              { id: 'edge4', source: 'nodeE', target: 'nodeA', label: 'reports_to' },
            ],
          },
        });
      }, 1000);
    });
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
    layout: 'cose', // Default layout for visualization
    layoutOptions: {},
    featureToggles: {
      smoothTransitions: true,
      edgeHighlighting: true,
      nodeClustering: false,
      incrementalLayout: false, // New feature toggle
    },
    clusters: [], // New state for managing clusters
    searchTerm: '', // New state for search term
    status: 'idle', // 'idle' | 'loading' | 'succeeded' | 'failed'
    error: null,
    nodeTypeColors: { // New state for customizable node colors
      person: '#FF5733',
      organization: '#33FF57',
      location: '#3357FF',
      event: '#FF33FF',
      generic: '#888888',
    },
  },
  reducers: {
    setGraphData: (state, action) => {
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
    },
    addCluster: (state, action) => {
      state.clusters.push(action.payload);
    },
    removeCluster: (state, action) => {
      state.clusters = state.clusters.filter(cluster => cluster.id !== action.payload);
    },
    toggleClusterExpansion: (state, action) => {
      const cluster = state.clusters.find(c => c.id === action.payload);
      if (cluster) {
        cluster.isExpanded = !cluster.isExpanded;
      }
    },
    setSearchTerm: (state, action) => {
      state.searchTerm = action.payload;
    },
    setNodeTypeColor: (state, action) => {
      const { type, color } = action.payload;
      state.nodeTypeColors[type] = color;
    },
    addNode: (state, action) => {
      state.nodes.push(action.payload);
    },
    addEdge: (state, action) => {
      state.edges.push(action.payload);
    },
    updateNode: (state, action) => {
      const index = state.nodes.findIndex(node => node.id === action.payload.id);
      if (index !== -1) {
        state.nodes[index] = { ...state.nodes[index], ...action.payload };
      }
    },
    deleteNode: (state, action) => {
      state.nodes = state.nodes.filter(node => node.id !== action.payload);
      state.edges = state.edges.filter(edge => edge.source !== action.payload && edge.target !== action.payload);
      state.selectedNodes = state.selectedNodes.filter(id => id !== action.payload);
      if (state.selectedNode === action.payload) {
        state.selectedNode = null;
      }
    },
    deleteEdge: (state, action) => {
      state.edges = state.edges.filter(edge => edge.id !== action.payload);
      state.selectedEdges = state.selectedEdges.filter(id => id !== action.payload);
      if (state.selectedEdge === action.payload) {
        state.selectedEdge = null;
      }
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
    removeNode: (state, action) => {
      state.nodes = state.nodes.filter(node => node.id !== action.payload);
      state.edges = state.edges.filter(edge => edge.source !== action.payload && edge.target !== action.payload);
    },
    removeEdge: (state, action) => {
      state.edges = state.edges.filter(edge => edge.id !== action.payload);
    },
  },
  extraReducers: (builder) => {
    builder
      .addCase(fetchGraphData.pending, (state) => {
        state.status = 'loading';
      })
      .addCase(fetchGraphData.fulfilled, (state, action) => {
        state.status = 'succeeded';
        state.nodes = action.payload.nodes;
        state.edges = action.payload.edges;
      })
      .addCase(fetchGraphData.rejected, (state, action) => {
        state.status = 'failed';
        state.error = action.error.message;
      });
  },
});

export const { 
  setGraphData, 
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
  addCluster,
  removeCluster,
  toggleClusterExpansion,
  setSearchTerm, // New action
  setNodeTypeColor, // New action
  removeNode, 
  removeEdge 
} = graphSlice.actions;

export default graphSlice.reducer;
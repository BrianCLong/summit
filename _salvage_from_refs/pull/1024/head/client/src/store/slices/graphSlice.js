import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';

// Async thunk for fetching graph data (mock data for now)
export const fetchGraphData = createAsyncThunk(
  'graph/fetchGraphData',
  async () => {
    // Simulate API call
    return new Promise(resolve => {
      setTimeout(() => {
        resolve({
          nodes: [
            { id: 'nodeA', label: 'Node A', type: 'person' },
            { id: 'nodeB', label: 'Node B', type: 'organization' },
            { id: 'nodeC', label: 'Node C', type: 'location' },
            { id: 'nodeD', label: 'Node D', type: 'event' },
          ],
          edges: [
            { id: 'edge1', source: 'nodeA', target: 'nodeB', label: 'works_at' },
            { id: 'edge2', source: 'nodeB', target: 'nodeC', label: 'located_in' },
            { id: 'edge3', source: 'nodeA', target: 'nodeD', label: 'attended' },
          ],
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
    selectedNodes: [],
    selectedEdges: [],
    status: 'idle', // 'idle' | 'loading' | 'succeeded' | 'failed'
    error: null,
  },
  reducers: {
    setGraphData: (state, action) => {
      state.nodes = action.payload.nodes;
      state.edges = action.payload.edges;
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
    },
    deleteEdge: (state, action) => {
      state.edges = state.edges.filter(edge => edge.id !== action.payload);
      state.selectedEdges = state.selectedEdges.filter(id => id !== action.payload);
    },
    setSelectedNodes: (state, action) => {
      state.selectedNodes = action.payload;
    },
    setSelectedEdges: (state, action) => {
      state.selectedEdges = action.payload;
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
  removeNode, 
  removeEdge 
} = graphSlice.actions;

export default graphSlice.reducer;
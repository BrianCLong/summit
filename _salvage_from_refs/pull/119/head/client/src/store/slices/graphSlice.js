import { createSlice } from '@reduxjs/toolkit';

const initialState = {
  nodes: [],
  edges: [],
  selectedNodes: [],
  selectedEdges: [],
  layout: {
    name: 'fcose',
    options: {
      animate: true,
      animationDuration: 1000,
      fit: true,
      padding: 50,
    }
  },
  loading: false,
  error: null,
};

const graphSlice = createSlice({
  name: 'graph',
  initialState,
  reducers: {
    setGraphData: (state, action) => {
      state.nodes = action.payload.nodes || [];
      state.edges = action.payload.edges || [];
    },
    addNode: (state, action) => {
      state.nodes.push(action.payload);
    },
    addEdge: (state, action) => {
      state.edges.push(action.payload);
    },
    updateNode: (state, action) => {
      const { id, ...changes } = action.payload || {};
      const idx = state.nodes.findIndex((n) => (n.data?.id || n.id) === id);
      if (idx !== -1) {
        const node = state.nodes[idx];
        const data = node.data || node;
        const updated = { ...data, ...changes };
        state.nodes[idx] = node.data ? { ...node, data: updated } : updated;
      }
    },
    deleteNode: (state, action) => {
      const id = action.payload;
      state.nodes = state.nodes.filter((n) => (n.data?.id || n.id) !== id);
      state.edges = state.edges.filter((e) => (e.data?.source || e.source) !== id && (e.data?.target || e.target) !== id);
    },
    deleteEdge: (state, action) => {
      const id = action.payload;
      state.edges = state.edges.filter((e) => (e.data?.id || e.id) !== id);
    },
    setSelectedNodes: (state, action) => {
      state.selectedNodes = action.payload;
    },
    setSelectedEdges: (state, action) => {
      state.selectedEdges = action.payload;
    },
    clearGraph: (state) => {
      state.nodes = [];
      state.edges = [];
      state.selectedNodes = [];
      state.selectedEdges = [];
    },
  },
});

export const {
  setGraphData,
  addNode,
  addEdge,
  setSelectedNodes,
  setSelectedEdges,
  clearGraph,
  updateNode,
  deleteNode,
  deleteEdge,
} = graphSlice.actions;

export default graphSlice.reducer;

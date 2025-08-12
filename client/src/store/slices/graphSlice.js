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
} = graphSlice.actions;

export default graphSlice.reducer;

import { createSlice } from '@reduxjs/toolkit';

const graphUISlice = createSlice({
  name: 'graphUI',
  initialState: {
    selectedNodeId: null,
    selectedEdgeId: null,
    zoomLevel: 1,
    panPosition: { x: 0, y: 0 },
    // Add other UI-related states as needed
  },
  reducers: {
    setSelectedNode: (state, action) => {
      state.selectedNodeId = action.payload;
      state.selectedEdgeId = null; // Deselect edge when node is selected
    },
    setSelectedEdge: (state, action) => {
      state.selectedEdgeId = action.payload;
      state.selectedNodeId = null; // Deselect node when edge is selected
    },
    clearSelection: (state) => {
      state.selectedNodeId = null;
      state.selectedEdgeId = null;
    },
    setZoomLevel: (state, action) => {
      state.zoomLevel = action.payload;
    },
    setPanPosition: (state, action) => {
      state.panPosition = action.payload;
    },
  },
});

export const {
  setSelectedNode,
  setSelectedEdge,
  clearSelection,
  setZoomLevel,
  setPanPosition,
} = graphUISlice.actions;

export default graphUISlice.reducer;

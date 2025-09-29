import { createSlice } from '@reduxjs/toolkit';

const initialState = {
  selectedNodeId: null,
  selectedEdgeId: null,
  contextMenu: { open: false, x: 0, y: 0, targetType: null, targetId: null },
  aiInsights: {},
};

const slice = createSlice({
  name: 'graphInteraction',
  initialState,
  reducers: {
    selectNode(state, action) {
      state.selectedNodeId = action.payload;
      state.selectedEdgeId = null;
    },
    selectEdge(state, action) {
      state.selectedEdgeId = action.payload;
      state.selectedNodeId = null;
    },
    clearSelection(state) {
      state.selectedNodeId = null;
      state.selectedEdgeId = null;
    },
    contextMenuOpen(state, action) {
      state.contextMenu = { open: true, ...action.payload };
    },
    contextMenuClose(state) {
      state.contextMenu = { open: false, x: 0, y: 0, targetType: null, targetId: null };
    },
    insightReceived(state, action) {
      const { entityId, data } = action.payload;
      state.aiInsights[entityId] = { ...data, updatedAt: new Date().toISOString() };
    },
  },
});

export const graphInteractionActions = slice.actions;
export default slice.reducer;


import { createSlice } from '@reduxjs/toolkit';

const aiInsightsSlice = createSlice({
  name: 'aiInsights',
  initialState: {
    panelOpen: false,
    highlight: false,
    popovers: false,
  },
  reducers: {
    togglePanel(state) {
      state.panelOpen = !state.panelOpen;
    },
    setPanelOpen(state, action) {
      state.panelOpen = action.payload;
    },
    toggleHighlight(state) {
      state.highlight = !state.highlight;
    },
    togglePopovers(state) {
      state.popovers = !state.popovers;
    },
  },
});

export const { togglePanel, setPanelOpen, toggleHighlight, togglePopovers } = aiInsightsSlice.actions;

export default aiInsightsSlice.reducer;

import { createSlice } from "@reduxjs/toolkit";

const initialState = {
  highlightEnabled: false,
  selectedInsightType: "", // e.g., 'community_detection', 'link_prediction'
  communityIdFilter: [0, 100], // Range for community IDs
  communityData: {}, // Stores community detection results: { nodeId: communityId, ... }
};

const aiInsightsSlice = createSlice({
  name: "aiInsights",
  initialState,
  reducers: {
    setHighlightEnabled: (state, action) => {
      state.highlightEnabled = action.payload;
    },
    setSelectedInsightType: (state, action) => {
      state.selectedInsightType = action.payload;
    },
    setCommunityIdFilter: (state, action) => {
      state.communityIdFilter = action.payload;
    },
    setCommunityData: (state, action) => {
      state.communityData = action.payload;
    },
    // Add more reducers for other AI insight related state changes
  },
});

export const {
  setHighlightEnabled,
  setSelectedInsightType,
  setCommunityIdFilter,
  setCommunityData,
} = aiInsightsSlice.actions;

export default aiInsightsSlice.reducer;

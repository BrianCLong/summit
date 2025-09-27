import { configureStore } from '@reduxjs/toolkit';
import authSlice from './slices/authSlice';
import graphSlice from './slices/graphSlice';
import uiSlice from './slices/uiSlice';
import graphInteraction from './slices/graphInteractionSlice';
import graphUISlice from './slices/graphUISlice'; // Import the new graphUISlice
import aiInsightsReducer from './slices/aiInsightsSlice'; // Import the new aiInsightsSlice

export const store = configureStore({
  reducer: {
    auth: authSlice,
    graph: graphSlice,
    ui: uiSlice,
    graphInteraction,
    graphUI: graphUISlice, // Add the new graphUISlice
    aiInsights: aiInsightsReducer, // Add the new aiInsightsReducer
  },
  middleware: (getDefaultMiddleware) =>
    getDefaultMiddleware({
      serializableCheck: {
        ignoredActions: ['persist/PERSIST'],
      },
    }),
});

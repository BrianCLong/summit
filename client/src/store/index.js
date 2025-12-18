import { configureStore } from '@reduxjs/toolkit';
import authSlice from './slices/authSlice';
import * as graphSliceModule from './slices/graphSlice';
const graphSlice = graphSliceModule.default || graphSliceModule;
import uiSlice from './slices/uiSlice';
import graphInteraction from './slices/graphInteractionSlice';
import graphUISlice from './slices/graphUISlice';
import aiInsightsReducer from './slices/aiInsightsSlice';
import timelineReducer from './slices/timelineSlice';
import graphData from './graphSlice';
import socket from './socketSlice';

export const store = configureStore({
  reducer: {
    auth: authSlice,
    graph: graphSlice,
    timeline: timelineReducer,
    ui: uiSlice,
    graphInteraction,
    graphUI: graphUISlice,
    aiInsights: aiInsightsReducer,
    graphData,
    socket,
  },
  middleware: (getDefaultMiddleware) =>
    getDefaultMiddleware({
      serializableCheck: {
        ignoredActions: ['persist/PERSIST'],
      },
    }),
});

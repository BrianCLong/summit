import { configureStore } from '@reduxjs/toolkit';
import authSlice from './slices/authSlice';
import graphSlice from './slices/graphSlice';
import uiSlice from './slices/uiSlice';
import graphInteraction from './slices/graphInteractionSlice';

export const store = configureStore({
  reducer: {
    auth: authSlice,
    graph: graphSlice,
    ui: uiSlice,
    graphInteraction,
  },
  middleware: (getDefaultMiddleware) =>
    getDefaultMiddleware({
      serializableCheck: {
        ignoredActions: ['persist/PERSIST'],
      },
    }),
});

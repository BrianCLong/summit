import { configureStore } from '@reduxjs/toolkit';
import { TypedUseSelectorHook, useDispatch, useSelector } from 'react-redux';
import ui from './slices/ui';
import dashboard from './slices/dashboard';

const store = configureStore({
  reducer: { ui, dashboard },
});

export type RootState = ReturnType<typeof store.getState>;
export type AppDispatch = typeof store.dispatch;
export const useAppDispatch: () => AppDispatch = useDispatch as any;
export const useAppSelector: TypedUseSelectorHook<RootState> = useSelector;

export default store;

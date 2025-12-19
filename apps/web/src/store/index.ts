import { configureStore } from '@reduxjs/toolkit'
import focusReducer from '../features/focusMode/focusSlice'
import historyReducer from '../features/history/historySlice'
import explainReducer from '../features/explain/explainSlice'
import uiReducer from '../features/ui/uiSlice'
import { historyMiddleware } from '../features/history/historyMiddleware'
import { enablePatches } from 'immer'

enablePatches()

export const store = configureStore({
  reducer: {
    focus: focusReducer,
    history: historyReducer,
    explain: explainReducer,
    ui: uiReducer,
  },
  middleware: gDM => gDM().concat(historyMiddleware),
})
export type RootState = ReturnType<typeof store.getState>
export type AppDispatch = typeof store.dispatch

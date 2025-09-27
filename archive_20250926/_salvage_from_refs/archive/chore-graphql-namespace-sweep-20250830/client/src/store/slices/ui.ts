import { createSlice, PayloadAction } from '@reduxjs/toolkit';

export type UIState = {
  tenant: string;
  status: string;
  operation: string;
};

const initialState: UIState = {
  tenant: 'all',
  status: 'all',
  operation: 'all',
};

const uiSlice = createSlice({
  name: 'ui',
  initialState,
  reducers: {
    setTenant(state, action: PayloadAction<string>) { state.tenant = action.payload; },
    setStatus(state, action: PayloadAction<string>) { state.status = action.payload; },
    setOperation(state, action: PayloadAction<string>) { state.operation = action.payload; },
  },
});

export const { setTenant, setStatus, setOperation } = uiSlice.actions;
export default uiSlice.reducer;


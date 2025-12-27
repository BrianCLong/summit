import { createSlice, PayloadAction } from '@reduxjs/toolkit';
import type { AgentEvent, AgentStatus, SharedState } from './agentTypes';

type RunState = {
  threadId?: string;
  status: AgentStatus;
  events: AgentEvent[];
  shared: SharedState | null;
};

const initialState: RunState = {
  status: 'idle',
  events: [],
  shared: null,
};

const slice = createSlice({
  name: 'agentRun',
  initialState,
  reducers: {
    setThreadId(state, action: PayloadAction<string>) {
      state.threadId = action.payload;
    },
    setStatus(state, action: PayloadAction<AgentStatus>) {
      state.status = action.payload;
    },
    pushEvent(state, action: PayloadAction<AgentEvent>) {
      state.events.push(action.payload);
    },
    setShared(state, action: PayloadAction<SharedState | null>) {
      state.shared = action.payload;
    },
    resetAgentRun(state) {
      state.threadId = undefined;
      state.status = 'idle';
      state.events = [];
      state.shared = null;
    },
  },
});

export const { setThreadId, setStatus, pushEvent, setShared, resetAgentRun } =
  slice.actions;
export default slice.reducer;

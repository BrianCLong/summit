import { createSlice } from "@reduxjs/toolkit";

export interface SocketState {
  connected: boolean;
}

const initialState: SocketState = {
  connected: false,
};

const socketSlice = createSlice({
  name: "socket",
  initialState,
  reducers: {
    connected(state) {
      state.connected = true;
    },
    disconnected(state) {
      state.connected = false;
    },
  },
});

export const { connected, disconnected } = socketSlice.actions;
export default socketSlice.reducer;

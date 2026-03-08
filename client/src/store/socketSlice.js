"use strict";
var _a;
Object.defineProperty(exports, "__esModule", { value: true });
exports.disconnected = exports.connected = void 0;
const toolkit_1 = require("@reduxjs/toolkit");
const initialState = {
    connected: false,
};
const socketSlice = (0, toolkit_1.createSlice)({
    name: 'socket',
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
_a = socketSlice.actions, exports.connected = _a.connected, exports.disconnected = _a.disconnected;
exports.default = socketSlice.reducer;

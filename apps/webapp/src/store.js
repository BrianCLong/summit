"use strict";
var _a;
Object.defineProperty(exports, "__esModule", { value: true });
exports.store = exports.setTimeRange = exports.selectNode = void 0;
const toolkit_1 = require("@reduxjs/toolkit");
const initialState = { selectedNodeId: null, timeRange: null };
const selectionSlice = (0, toolkit_1.createSlice)({
    name: 'selection',
    initialState,
    reducers: {
        selectNode(state, action) {
            state.selectedNodeId = action.payload;
        },
        setTimeRange(state, action) {
            state.timeRange = action.payload;
        },
    },
});
_a = selectionSlice.actions, exports.selectNode = _a.selectNode, exports.setTimeRange = _a.setTimeRange;
exports.store = (0, toolkit_1.configureStore)({
    reducer: { selection: selectionSlice.reducer },
});

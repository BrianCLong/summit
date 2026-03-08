"use strict";
var _a;
Object.defineProperty(exports, "__esModule", { value: true });
exports.reset = exports.addEdge = exports.addNode = void 0;
const toolkit_1 = require("@reduxjs/toolkit");
const initialState = {
    nodes: [],
    edges: [],
};
const graphSlice = (0, toolkit_1.createSlice)({
    name: 'graphData',
    initialState,
    reducers: {
        addNode(state, action) {
            state.nodes.push(action.payload);
        },
        addEdge(state, action) {
            state.edges.push(action.payload);
        },
        reset(state) {
            state.nodes = [];
            state.edges = [];
        },
    },
});
_a = graphSlice.actions, exports.addNode = _a.addNode, exports.addEdge = _a.addEdge, exports.reset = _a.reset;
exports.default = graphSlice.reducer;

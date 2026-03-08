"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.fetchGraph = fetchGraph;
require("../types/testing");
const mockGraph = {
    nodes: [
        { id: 'a', label: 'A', timestamp: 1710000000000, coords: [-122.4, 37.8] },
        { id: 'b', label: 'B', timestamp: 1710003600000, coords: [-73.9, 40.7] },
        { id: 'c', label: 'C', timestamp: 1710007200000, coords: [2.35, 48.85] },
    ],
    edges: [
        { id: 'ab', source: 'a', target: 'b' },
        { id: 'bc', source: 'b', target: 'c' },
    ],
};
async function fetchGraph() {
    if (typeof window !== 'undefined' && window.__E2E_GRAPH__) {
        return window.__E2E_GRAPH__;
    }
    return Promise.resolve(mockGraph);
}

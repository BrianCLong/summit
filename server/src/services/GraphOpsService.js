"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.expandNeighbors = expandNeighbors;
exports.expandNeighborhood = expandNeighborhood;
async function expandNeighbors(entityId, _hops = 1, _context = {}) {
    return { nodes: [{ id: entityId }], edges: [] };
}
async function expandNeighborhood(entityId, _hops = 2, _context = {}) {
    return { nodes: [{ id: entityId }], edges: [] };
}

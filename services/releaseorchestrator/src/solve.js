"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.topoOrder = topoOrder;
function topoOrder(nodes) {
    const indeg = {}, adj, {};
    nodes.forEach(n => { indeg[n.name] = indeg[n.name] || 0; n.deps.forEach(d => { (adj[d] = adj[d] || []).push(n.name); indeg[n.name] = (indeg[n.name] || 0) + 1; }); });
    const q = Object.keys(indeg).filter(k => !indeg[k]);
    const out = [];
    while (q.length) {
        const u = q.shift();
        out.push(u);
        (adj[u] || []).forEach(v => { if (--indeg[v] === 0)
            q.push(v); });
    }
    return out;
}

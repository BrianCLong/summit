"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const fs_1 = __importDefault(require("fs"));
const g = JSON.parse(JSON.stringify(require('js-yaml').load(fs_1.default.readFileSync('.maestro/xrepo.yaml', 'utf8')))).graph;
function topo(g) {
    const indeg = {}, adj = {};
    Object.keys(g).forEach((k) => {
        indeg[k] = indeg[k] || 0;
        g[k].forEach((d) => {
            (adj[d] = adj[d] || []).push(k);
            indeg[k] = (indeg[k] || 0) + 1;
        });
    });
    const q = Object.keys(indeg).filter((k) => !indeg[k]);
    const out = [];
    while (q.length) {
        const u = q.shift();
        out.push(u);
        (adj[u] || []).forEach((v) => {
            if (--indeg[v] === 0)
                q.push(v);
        });
    }
    return out;
}
const order = topo(g);
const include = order.map((repo) => ({
    repo,
    ref: 'candidate',
    tasks: ['build', 'test'],
}));
process.stdout.write(JSON.stringify({ include }));

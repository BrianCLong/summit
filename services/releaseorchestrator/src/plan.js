"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.planRelease = planRelease;
const graph_1 = require("./graph");
const solve_1 = require("./solve");
function planRelease(changed) {
    const g = (0, graph_1.buildGraph)();
    const order = (0, solve_1.topoOrder)(g);
    const affected = new Set(changed);
    // bubble dependents
    let added = true;
    while (added) {
        added = false;
        for (const n of g) {
            if (n.deps.some((d) => affected.has(d)) && !affected.has(n.name)) {
                affected.add(n.name);
                added = true;
            }
        }
    }
    const queue = order.filter((x) => affected.has(x));
    return { queue, size: queue.length };
}

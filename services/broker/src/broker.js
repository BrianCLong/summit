"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.pickPool = pickPool;
function pickPool(taskCaps, pools) {
    return pools
        .filter((p) => taskCaps.every((c) => p.caps.includes(c)))
        .sort((a, b) => a.costPerMin - b.costPerMin || b.free - a.free)[0];
}

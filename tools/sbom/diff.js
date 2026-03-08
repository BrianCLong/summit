"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.diff = diff;
function diff(prev, cur) {
    const p = new Set(prev.packages.map((x) => x.purl));
    return cur.packages.filter((x) => !p.has(x.purl));
}

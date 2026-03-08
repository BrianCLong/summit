"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.stableStringify = stableStringify;
function stableStringify(obj) {
    const keys = (x) => Array.isArray(x) ? x.map(keys) :
        x && typeof x === "object"
            ? Object.fromEntries(Object.keys(x).sort().map(k => [k, keys(x[k])]))
            : x;
    return JSON.stringify(keys(obj), null, 2) + "\n";
}

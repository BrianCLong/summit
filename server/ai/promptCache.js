"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.key = key;
exports.getOrSet = getOrSet;
const H = new Map();
function key(t) {
    return t.replace(/\s+/g, ' ').trim().toLowerCase();
}
function getOrSet(k, v) {
    const kk = key(k);
    if (H.has(kk))
        return H.get(kk);
    H.set(kk, v);
    return v;
}

"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.track = track;
const seen = new Map();
function track(querySig) {
    const n = (seen.get(querySig) || 0) + 1;
    seen.set(querySig, n);
    if (n > 50)
        console.warn('N+1 suspected for', querySig);
}

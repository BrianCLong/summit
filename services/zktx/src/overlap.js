"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.overlaps = overlaps;
function overlaps(aHashes, bHashes) {
    const set = new Set(aHashes);
    return bHashes.some((x) => set.has(x));
}

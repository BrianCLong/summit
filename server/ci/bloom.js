"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.shouldRun = shouldRun;
function shouldRun(paths, bloom) {
    // hash each path → check bits; return false if all present (seen before & safe)
    const hit = paths.every((p) => has(bloom, hash(p)));
    return !hit; // if all seen, skip heavy analyzer
}

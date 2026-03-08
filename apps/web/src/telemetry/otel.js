"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.withSpan = withSpan;
function withSpan(name, fn) {
    const t0 = performance.now();
    const r = fn();
    console.debug(`[span] ${name} ${(performance.now() - t0).toFixed(1)}ms`);
    return r;
}

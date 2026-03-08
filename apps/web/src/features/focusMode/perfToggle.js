"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.measureToggle = measureToggle;
async function measureToggle(fn) {
    const t0 = performance.now();
    fn();
    return performance.now() - t0;
}

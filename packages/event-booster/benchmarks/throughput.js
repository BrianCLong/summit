"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const index_js_1 = require("../src/index.js");
const booster = (0, index_js_1.createDefaultEventBooster)();
const baseline = (0, index_js_1.generateBurstEvents)({
    bursts: 5,
    burstSize: 20,
    intervalMs: 250,
});
const metrics = (0, index_js_1.runPatternBenchmark)(booster, 'amplify-signal', baseline, {
    iterations: 20,
    warmupIterations: 5,
});
console.table(metrics);

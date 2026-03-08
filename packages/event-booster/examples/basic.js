"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const index_js_1 = require("../src/index.js");
const booster = (0, index_js_1.createDefaultEventBooster)();
const baseline = (0, index_js_1.generateUniformEvents)(5, { signal: 3 });
const result = booster.boost(baseline, 'amplify-signal');
console.log(`Boosted ${result.outputCount} events`);
console.log(result.events.slice(0, 2));
const metrics = (0, index_js_1.runPatternBenchmark)(booster, 'amplify-signal', baseline, {
    iterations: 5,
});
console.table(metrics);

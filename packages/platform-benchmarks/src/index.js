"use strict";
/**
 * @intelgraph/platform-benchmarks
 *
 * Cross-language benchmark harness for Summit platform.
 * Implements Prompt 17: Cross-subsystem Performance Benchmark Suite
 *
 * Features:
 * - Deterministic benchmark execution with statistical analysis
 * - Multi-language support (TS, Python, Go via subprocess)
 * - CI integration with JSON/Markdown output
 * - Baseline comparison and regression detection
 */
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __exportStar = (this && this.__exportStar) || function(m, exports) {
    for (var p in m) if (p !== "default" && !Object.prototype.hasOwnProperty.call(exports, p)) __createBinding(exports, m, p);
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.createBenchmarkSuite = exports.BenchmarkHarness = void 0;
__exportStar(require("./types.js"), exports);
__exportStar(require("./harness.js"), exports);
__exportStar(require("./runners/index.js"), exports);
__exportStar(require("./reporters/index.js"), exports);
__exportStar(require("./comparators/index.js"), exports);
// Re-export for convenience
var harness_js_1 = require("./harness.js");
Object.defineProperty(exports, "BenchmarkHarness", { enumerable: true, get: function () { return harness_js_1.BenchmarkHarness; } });
var suite_js_1 = require("./suite.js");
Object.defineProperty(exports, "createBenchmarkSuite", { enumerable: true, get: function () { return suite_js_1.createBenchmarkSuite; } });

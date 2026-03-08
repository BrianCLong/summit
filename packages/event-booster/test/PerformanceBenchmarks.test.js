"use strict";
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
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
/** @jest-environment node */
const index_js_1 = __importStar(require("../src/index.js"));
const PerformanceBenchmarks_js_1 = require("../src/PerformanceBenchmarks.js");
const SyntheticGenerators_js_1 = require("../src/SyntheticGenerators.js");
const incrementalNow = () => {
    let value = 0;
    return () => {
        value += 2;
        return value;
    };
};
describe('PerformanceBenchmarks', () => {
    it('computes aggregate metrics for a pattern', () => {
        const booster = new index_js_1.default();
        booster.registerPattern((0, index_js_1.createAmplifyPattern)({ name: 'amp', intensities: [1.2] }));
        const events = (0, SyntheticGenerators_js_1.generateUniformEvents)(3, { signal: 2, random: () => 0.5 });
        const now = incrementalNow();
        const result = (0, PerformanceBenchmarks_js_1.runPatternBenchmark)(booster, 'amp', events, {
            iterations: 3,
            warmupIterations: 1,
            now,
        });
        expect(result.patternName).toBe('amp');
        expect(result.iterations).toBe(3);
        expect(result.averageMs).toBeGreaterThan(0);
        expect(result.throughputPerSecond).toBeGreaterThan(0);
        expect(result.p95Ms).toBeGreaterThanOrEqual(result.minMs);
    });
    it('handles single-iteration percentile calculation', () => {
        const booster = new index_js_1.default();
        booster.registerPattern((0, index_js_1.createAmplifyPattern)({ name: 'amp', intensities: [1.1] }));
        const events = (0, SyntheticGenerators_js_1.generateUniformEvents)(1, { signal: 2, random: () => 0.4 });
        const now = incrementalNow();
        const result = (0, PerformanceBenchmarks_js_1.runPatternBenchmark)(booster, 'amp', events, {
            iterations: 1,
            warmupIterations: 0,
            now,
        });
        expect(result.p95Ms).toBe(result.minMs);
    });
    it('benchmarks multiple patterns', () => {
        const booster = new index_js_1.default();
        booster.registerPattern((0, index_js_1.createAmplifyPattern)({ name: 'amp', intensities: [1.1] }));
        booster.registerPattern((0, index_js_1.createAmplifyPattern)({ name: 'amp2', intensities: [1.2] }));
        const events = (0, SyntheticGenerators_js_1.generateUniformEvents)(2, { signal: 3, random: () => 0.6 });
        const now = incrementalNow();
        const results = (0, PerformanceBenchmarks_js_1.benchmarkPatterns)(booster, events, ['amp', 'amp2'], {
            iterations: 2,
            warmupIterations: 0,
            now,
        });
        expect(results).toHaveLength(2);
        expect(results[0].patternName).toBe('amp');
        expect(results[1].patternName).toBe('amp2');
    });
    it('validates the iteration count', () => {
        const booster = new index_js_1.default();
        booster.registerPattern((0, index_js_1.createAmplifyPattern)({ name: 'amp', intensities: [1.05] }));
        const events = (0, SyntheticGenerators_js_1.generateUniformEvents)(1, { signal: 1, random: () => 0.5 });
        expect(() => (0, PerformanceBenchmarks_js_1.runPatternBenchmark)(booster, 'amp', events, {
            iterations: 0,
        })).toThrow('greater than zero');
    });
});

"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.createDefaultEventBooster = exports.benchmarkPatterns = exports.runPatternBenchmark = exports.generateAnomalyEvents = exports.generateSeasonalEvents = exports.generateBurstEvents = exports.generateUniformEvents = exports.defaultPatterns = exports.createNoisePattern = exports.createTemporalShiftPattern = exports.createAmplifyPattern = exports.EventBooster = exports.default = void 0;
var EventBooster_js_1 = require("./EventBooster.js");
Object.defineProperty(exports, "default", { enumerable: true, get: function () { return EventBooster_js_1.EventBooster; } });
Object.defineProperty(exports, "EventBooster", { enumerable: true, get: function () { return EventBooster_js_1.EventBooster; } });
var patterns_js_1 = require("./patterns.js");
Object.defineProperty(exports, "createAmplifyPattern", { enumerable: true, get: function () { return patterns_js_1.createAmplifyPattern; } });
Object.defineProperty(exports, "createTemporalShiftPattern", { enumerable: true, get: function () { return patterns_js_1.createTemporalShiftPattern; } });
Object.defineProperty(exports, "createNoisePattern", { enumerable: true, get: function () { return patterns_js_1.createNoisePattern; } });
Object.defineProperty(exports, "defaultPatterns", { enumerable: true, get: function () { return patterns_js_1.defaultPatterns; } });
var SyntheticGenerators_js_1 = require("./SyntheticGenerators.js");
Object.defineProperty(exports, "generateUniformEvents", { enumerable: true, get: function () { return SyntheticGenerators_js_1.generateUniformEvents; } });
Object.defineProperty(exports, "generateBurstEvents", { enumerable: true, get: function () { return SyntheticGenerators_js_1.generateBurstEvents; } });
Object.defineProperty(exports, "generateSeasonalEvents", { enumerable: true, get: function () { return SyntheticGenerators_js_1.generateSeasonalEvents; } });
Object.defineProperty(exports, "generateAnomalyEvents", { enumerable: true, get: function () { return SyntheticGenerators_js_1.generateAnomalyEvents; } });
var PerformanceBenchmarks_js_1 = require("./PerformanceBenchmarks.js");
Object.defineProperty(exports, "runPatternBenchmark", { enumerable: true, get: function () { return PerformanceBenchmarks_js_1.runPatternBenchmark; } });
Object.defineProperty(exports, "benchmarkPatterns", { enumerable: true, get: function () { return PerformanceBenchmarks_js_1.benchmarkPatterns; } });
const EventBooster_js_2 = __importDefault(require("./EventBooster.js"));
const patterns_js_2 = require("./patterns.js");
/**
 * Creates an {@link EventBooster} instance with the default pattern bundle pre-registered.
 */
const createDefaultEventBooster = (options = {}) => {
    const providedPatterns = options.initialPatterns ?? [];
    const merged = [...providedPatterns];
    for (const pattern of patterns_js_2.defaultPatterns) {
        if (!merged.some((existing) => existing.name === pattern.name)) {
            merged.push(pattern);
        }
    }
    return new EventBooster_js_2.default({ ...options, initialPatterns: merged });
};
exports.createDefaultEventBooster = createDefaultEventBooster;

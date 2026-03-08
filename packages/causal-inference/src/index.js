"use strict";
/**
 * Causal Inference Package
 * @module @intelgraph/causal-inference
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
exports.DifferenceInDifferences = exports.PropensityScoreMatcher = void 0;
// Types
__exportStar(require("./types/index.js"), exports);
// Methods
var propensity_score_matching_js_1 = require("./methods/propensity-score-matching.js");
Object.defineProperty(exports, "PropensityScoreMatcher", { enumerable: true, get: function () { return propensity_score_matching_js_1.PropensityScoreMatcher; } });
var difference_in_differences_js_1 = require("./methods/difference-in-differences.js");
Object.defineProperty(exports, "DifferenceInDifferences", { enumerable: true, get: function () { return difference_in_differences_js_1.DifferenceInDifferences; } });

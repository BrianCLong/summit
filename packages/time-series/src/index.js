"use strict";
/**
 * Time Series Package - Utilities and Analysis
 * @module @intelgraph/time-series
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
exports.StationarityTester = exports.STLDecomposer = void 0;
// Types
__exportStar(require("./types/index.js"), exports);
// Decomposition
var stl_js_1 = require("./decomposition/stl.js");
Object.defineProperty(exports, "STLDecomposer", { enumerable: true, get: function () { return stl_js_1.STLDecomposer; } });
// Validators
var stationarity_js_1 = require("./validators/stationarity.js");
Object.defineProperty(exports, "StationarityTester", { enumerable: true, get: function () { return stationarity_js_1.StationarityTester; } });

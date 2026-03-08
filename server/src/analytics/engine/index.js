"use strict";
/**
 * Predictive Execution Engine Module
 *
 * Exports the governed predictive analytics engine and related types.
 *
 * @module analytics/engine
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
exports.getPredictiveEngine = exports.PredictiveExecutionEngine = void 0;
var PredictiveExecutionEngine_js_1 = require("./PredictiveExecutionEngine.js");
Object.defineProperty(exports, "PredictiveExecutionEngine", { enumerable: true, get: function () { return PredictiveExecutionEngine_js_1.PredictiveExecutionEngine; } });
Object.defineProperty(exports, "getPredictiveEngine", { enumerable: true, get: function () { return PredictiveExecutionEngine_js_1.getPredictiveEngine; } });
__exportStar(require("./types.js"), exports);

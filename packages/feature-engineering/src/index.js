"use strict";
/**
 * Feature Engineering Package
 * @module @intelgraph/feature-engineering
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
exports.MinMaxScaler = exports.StandardScaler = exports.AutomatedFeatureGenerator = void 0;
// Types
__exportStar(require("./types/index.js"), exports);
// Generators
var automated_features_js_1 = require("./generators/automated-features.js");
Object.defineProperty(exports, "AutomatedFeatureGenerator", { enumerable: true, get: function () { return automated_features_js_1.AutomatedFeatureGenerator; } });
// Transformers
var scalers_js_1 = require("./transformers/scalers.js");
Object.defineProperty(exports, "StandardScaler", { enumerable: true, get: function () { return scalers_js_1.StandardScaler; } });
Object.defineProperty(exports, "MinMaxScaler", { enumerable: true, get: function () { return scalers_js_1.MinMaxScaler; } });

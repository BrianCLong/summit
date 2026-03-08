"use strict";
/**
 * Summit MDM Core Package
 * Enterprise Master Data Management infrastructure
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
exports.QualityEngine = exports.MatchingEngine = exports.MDMEngine = void 0;
// Export types
__exportStar(require("./types/index.js"), exports);
// Export engines
var mdm_engine_js_1 = require("./engine/mdm-engine.js");
Object.defineProperty(exports, "MDMEngine", { enumerable: true, get: function () { return mdm_engine_js_1.MDMEngine; } });
var matching_engine_js_1 = require("./matching/matching-engine.js");
Object.defineProperty(exports, "MatchingEngine", { enumerable: true, get: function () { return matching_engine_js_1.MatchingEngine; } });
var quality_engine_js_1 = require("./quality/quality-engine.js");
Object.defineProperty(exports, "QualityEngine", { enumerable: true, get: function () { return quality_engine_js_1.QualityEngine; } });

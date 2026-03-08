"use strict";
/**
 * Trust & Confidence Scoring Module
 *
 * Exports the trust scoring service and related types.
 *
 * @module agents/trust
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
exports.getTrustScoringService = exports.TrustScoringService = void 0;
var TrustScoringService_js_1 = require("./TrustScoringService.js");
Object.defineProperty(exports, "TrustScoringService", { enumerable: true, get: function () { return TrustScoringService_js_1.TrustScoringService; } });
Object.defineProperty(exports, "getTrustScoringService", { enumerable: true, get: function () { return TrustScoringService_js_1.getTrustScoringService; } });
__exportStar(require("./types.js"), exports);

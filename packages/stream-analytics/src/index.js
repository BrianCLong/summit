"use strict";
/**
 * Stream Analytics Package
 *
 * Real-time analytics capabilities:
 * - Real-time metrics (count, sum, avg, min, max, percentiles)
 * - Moving averages and rolling statistics
 * - Top-K and heavy hitters
 * - Distinct count estimation (HyperLogLog)
 * - Session and funnel analytics
 * - Time-series aggregations
 * - Multi-dimensional analytics
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
__exportStar(require("./metrics"), exports);
__exportStar(require("./analytics"), exports);
__exportStar(require("./ml-inference"), exports);
__exportStar(require("./enrichment"), exports);
__exportStar(require("./session-analytics"), exports);
__exportStar(require("./funnel"), exports);

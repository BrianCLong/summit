"use strict";
/**
 * Stream Processing Framework
 *
 * Provides advanced stream processing capabilities:
 * - Windowing (tumbling, sliding, session)
 * - Watermarking for late data handling
 * - Stateful stream operations
 * - Stream joins and aggregations
 * - Backpressure handling
 * - Fault tolerance with checkpointing
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
__exportStar(require("./stream.js"), exports);
__exportStar(require("./window.js"), exports);
__exportStar(require("./watermark.js"), exports);
__exportStar(require("./state.js"), exports);
__exportStar(require("./aggregations.js"), exports);
__exportStar(require("./joins.js"), exports);
__exportStar(require("./operators.js"), exports);
__exportStar(require("./checkpoint.js"), exports);
__exportStar(require("./types.js"), exports);
__exportStar(require("./intelgraphPipeline.js"), exports);

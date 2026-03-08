"use strict";
/**
 * Entity Resolution Service
 *
 * @module @intelgraph/er-service
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
exports.start = exports.createApp = void 0;
// Types
__exportStar(require("./types/index.js"), exports);
// Core
__exportStar(require("./core/index.js"), exports);
// Matchers
__exportStar(require("./matchers/index.js"), exports);
// Database
__exportStar(require("./db/index.js"), exports);
// Events
__exportStar(require("./events/index.js"), exports);
// Batch Processing
__exportStar(require("./batch/index.js"), exports);
// Explainability
__exportStar(require("./explainability/index.js"), exports);
// Server
var server_js_1 = require("./server.js");
Object.defineProperty(exports, "createApp", { enumerable: true, get: function () { return server_js_1.createApp; } });
Object.defineProperty(exports, "start", { enumerable: true, get: function () { return server_js_1.start; } });

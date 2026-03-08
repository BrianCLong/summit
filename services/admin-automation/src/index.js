"use strict";
/**
 * Admin Automation Service
 *
 * AI-driven digital bureaucracy reduction targeting 70% workload reduction:
 * - Reuse submitted information across forms
 * - Auto-complete forms from citizen profiles
 * - Proactively resolve service needs before they arise
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
exports.startServer = exports.createServer = void 0;
__exportStar(require("./types.js"), exports);
__exportStar(require("./citizen-profile-aggregator.js"), exports);
__exportStar(require("./form-autocomplete.js"), exports);
__exportStar(require("./proactive-service-resolver.js"), exports);
__exportStar(require("./workflow-automation.js"), exports);
__exportStar(require("./metrics.js"), exports);
__exportStar(require("./cache.js"), exports);
__exportStar(require("./errors.js"), exports);
__exportStar(require("./repository.js"), exports);
__exportStar(require("./config.js"), exports);
var server_js_1 = require("./server.js");
Object.defineProperty(exports, "createServer", { enumerable: true, get: function () { return server_js_1.createServer; } });
Object.defineProperty(exports, "startServer", { enumerable: true, get: function () { return server_js_1.startServer; } });
